import React from 'react'

export function GyeNyame({ size = 80, color = '#c9a227', opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ opacity }}>
      <ellipse cx="50" cy="50" rx="30" ry="18" stroke={color} strokeWidth="4" fill="none"/>
      <ellipse cx="50" cy="50" rx="18" ry="30" stroke={color} strokeWidth="4" fill="none"/>
      <circle cx="50" cy="50" r="8" fill={color}/>
      <circle cx="50" cy="22" r="5" fill={color}/>
      <circle cx="50" cy="78" r="5" fill={color}/>
      <circle cx="22" cy="50" r="5" fill={color}/>
      <circle cx="78" cy="50" r="5" fill={color}/>
      <line x1="50" y1="10" x2="50" y2="20" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="50" y1="80" x2="50" y2="90" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="10" y1="50" x2="20" y2="50" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="80" y1="50" x2="90" y2="50" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

export function Sankofa({ size = 80, color = '#c9a227', opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ opacity }}>
      <path d="M50 80 C20 80 10 55 25 40 C35 28 50 32 50 32 C50 32 65 28 75 40 C90 55 80 80 50 80Z"
        stroke={color} strokeWidth="4" fill="none"/>
      <circle cx="50" cy="28" r="8" stroke={color} strokeWidth="3.5" fill="none"/>
      <path d="M42 28 C42 20 58 20 58 28" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <circle cx="38" cy="55" r="5" fill={color}/>
      <circle cx="62" cy="55" r="5" fill={color}/>
    </svg>
  )
}

export function Dwennimmen({ size = 80, color = '#c9a227', opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ opacity }}>
      <circle cx="50" cy="50" r="10" fill={color}/>
      <path d="M50 40 C50 25 30 15 20 25 C10 35 20 50 35 48" stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M60 50 C75 50 85 30 75 20 C65 10 50 20 52 35" stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M50 60 C50 75 70 85 80 75 C90 65 80 50 65 52" stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M40 50 C25 50 15 70 25 80 C35 90 50 80 48 65" stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

export function Funtumfunefu({ size = 80, color = '#c9a227', opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ opacity }}>
      <circle cx="50" cy="50" r="12" stroke={color} strokeWidth="3.5" fill="none"/>
      <circle cx="50" cy="50" r="5" fill={color}/>
      <path d="M38 38 C25 25 15 30 18 42 C21 54 35 52 42 45" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M62 38 C75 25 85 30 82 42 C79 54 65 52 58 45" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M38 62 C25 75 15 70 18 58 C21 46 35 48 42 55" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M62 62 C75 75 85 70 82 58 C79 46 65 48 58 55" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

export function BlackStar({ size = 24, color = '#c9a227', opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ opacity, display: 'inline-block', verticalAlign: 'middle' }}>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={color}
      />
    </svg>
  )
}

export function KenteBlock({ height = 12 }) {
  const colors = ['#c9a227','#1c3a1e','#c1440e','#0d0d0d','#c9a227','#1c3a1e','#c1440e']
  const w = 100 / colors.length
  return (
    <div style={{ width: '100%', height, display: 'flex', overflow: 'hidden', borderRadius: 2 }}>
      {colors.map((c, i) => (
        <div key={i} style={{ flex: 1, background: c }}/>
      ))}
    </div>
  )
}
