import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend)

export default function ClassificationChart({ data, showCo2 = true }) {
  const datasets = [
    {
      type: 'bar',
      label: 'Nombre de véhicules',
      data: data.vehicleCounts,
      backgroundColor: '#06b6d4',
      yAxisID: 'y',
    },
  ]

  if (showCo2) {
    datasets.push({
      type: 'line',
      label: '',
      data: data.co2ByType,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
      tension: 0.3,
      yAxisID: 'y1',
    })
  }

  const chartData = { labels: data.labels, datasets }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { left: 6, right: 6, top: 6, bottom: 6 } },
    scales: {
      x: { ticks: { color: '#9aa4ad' }, grid: { color: 'rgba(255,255,255,0.03)' } },
      y: { beginAtZero: true, position: 'left', ticks: { color: '#9aa4ad' }, grid: { color: 'rgba(255,255,255,0.03)' } },
      y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { color: '#9aa4ad' } },
    },
    plugins: { legend: { labels: { color: '#9aa4ad' } } },
  }

  return (
    <div style={{ height: 220 }}>
      <Chart type="bar" data={chartData} options={options} />
    </div>
  )
}
