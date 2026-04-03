import React, { useState, useEffect, useCallback } from 'react'
import ProduceCard from '../components/ProduceCard'
import { BlackStar } from '../components/Adinkra'
import './FindProduce.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const PAGE_SIZE = 6

const LOCATIONS = ['All Locations','Accra','Kumasi','Tamale','Cape Coast','Tema',
  'Takoradi','Sunyani','Koforidua','Ho','Wa','Bolgatanga','Techiman']

const MOCK_DATA = [
  { id:1,  farmer_name:'Kofi Asante',    phone_number:'0244123456', produce_type:'Tomatoes',  quantity:'20 Crates',  location:'Kumasi',     price:'180' },
  { id:2,  farmer_name:'Ama Darko',      phone_number:'0277654321', produce_type:'Maize',     quantity:'50 Bags',    location:'Tamale',     price:'250' },
  { id:3,  farmer_name:'Kweku Boateng',  phone_number:'0200998877', produce_type:'Cassava',   quantity:'30 Bags',    location:'Accra',      price:'' },
  { id:4,  farmer_name:'Abena Mensah',   phone_number:'0541223344', produce_type:'Rice',      quantity:'100 Bags',   location:'Sunyani',    price:'320' },
  { id:5,  farmer_name:'Yaw Osei',       phone_number:'0501122334', produce_type:'Yam',       quantity:'200 Tubers', location:'Kumasi',     price:'400' },
  { id:6,  farmer_name:'Akosua Frimpong',phone_number:'0264556677', produce_type:'Plantain',  quantity:'10 Bunches', location:'Cape Coast', price:'150' },
  { id:7,  farmer_name:'Kwame Adjei',    phone_number:'0244889900', produce_type:'Onion',     quantity:'15 Crates',  location:'Tamale',     price:'90'  },
  { id:8,  farmer_name:'Efua Quansah',   phone_number:'0277112233', produce_type:'Pepper',    quantity:'8 Bags',     location:'Accra',      price:'120' },
  { id:9,  farmer_name:'Nana Boateng',   phone_number:'0209887766', produce_type:'Cocoa',     quantity:'5 Bags',     location:'Kumasi',     price:'850' },
  { id:10, farmer_name:'Afia Sarpong',   phone_number:'0266223311', produce_type:'Groundnut', quantity:'20 Bags',    location:'Bolgatanga', price:'180' },
  { id:11, farmer_name:'Kwabena Asare',  phone_number:'0540112233', produce_type:'Maize',     quantity:'80 Bags',    location:'Sunyani',    price:'220' },
  { id:12, farmer_name:'Esi Mensah',     phone_number:'0271334455', produce_type:'Tomatoes',  quantity:'35 Crates',  location:'Accra',      price:'200' },
]

export default function FindProduce() {
  const [allProduce, setAllProduce] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('All Locations')
  const [isDemo, setIsDemo] = useState(false)
  const [page, setPage] = useState(1)

  const fetchProduce = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/produce`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAllProduce(data)
      setIsDemo(false)
    } catch {
      setAllProduce(MOCK_DATA)
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProduce() }, [fetchProduce])

  const filtered = allProduce.filter(item => {
    const mq = !search ||
      item.produce_type?.toLowerCase().includes(search.toLowerCase()) ||
      item.location?.toLowerCase().includes(search.toLowerCase()) ||
      item.farmer_name?.toLowerCase().includes(search.toLowerCase())
    const ml = locationFilter === 'All Locations' || item.location === locationFilter
    return mq && ml
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearch = (v) => { setSearch(v); setPage(1) }
  const handleLoc = (v) => { setLocationFilter(v); setPage(1) }

  return (
    <main className="find-page adinkra-bg">
      <div className="page-container">
        <div className="find-header">
          <span className="section-eyebrow">
            <BlackStar size={12} color="#d4830a"/> For Buyers
          </span>
          <h1 className="section-title">Find Produce</h1>
          <p className="find-subtitle">Browse fresh produce from farmers across Ghana's regions</p>
        </div>

        {/* Toolbar */}
        <div className="find-toolbar">
          <div className="search-wrap">
            <svg className="search-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="search-input" type="text" placeholder="Search produce, region, or farmer..."
              value={search} onChange={e => handleSearch(e.target.value)}/>
            {search && <button className="search-clear" onClick={() => handleSearch('')}>✕</button>}
          </div>
          <select className="form-select filter-select" value={locationFilter} onChange={e => handleLoc(e.target.value)}>
            {LOCATIONS.map(l => <option key={l}>{l}</option>)}
          </select>
          <button className="refresh-btn" onClick={fetchProduce} title="Refresh listings">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>

        {isDemo && (
          <div className="demo-notice">
            <BlackStar size={12} color="#d4830a"/> Showing demo data — connect your backend at <code>{API_BASE}</code>
          </div>
        )}

        {!loading && (
          <div className="results-meta">
            <strong>{filtered.length}</strong> {filtered.length === 1 ? 'listing' : 'listings'}
            {search && <> matching "<em>{search}</em>"</>}
            {locationFilter !== 'All Locations' && <> in <em>{locationFilter}</em></>}
          </div>
        )}

        {loading ? (
          <div className="loading-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton-card"/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🌾</div>
            <h3>No produce found</h3>
            <p>Try different search terms or select another region.</p>
          </div>
        ) : (
          <>
            <div className="produce-grid">
              {paginated.map((item, i) => (
                <div key={item.id || i} className="animate-in" style={{ animationDelay: `${i * 0.06}s` }}>
                  <ProduceCard item={item}/>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>← Prev</button>
                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`page-num ${p === page ? 'page-num--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  ))}
                </div>
                <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
