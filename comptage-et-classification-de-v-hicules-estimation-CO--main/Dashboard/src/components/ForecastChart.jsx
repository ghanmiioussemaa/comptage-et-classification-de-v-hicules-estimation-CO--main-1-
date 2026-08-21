import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function ForecastChart({ series }) {
  const labels = series.map(s => s.time)
  const data = {
    labels,
    datasets: [
      {
        label: 'Limite basse',
        data: series.map(s => s.low),
        borderColor: 'rgba(153,153,153,0.25)',
        pointRadius: 0,
        fill: false,
      },
      {
        label: 'Actuel',
        data: series.map(s => s.actual),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6,182,212,0.06)',
        tension: 0.3,
        pointRadius: 0,
      },
      {
        label: 'Prévision',
        data: series.map(s => s.forecast),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.06)',
        tension: 0.3,
        pointRadius: 0,
      },
      {
        label: 'Limite haute',
        data: series.map(s => s.high),
        borderColor: 'rgba(153,153,153,0.25)',
        pointRadius: 0,
        fill: '-3',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { left: 6, right: 6, top: 6, bottom: 40 } },
    scales: {
      x: { ticks: { color: '#9aa4ad', maxRotation: 0, autoSkip: true }, grid: { color: 'rgba(255,255,255,0.03)' } },
      y: { beginAtZero: true, ticks: { color: '#9aa4ad' }, grid: { color: 'rgba(255,255,255,0.03)' } },
    },
    plugins: {
      legend: { display: true, position: 'bottom', labels: { color: '#9aa4ad', usePointStyle: true, padding: 12 } },
      tooltip: { mode: 'index', intersect: false },
    },
  }

  return (
    <div style={{ height: 200 }}>
      <Line data={data} options={options} />
    </div>
  )
}
