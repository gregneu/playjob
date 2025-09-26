import React from 'react'
import { BuildingType } from '../types/building'
import { GlassPanel } from './GlassPanel'

interface LandscapeToolProps {
  selectedLandscapeType: BuildingType | null
  onLandscapeSelect: (type: BuildingType) => void
  onClearSelection: () => void
}

export const LandscapeTool: React.FC<LandscapeToolProps> = ({
  selectedLandscapeType,
  onLandscapeSelect,
  onClearSelection
}) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: '16px',
      left: '16px',
      zIndex: 100,
      minWidth: '200px'
    }}>
      <GlassPanel>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
          🏔️ Landscape
        </h3>
      
      {/* Горы */}
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '500', color: '#CCC' }}>
                      🏔️ Mountains
        </h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onLandscapeSelect(BuildingType.MOUNTAIN)}
            style={{
              padding: '12px 16px',
              background: selectedLandscapeType === BuildingType.MOUNTAIN ? '#4ECDC4' : 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              minWidth: '50px',
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            🏔️
          </button>
          <button
            onClick={() => onLandscapeSelect(BuildingType.MOUNTAIN)}
            style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              minWidth: '50px',
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ⛰️
          </button>
          <button
            onClick={() => onLandscapeSelect(BuildingType.VOLCANO)}
            style={{
              padding: '12px 16px',
              background: selectedLandscapeType === BuildingType.VOLCANO ? '#4ECDC4' : 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              minWidth: '50px',
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            🗻
          </button>
        </div>
      </div>

      {/* Вода */}
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '500', color: '#CCC' }}>
          💧 Water
        </h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onLandscapeSelect(BuildingType.MOUNTAIN)}
            style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              minWidth: '50px',
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            🌊
          </button>
          <button
            onClick={() => onLandscapeSelect(BuildingType.LAKE)}
            style={{
              padding: '12px 16px',
              background: selectedLandscapeType === BuildingType.LAKE ? '#4ECDC4' : 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              minWidth: '50px',
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            🏞️
          </button>
          <button
            onClick={() => onLandscapeSelect(BuildingType.MOUNTAIN)}
            style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              minWidth: '50px',
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            🌊
          </button>
        </div>
      </div>

      {/* Поля и луга */}
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '500', color: '#CCC' }}>
          🌾 Fields & Meadows
        </h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onLandscapeSelect(BuildingType.MOUNTAIN)}
            style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              minWidth: '50px',
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            🌾
          </button>
          <button
            onClick={() => onLandscapeSelect(BuildingType.MOUNTAIN)}
            style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              minWidth: '50px',
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            🌿
          </button>
          <button
            onClick={() => onLandscapeSelect(BuildingType.MOUNTAIN)}
            style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              minWidth: '50px',
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            🌻
          </button>
        </div>
      </div>
      </GlassPanel>
    </div>
  )
} 