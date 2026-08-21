import React, { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function PredictionPage({ onBack }) {
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);
  
  // ÉTAT POUR LE SURVOL
  const [hoveredType, setHoveredType] = useState(null);

  const fetchPredictions = async () => {
    try {
      const res = await fetch('http://localhost:8002/predict-live');
      const body = await res.json();
      if (body.status === 'success') {
        const formattedChart = body.predicted_counts.map((cnt, i) => ({
          time: body.future_timestamps[i],
          co2: parseFloat((cnt * 0.18).toFixed(2)),
        }));
        setChartData(formattedChart);
        setData(body.metrics);
      } else { throw new Error(body.message); }
    } catch (err) { setError(err.message); }
  };

  useEffect(() => { fetchPredictions(); }, []);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← Dashboard</button>
        <h1 style={styles.title}>Analyse Prédictive LSTM</h1>
        <div style={styles.liveBadge}>IA ACTIVE</div>
      </div>

      {!data ? (
        <div style={styles.loading}>Chargement...</div>
      ) : (
        <div style={styles.mainContainer}>
          
          {/* GRAPHIQUE */}
          <div style={styles.chartSection}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                <XAxis dataKey="time" stroke="#555" fontSize={10} />
                <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid #333'}} />
                <Area type="monotone" dataKey="co2" stroke="#10b981" fill="#10b98122" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={styles.threeColumnGrid}>
            
            {/* COLONNE 1 : TOTAL */}
            <div style={styles.column}>
              <h3 style={styles.colTitle}>Impact Global</h3>
              <div style={styles.cardInfo}>
                <span style={styles.label}>Total Véhicules / h</span>
                <div style={styles.bigValue}>{data.total_vehicles}</div>
              </div>
            </div>

            {/* COLONNE 2 : CLASSES (AVEC INTERACTION) */}
            <div style={styles.column}>
              <h3 style={styles.colTitle}>Classes de Véhicules</h3>
              <div style={styles.classList}>
                {Object.entries(data.vehicle_types).map(([type, count]) => (
                  <div 
                    key={type} 
                    style={{
                        ...styles.classRow, 
                        borderColor: (type === 'voiture' && hoveredType === 'voiture') ? '#10b981' : '#1a1a1a',
                        cursor: type === 'voiture' ? 'help' : 'default'
                    }}
                    onMouseEnter={() => type === 'voiture' && setHoveredType('voiture')}
                    onMouseLeave={() => setHoveredType(null)}
                  >
                    <div style={styles.typeName}>
                       <span style={{...styles.dot, background: type === 'voiture' ? '#10b981' : '#3b82f6'}}></span> 
                       {type}s
                    </div>
                    <div style={styles.typeCount}>{count}</div>

                    {/* BULLE INFO AU SURVOL DES VOITURES */}
                    {type === 'voiture' && hoveredType === 'voiture' && (
                      <div style={styles.popover}>
                        <div style={styles.popoverTitle}>Détails Sous-classes</div>
                        {data.car_subtypes.map(sub => (
                          <div key={sub.label} style={styles.popoverRow}>
                            <span>{sub.label}</span>
                            <span style={{color: '#10b981'}}>{sub.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* COLONNE 3 : STATUT IA */}
            <div style={styles.column}>
              <h3 style={styles.colTitle}>Fiabilité Modèle</h3>
              <div style={{color: '#444', fontSize: '0.8rem'}}>
                Le modèle LSTM analyse les 12 derniers cycles pour projeter la répartition par classe.
                <br /><br />
                <span style={{color: '#10b981'}}>✔ Normalisation Scaler_X active</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'monospace' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  backBtn: { background: 'transparent', border: '1px solid #444', color: '#888', padding: '5px 15px', cursor: 'pointer' },
  title: { fontSize: '1rem' },
  liveBadge: { color: '#10b981', fontSize: '0.7rem' },
  mainContainer: { maxWidth: '1200px', margin: '0 auto' },
  chartSection: { background: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #222', marginBottom: '20px' },
  threeColumnGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' },
  column: { background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #222', position: 'relative' },
  colTitle: { fontSize: '0.8rem', color: '#888', marginBottom: '15px' },
  cardInfo: { background: '#050505', padding: '15px', borderRadius: '6px' },
  label: { fontSize: '0.7rem', color: '#555' },
  bigValue: { fontSize: '2rem', fontWeight: 'bold' },
  classList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  classRow: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    padding: '12px', 
    background: '#0a0a0a', 
    border: '1px solid #1a1a1a',
    position: 'relative', // IMPORTANT pour le Popover
    transition: '0.2s all'
  },
  typeName: { fontSize: '0.8rem', display: 'flex', alignItems: 'center' },
  dot: { width: '6px', height: '6px', borderRadius: '50%', marginRight: '10px' },
  typeCount: { fontWeight: 'bold', color: '#3b82f6' },
  
  // LE POPOVER (FENETRE QUI APPARAIT)
  popover: {
    position: 'absolute',
    left: '105%', // Apparaît à droite de la ligne
    top: '0',
    width: '180px',
    background: '#151515',
    border: '1px solid #10b981',
    borderRadius: '6px',
    padding: '12px',
    zIndex: 100,
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
  },
  popoverTitle: { fontSize: '0.7rem', color: '#10b981', marginBottom: '8px', borderBottom: '1px solid #333', paddingBottom: '5px' },
  popoverRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '5px', color: '#ccc' },
  loading: { textAlign: 'center', marginTop: '100px', color: '#444' }
};