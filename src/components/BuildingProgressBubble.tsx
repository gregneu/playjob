import React from 'react'

interface BuildingProgressBubbleProps {
  total: number
  done: number
}

export const BuildingProgressBubble: React.FC<BuildingProgressBubbleProps> = ({ total, done }) => {
  const safeTotal = Math.max(total, 0)
  const clampedDone = Math.min(Math.max(done, 0), safeTotal)

  if (safeTotal <= 0) return null

  const progress = safeTotal === 0 ? 0 : clampedDone / safeTotal

  const outerSize = 30
  const ringWidth = 5
  const radius = outerSize / 2 - ringWidth / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)
  const innerDiameter = outerSize - ringWidth * 2

  return (
    <div
      style={{
        width: outerSize,
        height: outerSize,
        pointerEvents: 'none',
        position: 'relative'
      }}
    >
      <svg
        width={outerSize}
        height={outerSize}
        viewBox={`0 0 ${outerSize} ${outerSize}`}
        style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35))' }}
      >
        <defs>
          <linearGradient id="building-progress-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
        </defs>
        <circle
          cx={outerSize / 2}
          cy={outerSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(15, 23, 42, 0.3)"
          strokeWidth={ringWidth}
        />
        <circle
          cx={outerSize / 2}
          cy={outerSize / 2}
          r={radius}
          fill="none"
          stroke="url(#building-progress-green)"
          strokeWidth={ringWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 200ms ease-out' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: ringWidth,
          left: ringWidth,
          width: innerDiameter,
          height: innerDiameter,
          borderRadius: '50%',
          background: '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 600,
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.35)'
        }}
      >
        {safeTotal}
      </div>
    </div>
  )
}

export default BuildingProgressBubble
