import React from 'react'
import { Link } from 'react-router-dom'
import { GyeNyame, Sankofa, Dwennimmen, BlackStar, KenteBlock } from '../components/Adinkra'
import './About.css'

const TEAM = [
  { name: 'Moses Amartey', role: 'Founder & CEO', region: 'Tema', emoji: '👨🏿‍💼' },
  { name: 'Ama Boateng', role: 'Head of Farmer Relations', region: 'Tamale', emoji: '👩🏿‍🌾' },
  { name: 'Yormen', role: 'Lead Engineer', region: 'Tema', emoji: '👨🏿‍💻' },
]

const VALUES = [
  { icon: <GyeNyame size={36} color="#c9a227" opacity={0.9}/>, title: 'Trust', desc: 'Every connection on AgroConnect is built on transparency and honesty between farmers and buyers.' },
  { icon: <Sankofa size={36} color="#c9a227" opacity={0.9}/>, title: 'Heritage', desc: 'We honour Ghana\'s agricultural roots while building tools for the future of food trade.' },
  { icon: <Dwennimmen size={36} color="#c9a227" opacity={0.9}/>, title: 'Strength', desc: 'Empowering smallholder farmers with the tools and reach of large agribusinesses.' },
]

export default function About() {
  return (
    <main className="about-page">

      {/* Hero */}
      <section className="about-hero">
        <div className="about-hero__bg">
          <GyeNyame size={380} opacity={0.05} color="#e8c94a"/>
        </div>
        <div className="page-container about-hero__content">
          <span className="section-eyebrow">
            <BlackStar size={12} color="#d4830a"/> Our Story
          </span>
          <h1 className="about-title">Built for Ghana's<br/><em className="shimmer-text">Farmers & Buyers</em></h1>
          <p className="about-subtitle">
            AgroConnect was born from a simple observation — farmers across Ghana were losing income
            to middlemen while buyers struggled to find fresh, local produce at fair prices.
            We built the bridge.
          </p>
        </div>
        <KenteBlock height={14}/>
      </section>

      {/* Mission */}
      <section className="about-mission adinkra-bg">
        <div className="page-container about-mission__grid">
          <div className="mission-text">
            <span className="section-eyebrow">Our Mission</span>
            <h2 className="section-title">Cutting Out the Middleman</h2>
            <p>
              Ghana's agricultural sector employs over 40% of the workforce, yet farmers often
              receive less than 30% of the final market price. AgroConnect changes that by
              connecting farmers directly to buyers — no brokers, no hidden fees, just fair trade.
            </p>
            <p style={{ marginTop: '1rem' }}>
              From the cocoa farms of Brong-Ahafo to the tomato fields of Kumasi, we serve
              every region of Ghana with a platform that works on any phone.
            </p>
            <Link to="/list" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
              <span>🌱 Join as a Farmer</span>
            </Link>
          </div>
          <div className="mission-adinkra">
            <Sankofa size={180} color="#c9a227" opacity={0.15}/>
            <p className="adinkra-caption" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              Sankofa — "Learn from the past to build the future"
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="about-values">
        <KenteBlock height={10}/>
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span className="section-eyebrow"><BlackStar size={12} color="#d4830a"/> What We Stand For</span>
            <h2 className="section-title">Our Values</h2>
          </div>
          <div className="values-grid">
            {VALUES.map((v, i) => (
              <div key={i} className="value-card">
                <div className="value-icon">{v.icon}</div>
                <h3 className="value-title">{v.title}</h3>
                <p className="value-desc">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <KenteBlock height={10}/>
      </section>

      {/* Team */}
      <section className="about-team adinkra-bg">
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span className="section-eyebrow"><BlackStar size={12} color="#d4830a"/> The People</span>
            <h2 className="section-title">Meet the Team</h2>
          </div>
          <div className="team-grid">
            {TEAM.map((m, i) => (
              <div key={i} className="team-card">
                <KenteBlock height={6}/>
                <div className="team-card__body">
                  <div className="team-emoji">{m.emoji}</div>
                  <h3 className="team-name">{m.name}</h3>
                  <p className="team-role">{m.role}</p>
                  <span className="team-region">📍 {m.region}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta">
        <KenteBlock height={12}/>
        <div className="page-container about-cta__inner">
          <h2>"Onipa na ohia onipa"</h2>
          <p>A person needs a person — together we grow Ghana's food future.</p>
          <div className="about-cta__btns">
            <Link to="/find" className="btn-primary"><span>Find Produce</span></Link>
            <Link to="/request" className="btn-secondary">Request Produce</Link>
          </div>
        </div>
        <KenteBlock height={12}/>
      </section>

    </main>
  )
}
