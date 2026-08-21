import React, { useState } from 'react'

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const Icons = {
  car: (c = '#06b6d4', s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 11l2-5h10l2 5"/>
      <rect x="2" y="11" width="20" height="7" rx="2"/>
      <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
    </svg>
  ),
  sedan: (c = '#06b6d4', s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10l3-4h6l3 4"/>
      <rect x="2" y="10" width="20" height="7" rx="2"/>
      <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      <path d="M2 13h20"/>
    </svg>
  ),
  suv: (c = '#0891b2', s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9l2-4h12l2 4"/>
      <rect x="1" y="9" width="22" height="8" rx="2"/>
      <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>
  ),
  hatchback: (c = '#67e8f9', s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11l1-3h8l1 3"/>
      <path d="M5 8l2-3h10l2 3"/>
      <rect x="2" y="11" width="20" height="6" rx="2"/>
      <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>
  ),
  coupe: (c = '#0891b2', s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l2-3h8l2 3"/>
      <rect x="3" y="9" width="18" height="8" rx="2"/>
      <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>
  ),
  convertible: (c = '#06b6d4', s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 10l2-3h10l2 3"/>
      <path d="M3 13h18"/>
      <rect x="2" y="10" width="20" height="5" rx="2"/>
      <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>
  ),
  pickup: (c = '#155e75', s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11l2-4h6l2 4"/>
      <rect x="1" y="11" width="22" height="6" rx="2"/>
      <rect x="14" y="8" width="8" height="3" rx="1"/>
      <circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/>
    </svg>
  ),
  van: (c = '#64748b', s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l2-3h14l2 3"/>
      <rect x="2" y="9" width="20" height="8" rx="2"/>
      <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      <path d="M3 13h18"/>
    </svg>
  ),
  truck: (c = '#fb923c', s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="7" width="15" height="11" rx="1"/>
      <path d="M16 11h4l2 4v3h-6V11z"/>
      <circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>
    </svg>
  ),
  bus: (c = '#7c3aed', s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="15" rx="2"/>
      <path d="M3 9h18M9 3v6m6-6v6"/>
      <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
      <path d="M7 18H5v-3m14 3h2v-3"/>
    </svg>
  ),
  motorcycle: (c = '#10b981', s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="16" r="3"/><circle cx="19" cy="16" r="3"/>
      <path d="M5 16l4-7h5l3 4-3 3"/><path d="M14 9l2-3h2"/>
    </svg>
  ),
}

// ─── Config ───────────────────────────────────────────────────────────────────

const VEHICLE_CONFIG = {
  Voiture: { key: 'car',        color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'   },
  Van:     { key: 'van',        color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  Camion:  { key: 'truck',      color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  Bus:     { key: 'bus',        color: '#7c3aed', bg: 'rgba(124,58,237,0.12)'  },
  Moto:    { key: 'motorcycle', color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
}

const CAR_SUBTYPES = [
  { key: 'convertible', label: 'Convertible', color: '#06b6d4', co2Factor: 0.13 },
  { key: 'coupe',       label: 'Coupé',       color: '#0891b2', co2Factor: 0.14 },
  { key: 'hatchback',   label: 'Hatchback',   color: '#67e8f9', co2Factor: 0.12 },
  { key: 'pickup',      label: 'Pickup',      color: '#155e75', co2Factor: 0.24 },
  { key: 'sedan',       label: 'Sedan',       color: '#94a3b8', co2Factor: 0.15 },
  { key: 'suv',         label: 'SUV',         color: '#b20808', co2Factor: 0.21 },
]

const CO2_DISPLAY = {
  Voiture:0.12,
  Van:     0.23,
  Camion:  0.65,
  Bus:     0.80,
  Moto:    0.08,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VehicleIconBar({ vehicles = [], carBreakdown = {} }) {
  const [showSubtypes, setShowSubtypes] = useState(false)

  const safeCarBreakdown = (carBreakdown && typeof carBreakdown === 'object')
    ? carBreakdown : {}

  const voiture = vehicles.find(v => v.type === 'Voiture')

  return (
    <>
      {/* ── inject scrollbar styles once ── */}
      <style>{`
        .car-subtype-scroll {
          overflow-y: auto;
          overflow-x: hidden;
          max-height: 220px;
          padding-right: 4px;
          scrollbar-width: thin;
          scrollbar-color: #06b6d4 transparent;
        }
        .car-subtype-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .car-subtype-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .car-subtype-scroll::-webkit-scrollbar-thumb {
          background: #06b6d4;
          border-radius: 4px;
        }
        .car-subtype-scroll::-webkit-scrollbar-thumb:hover {
          background: #22d3ee;
        }
      `}</style>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Top-level vehicle type cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8,
        }}>
          {vehicles.map(v => {
            const c         = VEHICLE_CONFIG[v.type] || VEHICLE_CONFIG.Voiture
            const isVoiture = v.type === 'Voiture'
            const isActive  = isVoiture && showSubtypes
            const co2       = parseFloat((v.count * (CO2_DISPLAY[v.type] || 0.17)).toFixed(2))

            return (
              <div
                key={v.type}
                onClick={() => isVoiture && setShowSubtypes(s => !s)}
                style={{
                  background:    isActive ? c.bg : `${c.color}10`,
                  border:        `1px solid ${c.color}${isActive ? '60' : '25'}`,
                  borderRadius:  12,
                  padding:       '12px 6px',
                  textAlign:     'center',
                  cursor:        isVoiture ? 'pointer' : 'default',
                  transition:    'all 0.2s',
                  display:       'flex',
                  flexDirection: 'column',
                  alignItems:    'center',
                  gap:           5,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: c.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {(Icons[c.key] || Icons.car)(c.color, 22)}
                </div>

                <div style={{ fontSize: 22, fontWeight: 800, color: isVoiture ? c.color : 'var(--text)', lineHeight: 1 }}>
                  {v.count}
                </div>

                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {v.type}
                </div>

                <div style={{ fontSize: 10, color: '#fb923c', fontWeight: 500 }}>
                  {co2.toFixed(2)} kg
                </div>

                {isVoiture && (
                  <div style={{
                    fontSize: 9, color: c.color,
                    transition: 'transform 0.2s',
                    transform: showSubtypes ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>▼</div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Car sub-types breakdown — scrollable ── */}
        {showSubtypes && voiture && (
          <div style={{
            borderTop:  '1px solid rgba(6,182,212,0.15)',
            paddingTop: 8,
          }}>

            {/* header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 11, color: '#06b6d4', fontWeight: 600 }}>
                Détail Voitures
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                ↕ défiler
              </span>
            </div>

            {/*
              ✅ ONE scroll container — max-height limits it, overflow-y scrolls.
                 The grid lives INSIDE so cards are never clipped at the top.
                 padding-bottom ensures the last row isn't cut by the scrollbar.
            */}
            <div className="car-subtype-scroll">
              <div style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap:                 8,
                paddingBottom:       4,   /* prevent last row clip */
              }}>
                {CAR_SUBTYPES.map(s => {
                  const count = safeCarBreakdown[s.key] || 0
                  const co2   = parseFloat((count * s.co2Factor).toFixed(2))

                  return (
                    <div
                      key={s.key}
                      style={{
                        background:    'rgba(6,182,212,0.07)',
                        border:        '1px solid rgba(6,182,212,0.2)',
                        borderRadius:  10,
                        padding:       '10px 8px',
                        textAlign:     'center',
                        display:       'flex',
                        flexDirection: 'column',
                        alignItems:    'center',
                        gap:           4,
                      }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: `${s.color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {(Icons[s.key] || Icons.sedan)(s.color, 18)}
                      </div>

                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                        {s.label}
                      </div>

                      <div style={{ fontSize: 18, fontWeight: 800, color: '#06b6d4' }}>
                        {count}
                      </div>

                      <div style={{ fontSize: 10, color: '#fb923c' }}>
                        {co2.toFixed(2)} kg
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}

      </div>
    </>
  )
}