import React, { useState, useRef } from 'react'
import { uploadVideo, getSessionStatus } from '../services/api'

export default function VideoUploader({ onProcess, showSelectedName = true }) {
  const [file, setFile]             = useState(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress]     = useState(0)
  const [statusMsg, setStatusMsg]   = useState('')
  const pollRef = useRef(null)
  const fileRef = useRef(null)

  function handleFile(e) {
    fileRef.current = e.target.files[0]
    setFile(fileRef.current)
    setProgress(0)
    setStatusMsg('')
  }

  // Maps every backend label → one of the 4 main categories
  const SUBTYPE_TO_MAIN = {
    convertible: 'car',
    coupe:       'car',
    hatchback:   'car',
    pickup:      'car',
    sedan:       'car',
    suv:         'car',
    car:         'car',
    van:         'truck',
    truck:       'truck',
    bus:         'bus',
    motorcycle:  'motorcycle',
    motorbike:   'motorcycle',
  }

  async function fetchAndBuildResult(sessionId, filename) {
    try {
      const BASE = import.meta.env.VITE_VIDEO_API_URL || 'http://localhost:8001'
      const res  = await fetch(`${BASE}/api/video/results/${sessionId}`)

      if (!res.ok) return buildFallback(filename)

      const data = await res.json()

      const co2      = data.co2_result || {}
      const counts   = co2.vehicle_counts || {}   // { convertible: 14, hatchback: 5, … }
      const byTypeKg = co2.by_type       || {}   // { convertible: 0.374, … } already in kg

      // Aggregate into 4 main categories
      const aggregated = {
        car:        { count: 0, co2: 0 },
        truck:      { count: 0, co2: 0 },
        bus:        { count: 0, co2: 0 },
        motorcycle: { count: 0, co2: 0 },
      }

      Object.entries(counts).forEach(([label, cnt]) => {
        const main = SUBTYPE_TO_MAIN[label.toLowerCase()]
        if (!main || cnt <= 0) return
        aggregated[main].count += cnt
        aggregated[main].co2  += byTypeKg[label] ?? 0
      })

      Object.values(aggregated).forEach(v => {
        v.co2 = parseFloat(v.co2.toFixed(2))
      })

      const byType = [
        { type: 'car',        ...aggregated.car        },
        { type: 'truck',      ...aggregated.truck      },
        { type: 'bus',        ...aggregated.bus        },
        { type: 'motorcycle', ...aggregated.motorcycle },
      ]

      const totalVehicles = byType.reduce((a, b) => a + b.count, 0)

      const co2Total = co2.total_kg_per_day != null
        ? parseFloat(co2.total_kg_per_day.toFixed(1))
        : parseFloat(byType.reduce((a, b) => a + b.co2, 0).toFixed(1))

      // Flat sub-type counts for the detail cards
      const rawVehicleCounts = Object.fromEntries(
        Object.entries(counts).map(([k, v]) => [k.toLowerCase(), v])
      )

      const chartSeries = Array.from({ length: 12 }).map((_, i) => ({
        time:     `${String(i * 2).padStart(2, '0')}:00`,
        vehicles: Math.round(Math.random() * 20 + 3),
        co2:      parseFloat((Math.random() * 6 + 1).toFixed(1)),
      }))

      return {
        filename,
        totalVehicles,
        co2Total,
        avgSpeed:        48,
        processingTime:  `${data.processing_time_seconds ?? 2}s`,
        byType,
        chartSeries,
        rawVehicleCounts,   // { convertible: 14, hatchback: 5, coupe: 1, … }
        byTypeKg,           // { convertible: 0.374, hatchback: 0.144, … }
      }

    } catch (err) {
      console.error('[Results] fetch error:', err)
      return buildFallback(filename)
    }
  }

  function buildFallback(filename) {
    return {
      filename,
      totalVehicles: 0,
      co2Total:      0,
      avgSpeed:      0,
      processingTime: '—',
      byType: [
        { type: 'car',        count: 0, co2: 0 },
        { type: 'truck',      count: 0, co2: 0 },
        { type: 'bus',        count: 0, co2: 0 },
        { type: 'motorcycle', count: 0, co2: 0 },
      ],
      chartSeries:      [],
      rawVehicleCounts: {},
      byTypeKg:         {},
    }
  }

  function startPolling(sessionId, filename) {
    let attempts = 0
    setStatusMsg('Analyse en cours...')

    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const session = await getSessionStatus(sessionId)

        if (session.status === 'processing') {
          const pct = Math.min(20 + attempts * 5, 90)
          setProgress(pct)
          setStatusMsg(`Analyse en cours... (${pct}%)`)
        }

        if (session.status === 'completed') {
          clearInterval(pollRef.current)
          setProgress(95)
          setStatusMsg('Récupération des résultats...')
          const result = await fetchAndBuildResult(sessionId, filename)
          setProgress(100)
          setStatusMsg('Analyse terminée !')
          setProcessing(false)
          onProcess(result)
        }

        if (session.status === 'failed') {
          clearInterval(pollRef.current)
          setStatusMsg(`❌ Analyse échouée : ${session.error ?? 'erreur inconnue'}`)
          setProcessing(false)
        }

        if (attempts > 300) {  // 300 × 2s = 10 minutes max
          clearInterval(pollRef.current)
          setStatusMsg('Timeout — réessaie')
          setProcessing(false)
        }

      } catch (err) {
        console.error(`[Poll #${attempts}] error:`, err)
      }
    }, 2000)
  }

  async function start() {
    if (!file) return
    setProcessing(true)
    setProgress(5)
    setStatusMsg('Upload en cours...')

    try {
      const session = await uploadVideo(file)
      setProgress(15)
      setStatusMsg('Vidéo reçue, analyse démarrée...')
      startPolling(session.session_id, file.name)
    } catch (err) {
      console.error('Upload error:', err)
      setStatusMsg(`Erreur : ${err.message}`)
      setProcessing(false)
    }
  }

  function reset() {
    clearInterval(pollRef.current)
    setFile(null)
    fileRef.current = null
    setProgress(0)
    setProcessing(false)
    setStatusMsg('')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.02)', padding: '6px 8px',
        borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
        cursor: processing ? 'not-allowed' : 'pointer',
        opacity: processing ? 0.6 : 1,
      }}>
        <input
          type="file"
          accept="video/mp4,video/avi,video/mov,video/mkv"
          onChange={handleFile}
          disabled={processing}
          style={{ display: 'none' }}
        />
        <span style={{ fontSize: 13, color: file ? 'var(--text)' : 'var(--muted)' }}>
          {showSelectedName ? (file ? file.name : 'Choisir un fichier') : 'Choisir un fichier'}
        </span>
      </label>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          className="btn"
          onClick={start}
          disabled={!file || processing}
          style={{ padding: '6px 10px', fontSize: 13 }}
        >
          {processing ? 'Analyse...' : "Lancer l'analyse"}
        </button>
        <button
          className="btn ghost"
          onClick={reset}
          disabled={processing}
          style={{ padding: '6px 10px', fontSize: 13 }}
        >
          Effacer
        </button>
      </div>

      {(processing || statusMsg) && (
        <div style={{ marginLeft: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{
            width: 200, height: 8,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 6, overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`, height: 8,
              background: progress === 100
                ? 'linear-gradient(90deg,#10b981,#059669)'
                : 'linear-gradient(90deg,#06b6d4,#7c3aed)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ fontSize: 12, color: '#9aa4ad' }}>{statusMsg}</div>
        </div>
      )}
    </div>
  )
}