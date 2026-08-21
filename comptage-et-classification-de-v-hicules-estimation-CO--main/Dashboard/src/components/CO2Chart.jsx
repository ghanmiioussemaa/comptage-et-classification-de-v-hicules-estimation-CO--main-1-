import React, { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

/**
 * Parse "HH:MM:SS" or "MM:SS" into total seconds.
 */
function parseTimeToSeconds(time) {
  const parts = time.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

/**
 * Format a time string to "HH:MM".
 */
function formatToHHMM(time) {
  const parts = time.split(':').map(Number)
  if (parts.length === 3) {
    return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`
  }
  const hh = new Date().getHours()
  return `${String(hh).padStart(2, '0')}:${String(parts[0]).padStart(2, '0')}`
}

export default function CO2Chart({ series = [] }) {

  /**
   * Build the set of indices that fall on a 5-minute boundary.
   * The LAST index always gets the special "🔴 Maintenant" label.
   */
  const { tickIndices, lastIndex } = useMemo(() => {
    const indices = new Set()
    if (!series.length) return { tickIndices: indices, lastIndex: -1 }

    let lastTickSeconds = null

    series.forEach(({ time }, i) => {
      const secs = parseTimeToSeconds(time)
      if (lastTickSeconds === null || secs - lastTickSeconds >= 5 * 60) {
        indices.add(i)
        lastTickSeconds = secs
      }
    })

    return { tickIndices: indices, lastIndex: series.length - 1 }
  }, [series])

  const labels = series.map(s => s.time)

  const data = {
    labels,
    datasets: [
      {
        label: 'CO2 (kg)',
        data: series.map(s => s.co2),
        borderColor: '#ff6b4a',
        backgroundColor: 'rgba(255,107,74,0.08)',
        tension: 0.3,
        yAxisID: 'y',
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Véhicules',
        data: series.map(s => s.vehicles),
        borderColor: '#14b8a6',
        backgroundColor: 'rgba(20,184,166,0.08)',
        tension: 0.3,
        yAxisID: 'y1',
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  }

  const options = {
    responsive: true,
    animation: false,
    plugins: {
      legend: { labels: { color: '#9aa4ad', font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false },
    },
    layout: { padding: { left: 6, right: 6, top: 6, bottom: 6 } },
    scales: {
      x: {
        ticks: {
          
          maxRotation: 0,
          autoSkip: false,
          font: (ctx) => {
            // Bold + colored for the "now" tick
            const isNow = ctx.index === lastIndex
            return {
              size: isNow ? 12 : 11,
              weight: isNow ? 'bold' : 'normal',
            }
          },
          callback: function (tickValue, index) {
            // Always show "now" label on the last data point
            if (index === lastIndex) return '🔴 Maintenant'
            // Show HH:MM on 5-minute boundaries
            if (tickIndices.has(index)) return formatToHHMM(labels[index])
            // Hide everything else
            return ''
          },
          color: function (ctx) {
            // Red for "now", muted grey for regular ticks
            return ctx.index === lastIndex ? '#ff4444' : '#9aa4ad'
          },
        },
        grid: { color: 'rgba(255,255,255,0.03)' },
      },
      y: {
        position: 'left',
        min: 0,
        ticks: { color: '#9aa4ad' },
        grid: { color: 'rgba(255,255,255,0.03)' },
        title: {
          display: true,
          text: 'CO₂ (kg)',
          color: '#ff6b4a',
          font: { size: 11 },
        },
      },
      y1: {
        position: 'right',
        grid: { display: false },
        ticks: { color: '#9aa4ad' },
        title: {
          display: true,
          text: 'Véhicules',
          color: '#14b8a6',
          font: { size: 11 },
        },
      },
    },
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#eee' }}>
        CO2 en temps réel
      </div>
      <Line data={data} options={options} />
    </div>
  )
}