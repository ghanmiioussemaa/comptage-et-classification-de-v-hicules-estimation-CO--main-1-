import React, { useState, useEffect, use } from 'react'
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


const [chartSeries, setChartSeries] = useState([
  { time: '00:00', vehicles: 0, co2: 0 },
  { time: '01:00', vehicles: 0, co2: 0 },
  { time: '02:00', vehicles: 0, co2: 0 },
  { time: '03:00', vehicles: 0, co2: 0 },
  { time: '04:00', vehicles: 0, co2: 0 },
  { time: '05:00', vehicles: 0, co2: 0 },
  { time: '06:00', vehicles: 0, co2: 0 },
]);

useEffect(() => {
  // Update immediately when traffic changes
  const totalVehicles = (traffic.cars ? Object.values(traffic.cars).reduce((a, b) => a + b, 0) : 0) +
                        (traffic.van || 0) +
                        (traffic.trucks || 0) +
                        (traffic.bus || 0) +
                        (traffic.motorcycle || 0);

  const co2 = parseFloat((totalVehicles * 0.2).toFixed(1));

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeLabel = `${hours}:${minutes}`;

  setChartSeries(prev => [
    ...prev.slice(1),
    { time: timeLabel, vehicles: totalVehicles, co2: co2 }
  ]);
}, [traffic]);
  

  // Debug: Log traffic data
  useEffect(() => {
    console.log('🔍 Traffic data from WebSocket:', traffic);
    console.log('🔍 Cars breakdown:', traffic.cars);
  }, [traffic]);

  function getTotalCarsCount(cars) {
    return cars ? Object.values(cars).reduce((sum, count) => sum + count, 0) : 0;
  }

  function generateDynamicData() {
    const carCount = getTotalCarsCount(traffic.cars);
    const vanCount = traffic.van || 0;
    const truckCount = traffic.trucks || 0;
    const busCount = traffic.bus || 0;
    const motorcycleCount = traffic.motorcycle || 0;

    const totalVehicles = carCount + vanCount + truckCount + busCount + motorcycleCount || 1;
    
    setSummary({
      totalVehicles,
      co2Today: parseFloat((totalVehicles * 0.8).toFixed(1)),
      co2Forecast: parseFloat((totalVehicles * 0.9).toFixed(1)),
      avgSpeed: 45,
      congestionLevel: 30,
      trafficStatus: totalVehicles > 140 ? 'Modéré' : 'Fluide',
    })

    const vehicleData = [
      { type: 'Voiture', count: carCount, co2: 12 },
      { type: 'Van', count: vanCount, co2: 12 },
      { type: 'Camion', count: truckCount, co2: 20 },
      { type: 'Bus', count: busCount, co2: 15 },
      { type: 'Moto', count: motorcycleCount, co2: 5 },
    ]

    setVehicleTypes(vehicleData)
    setClassification({
      labels: ['Voiture', 'Van', 'Camion', 'Bus', 'Moto'],
      vehicleCounts: vehicleData.map(v => v.count),
      co2ByType: vehicleData.map(v => v.co2),
    })
  }

  useEffect(() => {
    generateDynamicData()
  }, [traffic])

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
                  Caméra en Direct {isConnected ? '🟢' : '🔴'}
                </div>

                <div style={{ 
                  width: '100%', 
                  height: '180px', 
                  borderRadius: 8, 
                  overflow: 'hidden', 
                  background: '#000',
                  position: 'relative'
                }}>
                  <iframe
                    width="100%"
                    height="150%"
                    src="https://www.youtube.com/embed/z545k7Tcb5o?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1"
                    title="Live Stream"
                    allow="autoplay; encrypted-media"
                    style={{ border: 0, pointerEvents: 'none' }}
                  ></iframe>

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
                <VehicleIconBar 
                  vehicles={vehicleTypes} 
                  carBreakdown={traffic.cars}
                />
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
                  <CO2Chart series={chartSeries} />
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
        <main className="container">
           {view === 'video' ? <VideoAnalysis onBack={() => setView('dashboard')} /> : <PredictionPage onBack={() => setView('dashboard')} />}
        </main>
      )}
    </div>
  )
}