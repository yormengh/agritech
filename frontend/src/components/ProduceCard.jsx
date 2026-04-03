import React from 'react'
import { KenteBlock } from './Adinkra'
import './ProduceCard.css'

const PRODUCE_META = {
  Tomatoes:  { icon: '🍅', adinkra: '⊕' },
  Maize:     { icon: '🌽', adinkra: '✦' },
  Cassava:   { icon: '🥕', adinkra: '◈' },
  Rice:      { icon: '🌾', adinkra: '⊗' },
  Yam:       { icon: '🍠', adinkra: '❋' },
  Plantain:  { icon: '🍌', adinkra: '✺' },
  Pepper:    { icon: '🌶️', adinkra: '⊛' },
  Cocoa:     { icon: '🫘', adinkra: '✧' },
  Groundnut: { icon: '🥜', adinkra: '⊡' },
  Onion:     { icon: '🧅', adinkra: '◉' },
}

function buildWhatsAppLink(phone, produceName, qty, location) {
  const cleaned = phone.replace(/\D/g, '')
  const ghPhone = cleaned.startsWith('0') ? '233' + cleaned.slice(1) : cleaned
  const msg = encodeURIComponent(
    `Hello! I found your listing on AgroConnect Ghana.\n\nI'm interested in your *${produceName}* (${qty}) listed in *${location}*.\n\nAre you still available? Please let me know the best price. 🇬🇭`
  )
  return `https://wa.me/${ghPhone}?text=${msg}`
}

export default function ProduceCard({ item }) {
  const meta = PRODUCE_META[item.produce_type] || { icon: '🌿', adinkra: '◆' }
  const initials = (item.farmer_name || 'FA').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const waLink = buildWhatsAppLink(item.phone_number, item.produce_type, item.quantity, item.location)

  return (
    <div className="produce-card">
      <KenteBlock height={6}/>
      <div className="produce-card__adinkra-watermark">{meta.adinkra}</div>

      <div className="produce-card__header">
        <div className="produce-icon">{meta.icon}</div>
        <div className="produce-card__badge">{item.quantity}</div>
      </div>

      <div className="produce-card__body">
        <h3 className="produce-name">{item.produce_type}</h3>
        <div className="produce-meta">
          <span className="meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {item.location}
          </span>
          {item.price && (
            <span className="meta-item meta-price">
              ₵{item.price}
            </span>
          )}
        </div>
      </div>

      <div className="produce-card__footer">
        <div className="farmer-info">
          <div className="farmer-avatar">{initials}</div>
          <span className="farmer-name">{item.farmer_name || 'Farmer'}</span>
        </div>
        <div className="card-actions">
          <a href={`tel:${item.phone_number}`} className="card-action-btn card-action-call" title="Call Farmer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.61 19.79 19.79 0 01.02 1 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16z"/>
            </svg>
          </a>
          <a href={waLink} target="_blank" rel="noreferrer" className="card-action-btn card-action-wa" title="WhatsApp Farmer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.856L0 24l6.29-1.51A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.015-1.374l-.36-.214-3.732.896.944-3.639-.235-.374A9.787 9.787 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z"/>
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
