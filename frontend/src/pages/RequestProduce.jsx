import React, { useState } from 'react'
import { FormInput, FormSelect } from '../components/FormInput'
import { Sankofa, KenteBlock } from '../components/Adinkra'
import './FormPages.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const LOCATIONS = ['Accra','Kumasi','Tamale','Cape Coast','Tema','Takoradi',
  'Sunyani','Koforidua','Ho','Wa','Bolgatanga','Techiman','Obuasi','Tarkwa']

const INITIAL = { produce_needed:'', quantity:'', location:'', phone_number:'', notes:'' }

export default function RequestProduce() {
  const [form, setForm] = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3800)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      showToast('✅ Request submitted! Matching farmers will be notified via SMS.')
      setForm(INITIAL)
    } catch {
      showToast('⚠️ Could not reach server. Check your connection.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="form-page adinkra-bg">
      <div className="page-container">
        <div className="form-layout">

          {/* ── Left panel ── */}
          <div className="form-panel__left">
            <span className="section-eyebrow">🇬🇭 For Buyers</span>
            <h1 className="panel-title">Request<br/>Produce</h1>
            <p className="panel-desc">
              Can't find what you need? Submit a request and we'll notify
              matching farmers in your preferred region via SMS.
            </p>

            <div className="form-benefits">
              {[
                { icon: '🔔', color: '#c9a227', text: 'Farmers get SMS instantly' },
                { icon: '📍', color: '#1c3a1e', text: 'Filtered by your region' },
                { icon: '🤝', color: '#c1440e', text: 'Direct connections, no fees' },
                { icon: '🌿', color: '#0d0d0d', text: 'Fresh, farm-sourced always' },
              ].map((b, i) => (
                <div key={i} className="benefit-item">
                  <span className="benefit-icon" style={{ background: b.color }}>{b.icon}</span>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>

            {/* Recent requests ticker */}
            <div className="request-ticker">
              <div className="ticker-label">
                <KenteBlock height={4}/>
                <span style={{ padding:'8px 0 4px', display:'block', fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--amber)' }}>Recent Requests</span>
              </div>
              {[
                { produce:'Maize', qty:'100 bags', loc:'Accra' },
                { produce:'Tomatoes', qty:'50 crates', loc:'Kumasi' },
                { produce:'Rice', qty:'200 bags', loc:'Tamale' },
              ].map((r, i) => (
                <div key={i} className="ticker-item">
                  <span className="ticker-dot"/>
                  <strong>{r.produce}</strong> · {r.qty} · 📍 {r.loc}
                </div>
              ))}
            </div>

            {/* Real Sankofa SVG */}
            <div className="panel-adinkra">
              <p className="adinkra-caption">Sankofa — "Go back and get it"</p>
              <Sankofa size={110} opacity={0.55} color="#c9a227"/>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="form-panel__right">
            <div className="form-card">
              <KenteBlock height={10}/>
              <div className="form-card__body">
                <form onSubmit={handleSubmit} className="produce-form">
                  <FormInput label="Produce Needed" id="produce_needed"
                    placeholder="e.g. Maize, Tomatoes, Rice..."
                    value={form.produce_needed} onChange={set('produce_needed')} required/>
                  <FormInput label="Quantity" id="quantity"
                    placeholder="e.g. 50 bags, 20 crates"
                    value={form.quantity} onChange={set('quantity')} required/>
                  <FormSelect label="Preferred Region" id="location" options={LOCATIONS}
                    value={form.location} onChange={set('location')} required/>
                  <FormInput label="Phone Number" id="phone_number" type="tel"
                    placeholder="e.g. 0244 000 000"
                    value={form.phone_number} onChange={set('phone_number')} required/>
                  <div className="form-group">
                    <label className="form-label" htmlFor="notes">
                      Additional Notes <span style={{ color:'#9a8870', fontSize:'0.72rem', textTransform:'none', letterSpacing:0 }}>(optional)</span>
                    </label>
                    <textarea id="notes" className="form-input"
                      placeholder="Specific variety, grade, delivery preferences..."
                      value={form.notes} onChange={set('notes')}
                      rows={3} style={{ resize:'vertical', minHeight:'80px' }}/>
                  </div>
                  <button type="submit" className="btn-amber" disabled={loading}>
                    {loading ? <><div className="spinner"/>Submitting...</> : <>📢 Submit Request</>}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast--error' : ''}`}>{toast.msg}</div>
      )}
    </main>
  )
}
