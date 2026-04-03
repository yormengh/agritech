import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BlackStar } from './Adinkra'
import './Navbar.css'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location])

  const isActive = (path) => location.pathname === path

  return (
    <>
      {bannerVisible && (
        <div className="welcome-banner">
          <span className="banner-star"><BlackStar size={13} color="#c9a227"/></span>
          <span className="banner-text">
            <strong>Akuafoɔ Ayekoo!</strong> 🇬🇭 Welcome — Connecting Ghana's Farmers &amp; Buyers
          </span>
          <button className="banner-close" onClick={() => setBannerVisible(false)}>✕</button>
        </div>
      )}

      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__inner">
          <Link to="/" className="navbar__logo">
            <div className="logo-star-ring">
              <BlackStar size={20} color="#c9a227"/>
            </div>
            <div className="logo-text">
              <span className="logo-main">AgroConnect</span>
              <span className="logo-sub">Powered by the land 🇬🇭</span>
            </div>
          </Link>

          <div className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
            <Link to="/" className={`nav-link ${isActive('/') ? 'nav-link--active' : ''}`}>Home</Link>
            <Link to="/list" className={`nav-link ${isActive('/list') ? 'nav-link--active' : ''}`}>List Produce</Link>
            <Link to="/find" className={`nav-link ${isActive('/find') ? 'nav-link--active' : ''}`}>Find Produce</Link>
            <Link to="/about" className={`nav-link ${isActive('/about') ? 'nav-link--active' : ''}`}>About</Link>
            <Link to="/admin" className={`nav-link nav-link--admin ${isActive('/admin') ? 'nav-link--active' : ''}`}>Admin</Link>
            <Link to="/request" className="nav-cta"><span>Request Produce</span></Link>
          </div>

          <button className={`hamburger ${menuOpen ? 'hamburger--open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span/><span/><span/>
          </button>
        </div>
        <div className="kente-stripe-thick"/>
      </nav>
      {menuOpen && <div className="nav-overlay" onClick={() => setMenuOpen(false)}/>}
    </>
  )
}
