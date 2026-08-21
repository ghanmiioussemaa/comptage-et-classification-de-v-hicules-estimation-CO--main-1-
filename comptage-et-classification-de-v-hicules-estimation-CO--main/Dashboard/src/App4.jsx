import React, { useState, useEffect, useRef } from 'react'
import Header from './components/Header'
import CO2Chart from './components/CO2Chart'
import ClassificationChart from './components/ClassificationChart'
import VehicleIconBar from './components/VehicleIconBar'
import VideoAnalysis from './pages/VideoAnalysis_final'
import PredictionPage from './pages/PredictionPage'
import { useTrafficData } from './data/TrafficMonitor'

const CO2_FACTORS = {
  convertible: 130.0,
  coupe:       140.0,
  hatchback:   120.0,
  pickup:      240.0,
  sedan:       150.0,
  suv:         210.0,
  van:         230.0,
  truck:       650.0,
  bus:         800.0,
  motorcycle:   80.0,
}

const CYCLE_DURATION_MS = 2 * 60 * 1000
const INTERVAL_MS       = 5000

export default function App() {
  const [view, setView] = useState('dashboard')
  const [summary, setSummary] = useState(null)
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [classification, setClassification] = useState(null)

  const { traffic, isConnected } = useTrafficData()

  const [co2ChartSeries, setCo2ChartSeries] = useState([
    { time: '00:00:00', vehicles: 0, co2: 0 }
  ])

  const cycleStartRef = useRef(Date.now())
  const cycleCO2Ref   = useRef(0)
  const trafficRef    = useRef(traffic)

  useEffect(() => {
    trafficRef.current = traffic
  }, [traffic])

  function getTotalCarsCount(cars) {
    if (!cars || typeof cars !== 'object') return 0
    return Object.values(cars).reduce((sum, n) => sum + (n || 0), 0)
  }

  function computeCO2Increment(currentTraffic) {
    const KM_PER_TICK = 1  // ~0.05 km

    const cars = currentTraffic?.cars || {}

    let totalGramsPerKm = 0

    Object.keys(cars).forEach(type => {
      const count  = cars[type] || 0
      const factor = CO2_FACTORS[type] || CO2_FACTORS.car
      totalGramsPerKm += count * factor
    })

    const vanCount        = currentTraffic?.van        || 0
    const truckCount      = currentTraffic?.trucks     || currentTraffic?.truck || 0
    const busCount        = currentTraffic?.bus        || 0
    const motorcycleCount = currentTraffic?.motorcycle || 0

    totalGramsPerKm +=
      vanCount        * CO2_FACTORS.van        +
      truckCount      * CO2_FACTORS.truck      +
      busCount        * CO2_FACTORS.bus        +
      motorcycleCount * CO2_FACTORS.motorcycle

    if (isNaN(totalGramsPerKm)) return 0

    return parseFloat(((totalGramsPerKm * KM_PER_TICK) / 1000).toFixed(4))
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const now            = Date.now()
      const currentTraffic = trafficRef.current

      const timeLabel = new Date().toLocaleTimeString([], {
        hour:   '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })

      const totalVehicles =
        getTotalCarsCount(currentTraffic?.cars) +
        (currentTraffic?.van        || 0) +
        (currentTraffic?.trucks     || 0) +
        (currentTraffic?.bus        || 0) +
        (currentTraffic?.motorcycle || 0)

      if (now - cycleStartRef.current >= CYCLE_DURATION_MS) {
        cycleStartRef.current = now
        cycleCO2Ref.current   = 0
        setCo2ChartSeries([{ time: timeLabel, vehicles: totalVehicles, co2: 0 }])
        return
      }

      const increment     = computeCO2Increment(currentTraffic)
      cycleCO2Ref.current = parseFloat((cycleCO2Ref.current + increment).toFixed(4))

      setCo2ChartSeries(prev => [
        ...prev,
        { time: timeLabel, vehicles: totalVehicles, co2: cycleCO2Ref.current },
      ])
    }, INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const carCount        = getTotalCarsCount(traffic?.cars)
    const vanCount        = traffic?.van        || 0
    const truckCount      = traffic?.trucks     || traffic?.truck || 0
    const busCount        = traffic?.bus        || 0
    const motorcycleCount = traffic?.motorcycle || 0

    const totalVehicles   = carCount + vanCount + truckCount + busCount + motorcycleCount || 1
    const currentCycleCO2 = cycleCO2Ref.current

    setSummary({
      totalVehicles,
      co2Today:        currentCycleCO2,
      co2Forecast:     parseFloat((currentCycleCO2 * 1.1).toFixed(2)),
      avgSpeed:        45,
      congestionLevel: 30,
      trafficStatus:   totalVehicles > 140 ? 'Modéré' : 'Fluide',
    })

    const vehicleData = [
      { type: 'Voiture', count: carCount,        co2: CO2_FACTORS.car        },
      { type: 'Van',     count: vanCount,         co2: CO2_FACTORS.van        },
      { type: 'Camion',  count: truckCount,       co2: CO2_FACTORS.truck      },
      { type: 'Bus',     count: busCount,         co2: CO2_FACTORS.bus        },
      { type: 'Moto',    count: motorcycleCount,  co2: CO2_FACTORS.motorcycle },
    ]

    setVehicleTypes(vehicleData)

    setClassification({
      labels:        ['Voiture', 'Van', 'Camion', 'Bus', 'Moto'],
      vehicleCounts: vehicleData.map(v => v.count),
      co2ByType:     vehicleData.map(v =>
        parseFloat((v.count * v.co2 / 1000).toFixed(2))
      ),
    })
  }, [traffic])

  return (
    <div className="app-root">

      {/* ✅ Scoped scrollbar style for the vehicle card */}
      <style>{`
        .vehicle-card {
          background:    var(--card);
          border-radius: 12px;
          padding:       14px;
          overflow-y:    auto;
          overflow-x:    hidden;
          scrollbar-width: thin;
          scrollbar-color: #4b5563 transparent;
        }
        .vehicle-card::-webkit-scrollbar {
          width: 5px;
        }
        .vehicle-card::-webkit-scrollbar-track {
          background: transparent;
        }
        .vehicle-card::-webkit-scrollbar-thumb {
          background:    #4b5563;
          border-radius: 4px;
        }
        .vehicle-card::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>

      <Header view={view} onNavigate={setView} />

      {view === 'dashboard' ? (
        <main className="container">
          {summary && (
            <div style={{
              display:             'grid',
              gridTemplateColumns: '1fr 1fr',
              // ✅ 'auto' on the first row lets the vehicle card grow when
              //    sub-types expand, instead of clipping at 250px
              gridTemplateRows:    'auto auto',
              gap:                 12,
              flex:                1,
              minHeight:           0,
            }}>

              {/* LIVE CAMERA */}
              <div style={{ background: 'var(--card)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  Caméra en Direct {isConnected ? '🟢' : '🔴'}
                </div>
                <div style={{
                  width:       '100%',
                  height:      '180px',
                  borderRadius: 8,
                  overflow:    'hidden',
                  background:  '#000',
                  position:    'relative',
                }}>
                  <iframe
                    width="100%"
                    height="150%"
                    src="https://www.youtube.com/embed/z545k7Tcb5o?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0"
                    title="Live Stream"
                    allow="autoplay; encrypted-media"
                    style={{ border: 0, pointerEvents: 'none' }}
                  />
                </div>
              </div>

              {/* VEHICLES — scrollable card */}
              <div className="vehicle-card">
                <VehicleIconBar
                  vehicles={vehicleTypes}
                  carBreakdown={traffic?.cars}
                />
              </div>

              {/* CO2 CHART */}
              <div style={{ background: 'var(--card)', borderRadius: 12, padding: 14 }}>
                <CO2Chart series={co2ChartSeries} />
              </div>

              {/* CLASSIFICATION */}
              <div style={{ background: 'var(--card)', borderRadius: 12, padding: 14 }}>
                <ClassificationChart
                  data={classification}
                  vehicleData={vehicleTypes}
                />
              </div>

            </div>
          )}
        </main>
      ) : (
        <main className="container">
          {view === 'video'
            ? <VideoAnalysis onBack={() => setView('dashboard')} />
            : <PredictionPage onBack={() => setView('dashboard')} />
          }
        </main>
      )}
    </div>
  )
}