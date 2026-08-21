import React from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function PieChart({ labels = [], values = [] }) {
  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: ['#fb923c', '#06b6d4', '#7c3aed', '#10b981', '#f59e0b'],
        hoverOffset: 6,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: { legend: { position: 'right', labels: { color: '#9aa4ad' } } },
    maintainAspectRatio: false,
  }

  return <Pie data={data} options={options} />
}
