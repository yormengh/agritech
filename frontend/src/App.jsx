import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import ListProduce from './pages/ListProduce'
import FindProduce from './pages/FindProduce'
import RequestProduce from './pages/RequestProduce'
import About from './pages/About'
import Admin from './pages/Admin'
import './styles/globals.css'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/list" element={<ListProduce />} />
        <Route path="/find" element={<FindProduce />} />
        <Route path="/request" element={<RequestProduce />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}
