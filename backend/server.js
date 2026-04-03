require('dotenv').config()
const express = require('express')
const cors = require('cors')
const crypto = require('crypto')
const { Pool } = require('pg')

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({ 
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3000'
  ]
}))
app.use(express.json())

// ── Simple token store (in-memory) ──────────────────
const validTokens = new Set()

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '')
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// ── In-memory metrics counters ───────────────────────
const metrics = {
  http_requests_total: {},
  http_errors_total: 0,
  produce_listed_total: 0,
  requests_submitted_total: 0,
  sms_sent_total: 0,
  sms_failed_total: 0,
}

function trackRequest(method, path, status) {
  const key = `${method}_${path}_${status}`
  metrics.http_requests_total[key] = (metrics.http_requests_total[key] || 0) + 1
  if (status >= 500) metrics.http_errors_total++
}

// Middleware to track all requests
app.use((req, res, next) => {
  res.on('finish', () => trackRequest(req.method, req.route?.path || req.path, res.statusCode))
  next()
})

// ── PostgreSQL Pool ──────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
async function sendSMS(to, message) {
  const clientId     = process.env.HUBTEL_CLIENT_ID
  const clientSecret = process.env.HUBTEL_CLIENT_SECRET
  const senderName   = process.env.HUBTEL_SENDER || 'AgroConnect'

  if (!clientId || !clientSecret) {
    console.log('[SMS DEMO] Would send to', to, ':', message)
    return { success: false, reason: 'Hubtel credentials not configured' }
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const res = await fetch('https://smsc.hubtel.com/v1/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        From: senderName,
        To: to.replace(/^0/, '233'), // normalize Ghana number
        Content: message,
      }),
    })
    const data = await res.json()
    if (res.ok) metrics.sms_sent_total++
    else metrics.sms_failed_total++
    return { success: res.ok, data }
  } catch (err) {
    console.error('[SMS Error]', err.message)
    return { success: false, error: err.message }
  }
}

// Notify matching farmers about a buyer request
async function notifyMatchingFarmers(request) {
  try {
    const { rows: farmers } = await pool.query(
      `SELECT DISTINCT phone_number, farmer_name, produce_type
       FROM produce
       WHERE LOWER(produce_type) ILIKE $1
         AND (location ILIKE $2 OR $2 = 'Any')
         AND status != 'removed'`,
      [`%${request.produce_needed.toLowerCase()}%`, request.location]
    )

    if (!farmers.length) {
      console.log('[SMS] No matching farmers found for', request.produce_needed)
      return
    }

    for (const farmer of farmers) {
      const msg =
        `Hello ${farmer.farmer_name}, a buyer is looking for ${request.produce_needed} ` +
        `(${request.quantity}) in ${request.location}. ` +
        `Contact them: ${request.phone_number}. - AgroConnect Ghana`
      await sendSMS(farmer.phone_number, msg)
    }

    console.log(`[SMS] Notified ${farmers.length} farmer(s) about request for ${request.produce_needed}`)
  } catch (err) {
    console.error('[SMS Match Error]', err.message)
  }
}

// ── DB Init ─────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produce (
      id           SERIAL PRIMARY KEY,
      farmer_name  VARCHAR(120) NOT NULL,
      phone_number VARCHAR(20)  NOT NULL,
      location     VARCHAR(80)  NOT NULL,
      produce_type VARCHAR(80)  NOT NULL,
      quantity     VARCHAR(60)  NOT NULL,
      price        VARCHAR(40),
      status       VARCHAR(20)  DEFAULT 'active',
      created_at   TIMESTAMPTZ  DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS requests (
      id             SERIAL PRIMARY KEY,
      produce_needed VARCHAR(120) NOT NULL,
      quantity       VARCHAR(60)  NOT NULL,
      location       VARCHAR(80)  NOT NULL,
      phone_number   VARCHAR(20)  NOT NULL,
      notes          TEXT,
      created_at     TIMESTAMPTZ  DEFAULT NOW()
    );

    -- Add status column if upgrading existing DB
    DO $$ BEGIN
      ALTER TABLE produce ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    EXCEPTION WHEN duplicate_column THEN NULL; END $$;
  `)
  console.log('✅ Database tables ready')
}

// ── Routes ───────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AgroConnect API', timestamp: new Date() })
})

// GET /metrics — Prometheus text format
app.get('/metrics', (req, res) => {
  const lines = []
  lines.push('# HELP http_requests_total Total HTTP requests by method/path/status')
  lines.push('# TYPE http_requests_total counter')
  for (const [key, val] of Object.entries(metrics.http_requests_total)) {
    const [method, ...rest] = key.split('_')
    const status = rest.pop()
    const path = rest.join('_')
    lines.push(`http_requests_total{method="${method}",path="${path}",status="${status}"} ${val}`)
  }
  lines.push('# HELP http_errors_total Total 5xx errors')
  lines.push('# TYPE http_errors_total counter')
  lines.push(`http_errors_total ${metrics.http_errors_total}`)
  lines.push('# HELP produce_listed_total Total produce listings submitted')
  lines.push('# TYPE produce_listed_total counter')
  lines.push(`produce_listed_total ${metrics.produce_listed_total}`)
  lines.push('# HELP requests_submitted_total Total buyer requests submitted')
  lines.push('# TYPE requests_submitted_total counter')
  lines.push(`requests_submitted_total ${metrics.requests_submitted_total}`)
  lines.push('# HELP sms_sent_total Total SMS notifications sent successfully')
  lines.push('# TYPE sms_sent_total counter')
  lines.push(`sms_sent_total ${metrics.sms_sent_total}`)
  lines.push('# HELP sms_failed_total Total SMS notification failures')
  lines.push('# TYPE sms_failed_total counter')
  lines.push(`sms_failed_total ${metrics.sms_failed_total}`)
  res.set('Content-Type', 'text/plain; version=0.0.4')
  res.send(lines.join('\n') + '\n')
})

// POST /admin/login
app.post('/admin/login', (req, res) => {
  const { password } = req.body
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' })
  }
  const token = generateToken()
  validTokens.add(token)
  res.json({ token })
})

// POST /admin/logout
app.post('/admin/logout', (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '')
  if (token) validTokens.delete(token)
  res.json({ success: true })
})

// POST /produce — farmer lists produce
app.post('/produce', async (req, res) => {
  const { farmer_name, phone_number, location, produce_type, quantity, price } = req.body
  if (!farmer_name || !phone_number || !location || !produce_type || !quantity) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO produce (farmer_name, phone_number, location, produce_type, quantity, price, status)
       VALUES ($1,$2,$3,$4,$5,$6,'active') RETURNING *`,
      [farmer_name.trim(), phone_number.trim(), location.trim(), produce_type.trim(), quantity.trim(), price?.trim() || null]
    )
    metrics.produce_listed_total++
    res.status(201).json(rows[0])
  } catch (err) {
    console.error('POST /produce:', err.message)
    res.status(500).json({ error: 'Database error' })
  }
})

// GET /produce — list produce with optional filters
app.get('/produce', async (req, res) => {
  const { location, produce_type, search } = req.query
  let query = "SELECT * FROM produce WHERE status != 'removed'"
  const params = []

  if (location) { params.push(`%${location}%`); query += ` AND location ILIKE $${params.length}` }
  if (produce_type) { params.push(`%${produce_type}%`); query += ` AND produce_type ILIKE $${params.length}` }
  if (search) {
    params.push(`%${search}%`)
    query += ` AND (produce_type ILIKE $${params.length} OR location ILIKE $${params.length} OR farmer_name ILIKE $${params.length})`
  }
  query += ' ORDER BY created_at DESC'

  try {
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (err) {
    console.error('GET /produce:', err.message)
    res.status(500).json({ error: 'Database error' })
  }
})

// GET /request — list all buyer requests (admin)
app.get('/request', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM requests ORDER BY created_at DESC')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

// POST /request — buyer submits a request + triggers SMS to matching farmers
app.post('/request', async (req, res) => {
  const { produce_needed, quantity, location, phone_number, notes } = req.body
  if (!produce_needed || !quantity || !location || !phone_number) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO requests (produce_needed, quantity, location, phone_number, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [produce_needed.trim(), quantity.trim(), location.trim(), phone_number.trim(), notes?.trim() || null]
    )
    const saved = rows[0]
    metrics.requests_submitted_total++
    notifyMatchingFarmers(saved)
    res.status(201).json(saved)
  } catch (err) {
    console.error('POST /request:', err.message)
    res.status(500).json({ error: 'Database error' })
  }
})

// PATCH /produce/:id — admin edits a listing
app.patch('/produce/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { farmer_name, phone_number, location, produce_type, quantity, price } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE produce SET farmer_name=$1, phone_number=$2, location=$3, produce_type=$4, quantity=$5, price=$6
       WHERE id=$7 RETURNING *`,
      [farmer_name, phone_number, location, produce_type, quantity, price || null, id]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

// PATCH /request/:id — admin edits a buyer request
app.patch('/request/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { produce_needed, quantity, location, phone_number, notes } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE requests SET produce_needed=$1, quantity=$2, location=$3, phone_number=$4, notes=$5
       WHERE id=$6 RETURNING *`,
      [produce_needed, quantity, location, phone_number, notes || null, id]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})
app.delete('/produce/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  try {
    await pool.query("UPDATE produce SET status = 'removed' WHERE id = $1", [id])
    res.json({ success: true, message: 'Listing removed.' })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

// PATCH /produce/:id/approve — admin approves a pending listing
app.patch('/produce/:id/approve', authMiddleware, async (req, res) => {
  const { id } = req.params
  try {
    await pool.query("UPDATE produce SET status = 'active' WHERE id = $1", [id])
    res.json({ success: true, message: 'Listing approved.' })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

// ── Start ────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🌱 AgroConnect API → http://localhost:${PORT}`)
    console.log(`📱 SMS via Hubtel: ${process.env.HUBTEL_CLIENT_ID ? '✅ Configured' : '⚠️  Not configured (set HUBTEL_CLIENT_ID + HUBTEL_CLIENT_SECRET)'}`)
  })
}).catch(err => { console.error('DB init failed:', err.message); process.exit(1) })
