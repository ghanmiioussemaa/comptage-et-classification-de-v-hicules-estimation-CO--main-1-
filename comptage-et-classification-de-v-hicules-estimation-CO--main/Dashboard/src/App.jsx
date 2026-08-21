import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import CO2Chart from './components/CO2Chart'
import ClassificationChart from './components/ClassificationChart'
import VehicleIconBar from './components/VehicleIconBar'
import VideoAnalysis from './pages/VideoAnalysis_final'
import PredictionPage from './pages/PredictionPage'
import { useTrafficData } from './data/TrafficMonitor'





export default function App() {
  const [view, setView] = useState('dashboard')
  const [summary, setSummary] = useState(null)
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [classification, setClassification] = useState(null)


  const { traffic, isConnected } = useTrafficData();

  const fixedChartSeries = [
    { time: '00:00', vehicles: 10, co2: 5 },
    { time: '04:00', vehicles: 9, co2: 4.2 },
    { time: '08:00', vehicles: 18, co2: 8 },
    { time: '12:00', vehicles: 13, co2: 6.2 },
    { time: '16:00', vehicles: 18, co2: 8 },
    { time: '20:00', vehicles: 13, co2: 6 },
    { time: '23:00', vehicles: 9, co2: 4.5 },
  ];

  function generateDynamicData() {
    const totalVehicles = Math.floor(120 + Math.random() * 40)
    
    setSummary({
      totalVehicles,
      co2Today: parseFloat((totalVehicles * 0.8).toFixed(1)),
      co2Forecast: parseFloat((totalVehicles * 0.9).toFixed(1)),
      avgSpeed: 45,
      congestionLevel: 30,
      trafficStatus: totalVehicles > 140 ? 'Modéré' : 'Fluide',
    })

    const vehicleData = [
      { type: 'Voiture', count: Object.values(traffic.cars).reduce((a, b) => a + b, 0), co2: 12 },
      { type: 'Camion', count: Math.floor(totalVehicles * 0.15), co2: 20 },
      { type: 'Bus', count: Math.floor(totalVehicles * 0.1), co2: 15 },
      { type: 'Moto', count: Math.floor(totalVehicles * 0.1), co2: 5 },
    ]

    setVehicleTypes(vehicleData)
    setClassification({
      labels: ['Voiture', 'Camion', 'Bus', 'Moto'],
      vehicleCounts: vehicleData.map(v => v.count),
      co2ByType: vehicleData.map(v => v.co2),
    })
  }

  useEffect(() => {
    generateDynamicData()
    const interval = setInterval(generateDynamicData, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app-root">
      <Header view={view} onNavigate={setView} />

      {view === 'dashboard' ? (
        <main className="container">
          {summary && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '250px auto',
              gap: 12,
              flex: 1,
              minHeight: 0,
            }}>

              {/* BOX 1 : LOCKED LIVE VIDEO */}
              <div style={{
                background: 'var(--card)',
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  Caméra en Direct
                </div>

                <div style={{ 
                  width: '100%', 
                  height: '180px', 
                  borderRadius: 8, 
                  overflow: 'hidden', 
                  background: '#000',
                  position: 'relative' // Essential for the overlay shield
                }}>
                  {/* The Actual Video Stream */}
                  <iframe
                    width="100%"
                    height="150%"
                    src="https://www.youtube.com/embed/z545k7Tcb5o?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1"
                    title="Live Stream"
                    allow="autoplay; encrypted-media"
                    style={{ border: 0, pointerEvents: 'none' }}
                  ></iframe>

                  {/* THE SHIELD: Blocks all clicks, pauses, and hover menus */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 10,
                    background: 'transparent',
                    cursor: 'default'
                  }}></div>

                  {/* CUSTOM LABEL: Shows the "Channel Name" or Status since controls are hidden */}
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    zIndex: 11,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    pointerEvents: 'none'
                  }}>
                    🔴 Live: Traffic Feed
                  </div>
                </div>
              </div>

              {/* BOX 2 : DETAILS */}
              <div style={{
                background: 'var(--card)',
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                maxHeight: '300px'
              }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Détails par type</div>
                <VehicleIconBar vehicles={vehicleTypes} />
              </div>

              {/* BOX 3 : CHART */}
              <div style={{
                background: 'var(--card)',
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>CO2 en temps réel</div>
                <div style={{ flex: 1 }}>
                  <CO2Chart series={fixedChartSeries} />
                </div>
              </div>

              {/* BOX 4 : CLASSIFICATION */}
              <div style={{
                background: 'var(--card)',
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Classification</div>
                <div style={{ flex: 1 }}>
                  <ClassificationChart
                    data={classification}
                    vehicleData={vehicleTypes}
                  />
                </div>
              </div>

            </div>
          )}
        </main>
      ) : (
        /* Other views (video analysis, prediction) */
        <main className="container">
           {view === 'video' ? <VideoAnalysis onBack={() => setView('dashboard')} /> : <PredictionPage onBack={() => setView('dashboard')} />}
        </main>
      )}
    </div>
  )
}