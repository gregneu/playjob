import React from 'react'

interface AssignmentBubbleProps {
  count: number
}

const clampCount = (value: number) => {
  if (value > 99) return '99+'
  return value.toString()
}

const AssignmentBubble: React.FC<AssignmentBubbleProps> = ({ count }) => {
  if (!count || count <= 0) return null

  const size = 26

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: count > 9 ? 10 : 12,
        color: '#FFFFFF',
        fontWeight: 700,
        border: '2px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 4px 12px rgba(249, 115, 22, 0.45)',
        pointerEvents: 'none',
        position: 'relative'
      }}
      title={`Assigned to you: ${count} ticket${count === 1 ? '' : 's'}`}
    >
      {clampCount(count)}
      <span
        style={{
          position: 'absolute',
          bottom: -6,
          right: -4,
          fontSize: 12
        }}
      >
        👤
      </span>
    </div>
  )
}

export default AssignmentBubble
