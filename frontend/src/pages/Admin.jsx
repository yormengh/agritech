import React, { useState, useEffect, useCallback } from 'react'
import { BlackStar, KenteBlock } from '../components/Adinkra'
import './Admin.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const LOCATIONS = ['Accra','Kumasi','Tamale','Cape Coast','Tema','Takoradi',
  'Sunyani','Koforidua','Ho','Wa','Bolgatanga','Techiman','Obuasi','Tarkwa']
const PRODUCE_TYPES = ['Maize','Tomatoes','Cassava','Rice','Yam','Plantain','Pepper',
  'Cocoa','Groundnut','Onion','Sweet Potato','Garden Eggs','Mango','Pineapple','Okra','Soya Beans']

function getToken() { return localStorage.getItem('admin_token') }
function saveToken(t) { localStorage.setItem('admin_token', t) }
function clearToken() { localStorage.removeItem('admin_token') }

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid password')
      saveToken(data.token)
      onLogin(data.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">
        <KenteBlock height={8}/>
        <div className="admin-login-body">
          <div className="admin-login-icon"><BlackStar size={32} color="#c9a227"/></div>
          <h1 className="admin-login-title">Admin Access</h1>
          <p className="admin-login-sub">AgroConnect Dashboard</p>
          <form onSubmit={handleSubmit}>
            <input type="password" className="form-input" placeholder="Enter admin password"
              value={password} onChange={e => setPassword(e.target.value)} required autoFocus/>
            {error && <p className="admin-login-error">{error}</p>}
            <button type="submit" className="btn-amber" style={{ width:'100%', marginTop:'1rem' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

function EditProduceModal({ item, token, onSave, onClose }) {
  const [form, setForm] = useState({ ...item })
  const [loading, setLoading] = useState(false)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSave = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/produce/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const updated = await res.json()
      onSave(updated)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <KenteBlock height={6}/>
        <div className="modal-body">
          <h2 className="modal-title">Edit Produce Listing</h2>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={form.farmer_name} onChange={set('farmer_name')} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone_number} onChange={set('phone_number')} required/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <select className="form-select" value={form.location} onChange={set('location')} required>
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Produce Type</label>
              <select className="form-select" value={form.produce_type} onChange={set('produce_type')} required>
                {PRODUCE_TYPES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input className="form-input" value={form.quantity} onChange={set('quantity')} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Price (GHS)</label>
                <input className="form-input" value={form.price || ''} onChange={set('price')} placeholder="optional"/>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="admin-btn admin-btn--remove" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-amber" style={{ width:'auto', padding:'0.5rem 1.5rem' }} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function EditRequestModal({ item, token, onSave, onClose }) {
  const [form, setForm] = useState({ ...item })
  const [loading, setLoading] = useState(false)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSave = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/request/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const updated = await res.json()
      onSave(updated)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <KenteBlock height={6}/>
        <div className="modal-body">
          <h2 className="modal-title">Edit Buyer Request</h2>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Produce Needed</label>
              <input className="form-input" value={form.produce_needed} onChange={set('produce_needed')} required/>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input className="form-input" value={form.quantity} onChange={set('quantity')} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone_number} onChange={set('phone_number')} required/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <select className="form-select" value={form.location} onChange={set('location')} required>
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" value={form.notes || ''} onChange={set('notes')} rows={3} style={{ resize:'vertical' }}/>
            </div>
            <div className="modal-actions">
              <button type="button" className="admin-btn admin-btn--remove" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-amber" style={{ width:'auto', padding:'0.5rem 1.5rem' }} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function Admin() {
  const [token, setToken] = useState(getToken)
  const [produce, setProduce] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('produce')
  const [toast, setToast] = useState(null)
  const [editProduce, setEditProduce] = useState(null)
  const [editRequest, setEditRequest] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const authHeaders = { 'Authorization': `Bearer ${token}` }

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [pRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/produce`),
        fetch(`${API_BASE}/request`, { headers: authHeaders }),
      ])
      if (rRes.status === 401) { clearToken(); setToken(null); return }
      const [pData, rData] = await Promise.all([pRes.json(), rRes.json()])
      setProduce(Array.isArray(pData) ? pData : [])
      setRequests(Array.isArray(rData) ? rData : [])
    } catch {
      showToast('Could not load data from server.', 'error')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const handleLogout = async () => {
    await fetch(`${API_BASE}/admin/logout`, { method: 'POST', headers: authHeaders })
    clearToken(); setToken(null)
  }

  const handleRemove = async (id) => {
    if (!confirm('Remove this listing?')) return
    try {
      const res = await fetch(`${API_BASE}/produce/${id}`, { method: 'DELETE', headers: authHeaders })
      if (res.status === 401) { clearToken(); setToken(null); return }
      setProduce(p => p.filter(item => item.id !== id))
      showToast('Listing removed.')
    } catch { showToast('Failed to remove listing.', 'error') }
  }

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/produce/${id}/approve`, { method: 'PATCH', headers: authHeaders })
      if (res.status === 401) { clearToken(); setToken(null); return }
      setProduce(p => p.map(item => item.id === id ? { ...item, status: 'active' } : item))
      showToast('Listing approved.')
    } catch { showToast('Failed to approve listing.', 'error') }
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })

  if (!token) return <LoginScreen onLogin={setToken}/>

  return (
    <main className="admin-page">
      <div className="page-container">
        <div className="admin-header">
          <span className="section-eyebrow"><BlackStar size={12} color="#d4830a"/> Dashboard</span>
          <h1 className="section-title">Admin Panel</h1>
          <p className="admin-subtitle">Manage produce listings and buyer requests</p>
          <button className="admin-logout-btn" onClick={handleLogout}>Logout</button>
        </div>

        <div className="admin-stats">
          <div className="admin-stat">
            <span className="admin-stat__value">{produce.length}</span>
            <span className="admin-stat__label">Total Listings</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat__value">{produce.filter(p => p.status === 'active').length}</span>
            <span className="admin-stat__label">Active</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat__value">{requests.length}</span>
            <span className="admin-stat__label">Buyer Requests</span>
          </div>
        </div>

        <div className="admin-tabs">
          <button className={`admin-tab ${tab === 'produce' ? 'admin-tab--active' : ''}`} onClick={() => setTab('produce')}>
            Produce Listings ({produce.length})
          </button>
          <button className={`admin-tab ${tab === 'requests' ? 'admin-tab--active' : ''}`} onClick={() => setTab('requests')}>
            Buyer Requests ({requests.length})
          </button>
        </div>

        <KenteBlock height={4}/>

        {loading ? (
          <div className="admin-loading">Loading data...</div>
        ) : tab === 'produce' ? (
          <div className="admin-table-wrap">
            {produce.length === 0 ? <div className="admin-empty">No produce listings yet.</div> : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Farmer</th><th>Produce</th><th>Quantity</th>
                    <th>Location</th><th>Price</th><th>Status</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {produce.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="admin-farmer">
                          <strong>{item.farmer_name}</strong>
                          <span>{item.phone_number}</span>
                        </div>
                      </td>
                      <td>{item.produce_type}</td>
                      <td>{item.quantity}</td>
                      <td>{item.location}</td>
                      <td>{item.price ? `₵${item.price}` : '—'}</td>
                      <td>
                        <span className={`status-badge status-badge--${item.status || 'active'}`}>
                          {item.status || 'active'}
                        </span>
                      </td>
                      <td>{formatDate(item.created_at)}</td>
                      <td>
                        <div className="admin-actions">
                          <button className="admin-btn admin-btn--edit" onClick={() => setEditProduce(item)}>Edit</button>
                          {item.status !== 'active' && (
                            <button className="admin-btn admin-btn--approve" onClick={() => handleApprove(item.id)}>Approve</button>
                          )}
                          <button className="admin-btn admin-btn--remove" onClick={() => handleRemove(item.id)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="admin-table-wrap">
            {requests.length === 0 ? <div className="admin-empty">No buyer requests yet.</div> : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Produce Needed</th><th>Quantity</th><th>Location</th>
                    <th>Phone</th><th>Notes</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id}>
                      <td><strong>{req.produce_needed}</strong></td>
                      <td>{req.quantity}</td>
                      <td>{req.location}</td>
                      <td>{req.phone_number}</td>
                      <td>{req.notes || '—'}</td>
                      <td>{formatDate(req.created_at)}</td>
                      <td>
                        <button className="admin-btn admin-btn--edit" onClick={() => setEditRequest(req)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="admin-refresh">
          <button className="btn-secondary" onClick={fetchData}>↻ Refresh Data</button>
        </div>
      </div>

      {editProduce && (
        <EditProduceModal
          item={editProduce}
          token={token}
          onSave={updated => {
            setProduce(p => p.map(i => i.id === updated.id ? updated : i))
            setEditProduce(null)
            showToast('Listing updated.')
          }}
          onClose={() => setEditProduce(null)}
        />
      )}

      {editRequest && (
        <EditRequestModal
          item={editRequest}
          token={token}
          onSave={updated => {
            setRequests(r => r.map(i => i.id === updated.id ? updated : i))
            setEditRequest(null)
            showToast('Request updated.')
          }}
          onClose={() => setEditRequest(null)}
        />
      )}

      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast--error' : ''}`}>{toast.msg}</div>
      )}
    </main>
  )
}
