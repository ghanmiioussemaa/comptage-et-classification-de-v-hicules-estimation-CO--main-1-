import React from 'react'

export const CarIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm14 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const TruckIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 13h12v5H3z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 13V8h4l2 3v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 18v0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const BusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="6" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M7 16v2M17 16v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

export const MotoIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 15h3l2-3 4-1 3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="6" cy="17" r="1.6" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="17" cy="17" r="1.6" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)

export const VanIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="8" width="14" height="7" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M16 11h4v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="6" cy="16" r="1.2" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="18" cy="16" r="1.2" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)

export default null
