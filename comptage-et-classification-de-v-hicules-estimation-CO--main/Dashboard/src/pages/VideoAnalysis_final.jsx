import React, { useState } from 'react'
import VideoUploader from '../components/VideoUploader'
import ClassificationChart from '../components/ClassificationChart'
import CO2Chart from '../components/CO2Chart'
import VehicleIconBar from '../components/VehicleIconBar'

// ── All CNN sub-type keys exactly as the backend sends them ──────────────────
const SUBTYPE_KEYS = ['convertible', 'coupe', 'hatchback', 'pickup', 'sedan', 'suv', 'van']

const TYPE_LABELS = {
  car:        'Voiture',
  truck:      'Camion',
  bus:        'Bus',
  motorcycle: 'Moto',
}

/**
 * Build subtypes directly from rawVehicleCounts (flat backend object)
 * e.g. { convertible: 14, hatchback: 5, coupe: 1, truck: 2, van: 1 }
 */
function extractCarSubtypes(rawVehicleCounts, byTypeKg = {}) {
  const CO2_FACTORS = {
    convertible: 130.0, coupe: 140.0, hatchback: 120.0,
    pickup: 240.0, sedan: 150.0, suv: 210.0, van: 230.0,
  }
  const DISTANCE_KM = 24.0

  const subtypes = {}
  SUBTYPE_KEYS.forEach(key => {
    const count = rawVehicleCounts[key] ?? 0
    const co2   = byTypeKg[key] != null
      ? parseFloat(byTypeKg[key].toFixed(2))
      : parseFloat((CO2_FACTORS[key] * count * DISTANCE_KM / 1000).toFixed(2))
    subtypes[key] = { count, co2 }
  })
  return subtypes
}

export default function VideoAnalysis({ onBack }) {
  const [result, setResult] = useState(null)

  function handleProcess(res) {
    console.log('[VideoAnalysis] result =', res)
    setResult(res)
  }

  if (!result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Analyse Vidéo</h2>
          <button className="btn" onClick={onBack}>Retour</button>
        </div>
        <div style={{ background: 'var(--card)', padding: 12, borderRadius: 10 }}>
          <VideoUploader onProcess={handleProcess} showSelectedName={true} />
        </div>
      </div>
    )
  }

  // ── Raw data from backend ────────────────────────────────────────────────
  const rawVehicleCounts = result.rawVehicleCounts || {}
  const byTypeKg         = result.byTypeKg         || {}

  const carSubtypes = extractCarSubtypes(rawVehicleCounts, byTypeKg)

  // ── vehicleIconData for VehicleIconBar ───────────────────────────────────
  const vehicleIconData = result.byType.map(b => ({
    type:  TYPE_LABELS[b.type] || b.type,
    count: b.count,
    co2:   b.co2,
    subtypes: b.type === 'car' ? {
      convertible: { count: carSubtypes.convertible?.count || 0, co2: carSubtypes.convertible?.co2 || 0 },
      coupe:       { count: carSubtypes.coupe?.count       || 0, co2: carSubtypes.coupe?.co2       || 0 },
      hatchback:   { count: carSubtypes.hatchback?.count   || 0, co2: carSubtypes.hatchback?.co2   || 0 },
      pickup:      { count: carSubtypes.pickup?.count      || 0, co2: carSubtypes.pickup?.co2      || 0 },
      sedan:       { count: carSubtypes.sedan?.count       || 0, co2: carSubtypes.sedan?.co2       || 0 },
      suv:         { count: carSubtypes.suv?.count         || 0, co2: carSubtypes.suv?.co2         || 0 },
      van:         { count: carSubtypes.van?.count         || 0, co2: carSubtypes.van?.co2         || 0 },
    } : {},
  }))

  // ── mainTypes for chart ──────────────────────────────────────────────────
  const mainTypes = result.byType.map(b => ({
    key:   b.type,
    label: TYPE_LABELS[b.type] || b.type,
    count: b.count,
    co2:   b.co2,
  }))

  // ── subTypes for sub-chart ───────────────────────────────────────────────
  const subTypes = SUBTYPE_KEYS.map(key => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    count: carSubtypes[key]?.count || 0,
    co2:   carSubtypes[key]?.co2   || 0,
  }))

  const chartData = {
    labels:        mainTypes.map(t => t.label),
    vehicleCounts: mainTypes.map(t => t.count),
    co2ByType:     mainTypes.map(t => t.co2),
  }

  const subChartData = {
    labels:        subTypes.map(t => t.label),
    vehicleCounts: subTypes.map(t => t.count),
    co2ByType:     subTypes.map(t => t.co2),
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      height: '100%', overflow: 'auto', padding: 4,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Analyse Vidéo</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={onBack}>Retour</button>
          <button className="btn ghost" onClick={() => setResult(null)}>Nouvelle analyse</button>
        </div>
      </div>

      {/* Fichier */}
      <div style={{ background: 'var(--card)', padding: '6px 12px', borderRadius: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          Fichier analysé : <strong style={{ color: 'var(--text)' }}>{result.filename}</strong>
          <span style={{ marginLeft: 12, color: 'var(--muted)' }}>
            {result.totalVehicles} véhicules · {result.co2Total} kg CO₂ · {result.processingTime}
          </span>
        </span>
      </div>

      {/* GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

        {/* BOX 1 : Détails par type */}
        <div style={{ background: 'var(--card)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
            Détails par type
          </div>
          <VehicleIconBar
            vehicles={vehicleIconData}
            carBreakdown={{
              convertible: carSubtypes.convertible?.count || 0,
              coupe:       carSubtypes.coupe?.count       || 0,
              hatchback:   carSubtypes.hatchback?.count   || 0,
              pickup:      carSubtypes.pickup?.count      || 0,
              sedan:       carSubtypes.sedan?.count       || 0,
              suv:         carSubtypes.suv?.count         || 0,
              van:         carSubtypes.van?.count         || 0,
            }}
          />
        </div>

        {/* BOX 2 : Catégories de véhicules */}
        <div style={{ background: 'var(--card)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            Catégories de véhicules
          </div>
          <div style={{ height: 260 }}>
            <ClassificationChart
              data={chartData}
              showCo2={false}
              vehicleData={mainTypes.map(t => ({ type: t.label, count: t.count }))}
              isVehicleTypes={false}
            />
          </div>
        </div>

        {/* BOX 3 : Détail sous-types voitures */}
        <div style={{ background: 'var(--card)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            Détail Voitures
          </div>
          <div style={{ height: 260 }}>
            <ClassificationChart
              data={subChartData}
              showCo2={false}
              vehicleData={subTypes.map(t => ({ type: t.label, count: t.count }))}
              isVehicleTypes={false}
            />
          </div>
        </div>

      </div>
    </div>
  )
}