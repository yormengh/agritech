/**
 * AgroConnect Backend — API Tests
 * Run: npm test  (requires TEST_DATABASE_URL env var)
 */

const http = require('http')
const assert = require('assert')

const BASE = `http://localhost:${process.env.PORT || 4000}`

// ── Simple HTTP helper ────────────────────────────────────────────
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 4000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

// ── Test runner ───────────────────────────────────────────────────
let passed = 0; let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ ${name}`)
    console.error(`     ${err.message}`)
    failed++
  }
}

// ── Test suites ───────────────────────────────────────────────────
async function testHealth() {
  console.log('\n📋 Health Check')

  await test('GET /health returns 200', async () => {
    const { status, body } = await request('GET', '/health')
    assert.strictEqual(status, 200)
    assert.strictEqual(body.status, 'ok')
  })
}

async function testProduce() {
  console.log('\n🌽 Produce Endpoints')
  let createdId

  await test('POST /produce creates a listing', async () => {
    const { status, body } = await request('POST', '/produce', {
      farmer_name:  'Test Farmer Kofi',
      phone_number: '0244000001',
      location:     'Accra',
      produce_type: 'Tomatoes',
      quantity:     '10 Crates',
      price:        '150',
    })
    assert.strictEqual(status, 201)
    assert.ok(body.id, 'Response should have an id')
    assert.strictEqual(body.farmer_name, 'Test Farmer Kofi')
    assert.strictEqual(body.produce_type, 'Tomatoes')
    assert.strictEqual(body.status, 'active')
    createdId = body.id
  })

  await test('POST /produce rejects missing fields', async () => {
    const { status } = await request('POST', '/produce', {
      farmer_name: 'Incomplete',
    })
    assert.strictEqual(status, 400)
  })

  await test('GET /produce returns array', async () => {
    const { status, body } = await request('GET', '/produce')
    assert.strictEqual(status, 200)
    assert.ok(Array.isArray(body), 'Response should be an array')
  })

  await test('GET /produce filters by location', async () => {
    const { status, body } = await request('GET', '/produce?location=Accra')
    assert.strictEqual(status, 200)
    assert.ok(Array.isArray(body))
    body.forEach(item => {
      assert.ok(
        item.location.toLowerCase().includes('accra'),
        `Expected location to include "accra", got "${item.location}"`
      )
    })
  })

  await test('GET /produce filters by search term', async () => {
    const { status, body } = await request('GET', '/produce?search=Tomatoes')
    assert.strictEqual(status, 200)
    assert.ok(Array.isArray(body))
    body.forEach(item => {
      assert.ok(
        item.produce_type.toLowerCase().includes('tomatoes') ||
        item.farmer_name.toLowerCase().includes('tomatoes') ||
        item.location.toLowerCase().includes('tomatoes'),
        `Expected "Tomatoes" in result`
      )
    })
  })

  if (createdId) {
    await test('DELETE /produce/:id soft-deletes listing', async () => {
      const { status, body } = await request('DELETE', `/produce/${createdId}`)
      assert.strictEqual(status, 200)
      assert.strictEqual(body.success, true)
    })

    await test('Deleted listing excluded from GET /produce', async () => {
      const { body } = await request('GET', '/produce')
      const found = body.find(p => p.id === createdId)
      assert.ok(!found, 'Deleted listing should not appear in results')
    })

    await test('PATCH /produce/:id/approve re-activates listing', async () => {
      const { status, body } = await request('PATCH', `/produce/${createdId}/approve`)
      assert.strictEqual(status, 200)
      assert.strictEqual(body.success, true)
    })
  }
}

async function testRequests() {
  console.log('\n📢 Request Endpoints')

  await test('POST /request creates a buyer request', async () => {
    const { status, body } = await request('POST', '/request', {
      produce_needed: 'Maize',
      quantity:       '50 bags',
      location:       'Kumasi',
      phone_number:   '0277000001',
      notes:          'White maize preferred',
    })
    assert.strictEqual(status, 201)
    assert.ok(body.id)
    assert.strictEqual(body.produce_needed, 'Maize')
  })

  await test('POST /request rejects missing fields', async () => {
    const { status } = await request('POST', '/request', {
      produce_needed: 'Rice',
    })
    assert.strictEqual(status, 400)
  })

  await test('GET /request returns array', async () => {
    const { status, body } = await request('GET', '/request')
    assert.strictEqual(status, 200)
    assert.ok(Array.isArray(body))
  })
}

// ── Run all ───────────────────────────────────────────────────────
async function run() {
  console.log('\n🇬🇭 AgroConnect Backend — Test Suite')
  console.log('═════════════════════════════════════')

  // Give server a moment if just started
  await new Promise(r => setTimeout(r, 500))

  await testHealth()
  await testProduce()
  await testRequests()

  console.log('\n═════════════════════════════════════')
  console.log(`  Passed: ${passed}  Failed: ${failed}`)

  if (failed > 0) {
    console.error('\n❌ Test suite FAILED\n')
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed!\n')
  }
}

// Start server then run tests, OR just run tests against running server
if (require.main === module) {
  if (process.env.DATABASE_URL || process.env.TEST_DATABASE_URL) {
    if (process.env.TEST_DATABASE_URL) {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    }
    // Import and start server, then test
    const server = require('./server')
    // server.js uses app.listen internally; give it 1s to boot
    setTimeout(() => run().catch(console.error), 1000)
  } else {
    console.warn('⚠️  No DATABASE_URL set — running against existing server at', BASE)
    run().catch(console.error)
  }
}

module.exports = { run }
