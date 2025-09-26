import React from 'react'

interface CameraControlsProps {
  isVisible?: boolean
}

export const CameraControls: React.FC<CameraControlsProps> = ({ isVisible = true }) => {
  if (!isVisible) return null

  return (
    <div style={{
      position: 'absolute',
      bottom: '16px',
      left: '16px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 1000,
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        🎮 Camera Controls
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
        <div>
          <strong>Movement:</strong>
          <div>WASD / Arrows</div>
        </div>
        <div>
          <strong>Rotation:</strong>
          <div>Q / E</div>
        </div>
        <div>
          <strong>Zoom:</strong>
          <div>Mouse Wheel</div>
          <div>+ / -</div>
        </div>
        <div>
          <strong>View:</strong>
          <div>RTS Style</div>
          <div>45° Angle</div>
        </div>
        <div>
          <strong>Priority:</strong>
          <div>Color Borders</div>
          <div>1-5 Levels</div>
        </div>
      </div>
    </div>
  )
} 