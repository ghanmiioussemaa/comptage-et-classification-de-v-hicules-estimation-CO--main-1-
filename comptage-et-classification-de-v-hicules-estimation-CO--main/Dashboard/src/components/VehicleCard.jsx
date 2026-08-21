import React, { useState } from 'react'
import { CarIcon, TruckIcon, BusIcon, MotoIcon, VanIcon } from '../icons'

const TYPE_CONFIG = {
  car:   { label: 'Voiture',     icon: CarIcon,   color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'   },
  truck: { label: 'Camion',      icon: TruckIcon,  color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  bus:   { label: 'Bus',         icon: BusIcon,    color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  moto:  { label: 'Moto',        icon: MotoIcon,   color: '#7c3aed', bg: 'rgba(124,58,237,0.12)'  },
  van:   { label: 'Utilitaire',  icon: VanIcon,    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
}

const SUBTYPE_LABELS = {
  sedan:     'Berline (Sedan)',
  suv:       'SUV / 4x4',
  hatchback: 'Citadine (Hatchback)',
  pickup:    'Pick-up',
}

/**
 * VehicleCard — carte cliquable avec sous-types expandables
 *
 * Props:
 *   type      : "car" | "truck" | "bus" | "moto" | "van"
 *   count     : nombre de véhicules détectés
 *   co2       : émissions CO2 en kg/jour
 *   subtypes  : { sedan: {count, co2}, suv: {count, co2}, ... }  (optionnel)
 */
export default function VehicleCard({ type, count, co2, subtypes = {} }) {
  const [open, setOpen] = useState(false)

  const cfg        = TYPE_CONFIG[type] || TYPE_CONFIG.car
  const Icon       = cfg.icon
  const hasSubtypes = Object.keys(subtypes).length > 0
  const maxCount   = hasSubtypes
    ? Math.max(...Object.values(subtypes).map(s => s.count))
    : 1

  return (
    <div style={{
      background: 'var(--card, rgba(255,255,255,0.04))',
      border: `1px solid ${open ? cfg.color + '55' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 12,
      padding: '12px 14px',
      transition: 'border-color .2s',
      cursor: hasSubtypes ? 'pointer' : 'default',
    }}
      onClick={() => hasSubtypes && setOpen(o => !o)}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Icône */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: cfg.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon style={{ color: cfg.color, width: 18, height: 18 }} />
        </div>

        {/* Nom + CO2 */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text, #fff)' }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted, #9aa4ad)', marginTop: 1 }}>
            {co2} kg CO2/jour
          </div>
        </div>

        {/* Compteur */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text, #fff)', lineHeight: 1 }}>
            {count}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted, #9aa4ad)' }}>véhicules</div>
        </div>

        {/* Chevron */}
        {hasSubtypes && (
          <div style={{
            marginLeft: 6, fontSize: 10,
            color: 'var(--muted, #9aa4ad)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .2s',
          }}>▼</div>
        )}
      </div>

      {/* ── Sous-types (expandable) ── */}
      {open && hasSubtypes && (
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          {Object.entries(subtypes).map(([subtype, data]) => {
            const pct = Math.round((data.count / maxCount) * 100)
            return (
              <div key={subtype} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                {/* Nom */}
                <div style={{ fontSize: 12, color: 'var(--text, #fff)', flex: '0 0 130px' }}>
                  {SUBTYPE_LABELS[subtype] || subtype}
                </div>

                {/* Barre proportionnelle */}
                <div style={{
                  flex: 1, height: 5,
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 3, overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: cfg.color + '88',
                    borderRadius: 3,
                  }} />
                </div>

                {/* Compteur */}
                <div style={{
                  fontSize: 13, fontWeight: 500,
                  color: 'var(--text, #fff)',
                  minWidth: 24, textAlign: 'right',
                }}>
                  {data.count}
                </div>

                {/* CO2 */}
                <div style={{
                  fontSize: 11, color: cfg.color,
                  minWidth: 56, textAlign: 'right',
                }}>
                  {data.co2} kg
                </div>
              </div>
            )
          })}

          {/* Total voitures */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end',
            gap: 12, marginTop: 6, paddingTop: 4,
            fontSize: 12, color: 'var(--muted, #9aa4ad)',
          }}>
            <span>Total : <strong style={{ color: 'var(--text, #fff)' }}>{count}</strong></span>
            <span>CO2 : <strong style={{ color: cfg.color }}>{co2} kg</strong></span>
          </div>
        </div>
      )}
    </div>
  )
}
