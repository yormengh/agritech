import React, { useState } from 'react'
import { FormInput, FormSelect } from '../components/FormInput'
import { GyeNyame, KenteBlock } from '../components/Adinkra'
import './FormPages.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const LOCATIONS = ['Accra','Kumasi','Tamale','Cape Coast','Tema','Takoradi',
  'Sunyani','Koforidua','Ho','Wa','Bolgatanga','Techiman','Obuasi','Tarkwa']

const PRODUCE_TYPES = ['Maize','Tomatoes','Cassava','Rice','Yam','Plantain','Pepper',
  'Cocoa','Groundnut','Onion','Sweet Potato','Garden Eggs','Mango','Pineapple','Okra','Soya Beans']

const emptyRow = () => ({ produce_type: '', quantity: '', price: '' })
const INITIAL_FARMER = { farmer_name: '', phone_number: '', location: '' }

export default function ListProduce() {
  const [farmer, setFarmer] = useState(INITIAL_FARMER)
  const [rows, setRows] = useState([emptyRow()])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const setFarmerField = field => e => setFarmer(f => ({ ...f, [field]: e.target.value }))

  const setRow = (index, field) => e => {
    setRows(r => r.map((row, i) => i === index ? { ...row, [field]: e.target.value } : row))
  }

  const addRow = () => setRows(r => [...r, emptyRow()])
  const removeRow = (index) => setRows(r => r.filter((_, i) => i !== index))

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3800)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const results = await Promise.all(
        rows.map(row =>
          fetch(`${API_BASE}/produce`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...farmer, ...row }),
          })
        )
      )
      const allOk = results.every(r => r.ok)
      if (!allOk) throw new Error()
      const count = rows.length
      showToast(`✅ ${count} produce item${count > 1 ? 's' : ''} listed! Buyers across Ghana can now find you.`)
      setFarmer(INITIAL_FARMER)
      setRows([emptyRow()])
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
            <span className="section-eyebrow">🇬🇭 For Farmers</span>
            <h1 className="panel-title">List Your<br/>Produce</h1>
            <p className="panel-desc">
              Reach buyers across Ghana. Fill in your details and your harvest
              will be visible to hundreds of verified buyers instantly — free forever.
            </p>
            <div className="form-benefits">
              {[
                { icon: '⚡', color: '#c9a227', text: 'Listed in under 2 minutes' },
                { icon: '🔒', color: '#1c3a1e', text: 'Your privacy protected' },
                { icon: '🌍', color: '#c1440e', text: 'Reach buyers nationwide' },
                { icon: '💬', color: '#0d0d0d', text: 'Buyers contact via WhatsApp' },
              ].map((b, i) => (
                <div key={i} className="benefit-item">
                  <span className="benefit-icon" style={{ background: b.color }}>{b.icon}</span>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
            <div className="panel-adinkra">
              <p className="adinkra-caption">Gye Nyame — "Except God"</p>
              <GyeNyame size={110} opacity={0.55} color="#c9a227"/>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="form-panel__right">
            <div className="form-card">
              <KenteBlock height={10}/>
              <div className="form-card__body">
                <form onSubmit={handleSubmit} className="produce-form">

                  {/* Farmer details — filled once */}
                  <div className="form-section-label">Your Details</div>
                  <div className="form-grid">
                    <FormInput label="Full Name" id="farmer_name" placeholder="e.g. Kofi Mensah"
                      value={farmer.farmer_name} onChange={setFarmerField('farmer_name')} required/>
                    <FormInput label="Phone Number" id="phone_number" type="tel" placeholder="e.g. 0244 000 000"
                      value={farmer.phone_number} onChange={setFarmerField('phone_number')} required/>
                  </div>
                  <FormSelect label="Location" id="location" options={LOCATIONS}
                    value={farmer.location} onChange={setFarmerField('location')} required/>

                  {/* Produce rows */}
                  <div className="form-section-label" style={{ marginTop: '1.25rem' }}>
                    Produce Items
                  </div>

                  {rows.map((row, i) => (
                    <div key={i} className="produce-row">
                      <div className="produce-row__header">
                        <span className="produce-row__num">Item {i + 1}</span>
                        {rows.length > 1 && (
                          <button type="button" className="remove-row-btn" onClick={() => removeRow(i)}>✕ Remove</button>
                        )}
                      </div>
                      <FormSelect label="Produce Type" id={`produce_type_${i}`} options={PRODUCE_TYPES}
                        value={row.produce_type} onChange={setRow(i, 'produce_type')} required/>
                      <div className="form-grid">
                        <FormInput label="Quantity" id={`quantity_${i}`} placeholder="e.g. 10 bags"
                          value={row.quantity} onChange={setRow(i, 'quantity')} required/>
                        <FormInput label="Price (GHS) — optional" id={`price_${i}`} placeholder="e.g. 200"
                          value={row.price} onChange={setRow(i, 'price')}/>
                      </div>
                    </div>
                  ))}

                  <button type="button" className="add-row-btn" onClick={addRow}>
                    + Add Another Produce
                  </button>

                  <button type="submit" className="btn-amber" disabled={loading}>
                    {loading ? <><div className="spinner"/>Submitting...</> : <>🌱 List {rows.length > 1 ? `${rows.length} Items` : 'My Produce'}</>}
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
