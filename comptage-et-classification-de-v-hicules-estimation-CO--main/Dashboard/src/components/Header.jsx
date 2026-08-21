import React from 'react'

export default function Header({ view = 'dashboard', onNavigate = () => {} }) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="logo"><img src="/src/assets/app-icon.svg" alt="logo" className="logo-img"/></div>
        <div>
          <div className="title">GreenPath</div>
          
        </div>
      </div>
      <nav className="nav-right">
        <button className={`btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => onNavigate('dashboard')}>
          Tableau de Bord
        </button>
        <button className={`btn ghost ${view === 'video' ? 'active' : ''}`} onClick={() => onNavigate('video')}>
          Analyse Vidéo
        </button>
        <button className={`btn ghost ${view === 'prediction' ? 'active' : ''}`} onClick={() => onNavigate('prediction')}>
          Prédiction
        </button>
      </nav>
    </header>
  )
}