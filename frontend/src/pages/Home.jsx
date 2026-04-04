import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GyeNyame, Sankofa, Dwennimmen, Funtumfunefu, BlackStar, KenteBlock } from '../components/Adinkra'
import './Home.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const PRODUCE_ICONS = { Tomatoes:'🍅', Maize:'🌽', Rice:'🌾', Cassava:'🥕', Yam:'🍠', Plantain:'🍌', Pepper:'🌶️', Cocoa:'🫘', Groundnut:'🥜', Onion:'🧅' }

const STATS = [
  { adinkra: 'dwennimmen', value: '120+', label: 'Farmers', sub: 'Strength & Humility' },
  { adinkra: 'funtumfunefu', value: '50+', label: 'Buyers', sub: 'Unity in Trade' },
  { adinkra: 'sankofa', value: '200+', label: 'Transactions', sub: 'Growing Every Day' },
]

const HOW_IT_WORKS = [
  { step: '01', icon: '📋', title: 'Farmers List Produce', desc: 'Register your harvest — type, quantity, location, and price — in minutes. Free forever.', color: 'var(--forest)' },
  { step: '02', icon: '🔍', title: 'Buyers Find Produce', desc: 'Search and filter fresh produce from farmers across every region of Ghana.', color: 'var(--amber)' },
  { step: '03', icon: '📞', title: 'We Connect You', desc: 'Contact directly via WhatsApp or call. No middlemen, fair prices, faster deals.', color: 'var(--terracotta)' },
]

const REGIONS = [
  { name: 'Ashanti Region', capital: 'Kumasi', crops: ['Cocoa', 'Plantain', 'Yam'], color: '#7a3c00', bg: '#fdf0e0' },
  { name: 'Northern Region', capital: 'Tamale', crops: ['Maize', 'Groundnut', 'Soya Beans'], color: '#4a1a00', bg: '#fff3e8' },
  { name: 'Volta Region', capital: 'Ho', crops: ['Rice', 'Cassava', 'Sweet Potato'], color: '#003a1a', bg: '#e8f5ee' },
  { name: 'Brong-Ahafo', capital: 'Sunyani', crops: ['Cashew', 'Yam', 'Cassava'], color: '#1a3a6a', bg: '#e8f0fb' },
  { name: 'Greater Accra', capital: 'Accra', crops: ['Tomatoes', 'Onion', 'Pepper'], color: '#6a1a00', bg: '#fde8e0' },
  { name: 'Upper East', capital: 'Bolgatanga', crops: ['Millet', 'Sorghum', 'Groundnut'], color: '#3a0060', bg: '#f0e8fc' },
]

export default function Home() {
  const [todayListings, setTodayListings] = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/produce`)
      .then(r => r.json())
      .then(data => {
        // Show the 3 most recent listings
        setTodayListings(data.slice(0, 3))
      })
      .catch(() => {})
  }, [])
  return (
    <main className="home">

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero__bg">
          {/* Large Gye Nyame — "Except God" */}
          <div className="hero__gye-nyame">
            <GyeNyame size={420} opacity={0.06} color="#e8c94a"/>
          </div>
          {/* Ghana Black Star motif */}
          <div className="hero__black-star">
            <BlackStar size={280} color="#c9a227" opacity={0.05}/>
          </div>
          {/* Floating produce */}
          <div className="hero__floats">
            {['🌽','🍅','🌾','🍌','🥕','🌶️','🍠','🥜'].map((e, i) => (
              <span key={i} className="float-item" style={{ '--i': i }}>{e}</span>
            ))}
          </div>
        </div>

        <div className="hero__content page-container">
          <div className="hero__text animate-in">
            <span className="section-eyebrow">
              <BlackStar size={12} color="#d4830a"/>
              Akuafoɔ Ayekoo · Made for Ghana
            </span>
            <h1 className="hero__title">
              Connecting<br/>
              <em className="shimmer-text">Farmers</em> to<br/>
              Buyers Across Ghana
            </h1>
            <p className="hero__desc">
              From the farms of Brong-Ahafo to the markets of Accra —<br/>
              AgroConnect bridges the gap between those who grow<br/>and those who need.
            </p>
            <p className="hero__proverb">"Onipa na ohia onipa" — A person needs a person.</p>
            <div className="hero__actions">
              <Link to="/list" className="btn-primary">
                <span>🌱 List Your Produce</span>
              </Link>
              <Link to="/find" className="btn-secondary hero-btn-light">
                Find Produce
              </Link>
            </div>
          </div>

          {/* Hero card — live listings preview */}
          <div className="hero__card animate-in delay-2">
            <KenteBlock height={10}/>
            <div className="hero-card__inner">
              <div className="hero-card__label">
                <BlackStar size={12} color="#d4830a"/>
                Today's Listings
              </div>
              <div className="hero-card__items">
                {todayListings.length > 0 ? todayListings.map((item, i) => (
                  <div key={i} className="hero-card__item">
                    <span className="hc-icon">{PRODUCE_ICONS[item.produce_type] || '🌿'}</span>
                    <div className="hc-info">
                      <strong>{item.produce_type}</strong>
                      <span>{item.quantity} · 📍 {item.location}</span>
                    </div>
                    {item.price && <span className="hc-price">₵{item.price}</span>}
                  </div>
                )) : [
                  { icon: '🍅', name: 'Tomatoes', qty: '20 Crates', loc: 'Kumasi', price: '₵180' },
                  { icon: '🌽', name: 'Maize', qty: '50 Bags', loc: 'Tamale', price: '₵250' },
                  { icon: '🌾', name: 'Rice', qty: '30 Bags', loc: 'Accra', price: '₵320' },
                ].map((item, i) => (
                  <div key={i} className="hero-card__item">
                    <span className="hc-icon">{item.icon}</span>
                    <div className="hc-info">
                      <strong>{item.name}</strong>
                      <span>{item.qty} · 📍 {item.loc}</span>
                    </div>
                    <span className="hc-price">{item.price}</span>
                  </div>
                ))}
              </div>
              <Link to="/find" className="hero-card__cta">Browse All Listings →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── KENTE DIVIDER ── */}
      <KenteBlock height={16}/>

      {/* ── STATS with real Adinkra ── */}
      <section className="stats-section">
        <div className="page-container">
          <div className="stats-grid">
            {STATS.map((s, i) => (
              <div key={i} className="stat-item">
                <div className="stat-adinkra">
                  {s.adinkra === 'dwennimmen' && <Dwennimmen size={48} opacity={0.5} color="#e8c94a"/>}
                  {s.adinkra === 'funtumfunefu' && <Funtumfunefu size={48} opacity={0.5} color="#e8c94a"/>}
                  {s.adinkra === 'sankofa' && <Sankofa size={48} opacity={0.5} color="#e8c94a"/>}
                </div>
                <span className="stat-value">{s.value}</span>
                <span className="stat-label">{s.label}</span>
                <span className="stat-sub">{s.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REGIONS OF GHANA ── */}
      <section className="regions-section adinkra-bg">
        <div className="page-container">
          <div className="regions-header">
            <span className="section-eyebrow">
              <BlackStar size={12} color="#d4830a"/>
              Agricultural Heartlands
            </span>
            <h2 className="section-title">Regions of Ghana</h2>
            <p className="regions-desc">
              Ghana's diverse regions each contribute uniquely to the nation's agricultural abundance.
              AgroConnect serves farmers and buyers across all regions.
            </p>
          </div>
          <div className="regions-grid">
            {REGIONS.map((r, i) => (
              <div key={i} className="region-card" style={{ '--rc': r.color, '--rb': r.bg }}>
                <KenteBlock height={6}/>
                <div className="region-card__body">
                  <div className="region-header">
                    <div>
                      <h3 className="region-name">{r.name}</h3>
                      <p className="region-capital">📍 {r.capital}</p>
                    </div>
                    <div className="region-adinkra">
                      <BlackStar size={20} color={r.color} opacity={0.25}/>
                    </div>
                  </div>
                  <div className="region-crops">
                    {r.crops.map(c => (
                      <span key={c} className="crop-tag">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="regions-cta">
            <Link to="/find" className="btn-primary"><span>Find Produce by Region</span></Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-section" style={{ background: 'var(--earth-deep)' }}>
        <div className="page-container">
          <div className="how-header">
            <span className="section-eyebrow" style={{ color: 'var(--amber)' }}>Simple Process</span>
            <h2 className="section-title" style={{ color: 'white' }}>How It Works</h2>
          </div>
          {/* Gye Nyame watermark */}
          <div className="how-gye-nyame">
            <GyeNyame size={320} opacity={0.04} color="#e8c94a"/>
          </div>
          <div className="how-grid">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="how-card">
                <div className="how-card__adinkra">
                  {i === 0 && <Dwennimmen size={40} opacity={0.18} color="#c9a227"/>}
                  {i === 1 && <Funtumfunefu size={40} opacity={0.18} color="#c9a227"/>}
                  {i === 2 && <Sankofa size={40} opacity={0.18} color="#c9a227"/>}
                </div>
                <div className="how-card__step" style={{ '--color': step.color }}>{step.step}</div>
                <div className="how-card__icon">{step.icon}</div>
                <h3 className="how-card__title">{step.title}</h3>
                <p className="how-card__desc">{step.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && <div className="how-arrow">→</div>}
              </div>
            ))}
          </div>
          <div className="how-cta">
            <Link to="/list" className="btn-gold"><span>Get Started Today</span></Link>
          </div>
        </div>
      </section>

      {/* ── CULTURAL BANNER ── */}
      <section className="proverb-banner">
        <KenteBlock height={12}/>
        <div className="proverb-inner page-container">
          <div className="proverb-symbol">
            <Sankofa size={60} opacity={0.7} color="#c9a227"/>
          </div>
          <div className="proverb-text">
            <blockquote>"Yɛn ara yɛn asase ni"</blockquote>
            <p>This is our own land — Together we build Ghana's food future.</p>
          </div>
          <div className="proverb-star">
            <BlackStar size={48} color="#c9a227" opacity={0.6}/>
          </div>
        </div>
        <KenteBlock height={12}/>
      </section>

    </main>
  )
}
