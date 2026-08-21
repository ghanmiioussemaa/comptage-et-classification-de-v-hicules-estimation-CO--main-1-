import React from 'react'

export default function Card({ title, value, sub, small, trend, icon, iconBg }) {
  return (
    <div className={"card" + (small ? ' small' : '')}>
      <div className="card-top">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {icon && (
            <div className="icon-pill" style={{background: iconBg || 'rgba(255,255,255,0.04)'}}>
              <div className="icon-inner" style={{color:'#fff'}}>{icon}</div>
            </div>
          )}
          <div className="card-title">{title}</div>
        </div>
        {trend && <div className={`trend ${trend}`}>{trend === 'down' ? '↓' : '↑'}</div>}
      </div>
      <div className="card-value">{value}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </div>
  )
}
