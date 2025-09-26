import React from 'react'
import { BuildingType } from '../types/building'

console.log('BuildingType enum:', BuildingType)
console.log('BuildingType values:', Object.values(BuildingType))
console.log('BuildingType keys:', Object.keys(BuildingType))

interface BuildingPaletteProps {
  selectedBuildingType: BuildingType | null
  onBuildingSelect: (type: BuildingType) => void
  onClearSelection: () => void
}

const BUILDING_ICONS = {
  [BuildingType.HOUSE]: '🏠',
  [BuildingType.TREE]: '🌳',
  [BuildingType.FACTORY]: '🏭',
  [BuildingType.BUG]: '🐞'
}

const BUILDING_NAMES = {
  [BuildingType.HOUSE]: 'House',
  [BuildingType.TREE]: 'Tree',
  [BuildingType.FACTORY]: 'Factory',
  [BuildingType.BUG]: 'Bug'
}

export const BuildingPalette: React.FC<BuildingPaletteProps> = ({
  selectedBuildingType,
  onBuildingSelect,
  onClearSelection
}) => {
  console.log('BuildingPalette rendered with selectedBuildingType:', selectedBuildingType)
  const handleKeyPress = (event: KeyboardEvent) => {
    switch (event.key) {
      case '1':
        onBuildingSelect(BuildingType.HOUSE)
        break
      case '2':
        onBuildingSelect(BuildingType.TREE)
        break
      case '3':
        onBuildingSelect(BuildingType.FACTORY)
        break
      case '4':
        console.log('Key 4 pressed, selecting bug')
        onBuildingSelect('bug' as any)
        break
      case 'Escape':
        onClearSelection()
        break
    }
  }

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [onBuildingSelect, onClearSelection])

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      background: 'rgba(0,0,0,0.8)',
      padding: '15px',
      borderRadius: '8px',
      color: 'white',
      backdropFilter: 'blur(10px)',
      minWidth: '200px'
    }}>
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '10px',
        fontSize: '14px'
      }}>
        🏗️ Construction
      </div>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px' 
      }}>
        {/* Отладочная информация */}
        <div style={{ fontSize: '10px', opacity: 0.7 }}>
          Доступные типы: {Object.values(BuildingType).join(', ')}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.7 }}>
          Количество кнопок: {Object.values(BuildingType).length}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.7 }}>
          Enum keys: {Object.keys(BuildingType).join(', ')}
        </div>
        {/* Кнопка Дом */}
        <button
          key="house"
          onClick={() => {
            console.log('Clicked building type: house')
            onBuildingSelect(BuildingType.HOUSE)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            background: selectedBuildingType === BuildingType.HOUSE ? '#4CAF50' : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '16px' }}>🏠</span>
          <span>House</span>
          <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.7 }}>1</span>
        </button>

        {/* Кнопка Дерево */}
        <button
          key="tree"
          onClick={() => {
            console.log('Clicked building type: tree')
            onBuildingSelect(BuildingType.TREE)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            background: selectedBuildingType === BuildingType.TREE ? '#4CAF50' : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '16px' }}>🌳</span>
          <span>Tree</span>
          <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.7 }}>2</span>
        </button>

        {/* Кнопка Фабрика */}
        <button
          key="factory"
          onClick={() => {
            console.log('Clicked building type: factory')
            onBuildingSelect(BuildingType.FACTORY)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            background: selectedBuildingType === BuildingType.FACTORY ? '#4CAF50' : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '16px' }}>🏭</span>
          <span>Factory</span>
          <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.7 }}>3</span>
        </button>

        {/* Кнопка Жук */}
        <button
          key="bug"
          onClick={() => {
            console.log('Clicked building type: bug')
            onBuildingSelect('bug' as any)
          }}
          onMouseEnter={() => console.log('Mouse entered bug button')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            background: selectedBuildingType === 'bug' ? '#4CAF50' : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '16px' }}>🐞</span>
          <span>Bug</span>
          <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.7 }}>4</span>
        </button>
        
        {selectedBuildingType && (
          <button
            onClick={onClearSelection}
            style={{
              marginTop: '10px',
              padding: '6px 12px',
              background: 'rgba(255,0,0,0.3)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            ❌ Cancel Selection
          </button>
        )}
      </div>
      
      <div style={{ 
        marginTop: '10px', 
        fontSize: '10px', 
        opacity: 0.7,
        borderTop: '1px solid rgba(255,255,255,0.2)',
        paddingTop: '8px'
      }}>
        <div>⌨️ Hotkeys: 1, 2, 3, 4</div>
        <div>🖱️ Click on cell to place</div>
        <div>❌ Escape or right-click to cancel</div>
      </div>
    </div>
  )
} 