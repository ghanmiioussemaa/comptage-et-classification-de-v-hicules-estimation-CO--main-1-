import React from 'react'

// CO2 factors (g/km) — mirrors backend
const CO2_FACTORS = {
  convertible: 130.0,
  coupe:       140.0,
  hatchback:   120.0,
  pickup:      240.0,
  sedan:       150.0,
  suv:         210.0,
  van:         230.0,
}
const DISTANCE_KM = 24.0

const SUBTYPES = [
  { key: 'convertible', name: 'Convertible', color: '#06b6d4' },
  { key: 'coupe',       name: 'Coupé',       color: '#0891b2' },
  { key: 'hatchback',   name: 'Hatchback',   color: '#67e8f9' },
  { key: 'pickup',      name: 'Pickup',      color: '#155e75' },
  { key: 'sedan',       name: 'Sedan',       color: '#06b6d4' },
  { key: 'suv',         name: 'SUV',         color: '#0891b2' },
]

/**
 * Props:
 *   rawVehicleCounts  – flat object from backend:
 *                       { convertible: 14, hatchback: 5, coupe: 1, … }
 *   byTypeKg          – flat CO2 object from backend (optional):
 *                       { convertible: 0.374, hatchback: 0.144, … }
 */
export default function VehicleSubtypesDisplay2({ rawVehicleCounts = {}, byTypeKg = {} }) {
  // Only render if there's at least one car sub-type present
  const hasAny = SUBTYPES.some(s => (rawVehicleCounts[s.key] ?? 0) > 0)
  if (!hasAny) return null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '8px',
      marginTop: '8px',
      padding: '8px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '8px',
    }}>
      {SUBTYPES.map(subtype => {
        const count = rawVehicleCounts[subtype.key] ?? 0

        // Use backend CO2 if available, otherwise compute locally
        const co2kg = byTypeKg[subtype.key] != null
          ? parseFloat(byTypeKg[subtype.key].toFixed(2))
          : parseFloat((CO2_FACTORS[subtype.key] * count * DISTANCE_KM / 1000).toFixed(2))

        return (
          <div key={subtype.key} style={{
            background: 'rgba(6,182,212,0.08)',
            padding: '10px 8px',
            borderRadius: '8px',
            textAlign: 'center',
            border: `1px solid ${subtype.color}40`,
          }}>
            <div style={{
              fontWeight: 600,
              color: '#e6eef2',
              fontSize: '11px',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {subtype.name}
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 700,
              color: subtype.color,
              lineHeight: 1,
            }}>
              {count}
            </div>
            <div style={{
              fontSize: '10px',
              color: count > 0 ? '#f97316' : '#9aa4ad',
              marginTop: '4px',
            }}>
              {co2kg.toFixed(2)} kg
            </div>
          </div>
        )
      })}
    </div>
  )
}