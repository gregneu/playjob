import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { ZoneObjectComponent } from './buildings/BuildingComponents'
import { HEX_SIZE } from '../types/building'

// Типы зданий с описаниями
const buildingTypes = [
  { type: 'mountain', name: 'Mountain (Sprint)', description: 'Пирамида для спринтов' },
  { type: 'castle', name: 'Castle (Hub)', description: 'Башня для хаба' },
  { type: 'house', name: 'House (Meet)', description: 'Домик для встреч' },
  { type: 'garden', name: 'Garden (Refinement)', description: 'Дерево для рефайнмента' },
  { type: 'factory', name: 'Factory (QA)', description: 'Фабрика для тестирования' },
  { type: 'helipad', name: 'Helipad (Development)', description: 'Площадка для разработки' },
  { type: 'task', name: 'Task', description: 'Куб для задач' },
  { type: 'test', name: 'Test', description: 'Сфера для тестов' },
  { type: 'tree', name: 'Tree (Nature)', description: 'Разные виды деревьев с вариациями' },
  { type: 'fluffy_tree', name: 'Fluffy Tree (Shader)', description: 'Пышное дерево с кастомными шейдерами и billboarding' },
  { type: 'low_poly_tree', name: 'Low-poly Tree', description: 'Минималистичное дерево в стиле low-poly' }
] as const

// Статусы зданий
const statuses = [
  { status: 'open', name: 'Open', color: '#FF6B6B' },
  { status: 'in_progress', name: 'In Progress', color: '#4ECDC4' },
  { status: 'done', name: 'Done', color: '#45B7D1' }
] as const

// Компонент для отображения одного здания
const BuildingPreview: React.FC<{
  type: typeof buildingTypes[number]['type']
  status: typeof statuses[number]['status']
  position: [number, number, number]
  seed?: number
}> = ({ type, status, position, seed }) => {
  return (
    <group position={position}>
      {/* Основание для здания */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      
      {/* Само здание */}
      <ZoneObjectComponent type={type} status={status} seed={seed} />
      
      {/* Подпись под зданием */}
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 0.3]} />
        <meshBasicMaterial color="rgba(0,0,0,0.7)" transparent />
      </mesh>
    </group>
  )
}

// Основной компонент страницы
export const BuildingShowcase: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [selectedType, setSelectedType] = useState<typeof buildingTypes[number]['type']>('mountain')
  const [selectedStatus, setSelectedStatus] = useState<typeof statuses[number]['status']>('open')

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Боковая панель с настройками */}
      <div style={{
        width: '300px',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '20px',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                padding: '8px 12px',
                background: '#6B7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ← Back
            </button>
          )}
          <h1 style={{ 
            margin: '0', 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: '#333'
          }}>
            🏗️ Building Showcase
          </h1>
        </div>
        
        {/* Выбор типа здания */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#555' }}>Building Type</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {buildingTypes.map((building) => (
              <button
                key={building.type}
                onClick={() => setSelectedType(building.type)}
                style={{
                  padding: '12px',
                  border: selectedType === building.type ? '2px solid #667eea' : '1px solid #ddd',
                  borderRadius: '8px',
                  background: selectedType === building.type ? '#f0f4ff' : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#333' }}>
                  {building.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {building.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Выбор статуса */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#555' }}>Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {statuses.map((status) => (
              <button
                key={status.status}
                onClick={() => setSelectedStatus(status.status)}
                style={{
                  padding: '12px',
                  border: selectedStatus === status.status ? '2px solid #667eea' : '1px solid #ddd',
                  borderRadius: '8px',
                  background: selectedStatus === status.status ? '#f0f4ff' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: status.color
                }} />
                <span style={{ fontWeight: 'bold', color: '#333' }}>
                  {status.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Информация о выбранном здании */}
        <div style={{
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Current Selection</h4>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <div><strong>Type:</strong> {buildingTypes.find(b => b.type === selectedType)?.name}</div>
            <div><strong>Status:</strong> {statuses.find(s => s.status === selectedStatus)?.name}</div>
            <div><strong>Color:</strong> 
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: statuses.find(s => s.status === selectedStatus)?.color,
                marginLeft: '8px'
              }} />
            </div>
            {selectedType === 'tree' && (
              <div style={{ marginTop: '10px', padding: '10px', background: '#e8f5e8', borderRadius: '6px' }}>
                <div style={{ fontWeight: 'bold', color: '#2d5a2d', marginBottom: '5px' }}>🌳 Tree (Nature) Features:</div>
                <div style={{ fontSize: '12px', color: '#2d5a2d' }}>
                  • Вариации цветов на основе seed<br/>
                  • Разные размеры (0.8-1.2x)<br/>
                  • Уникальная анимация ветра<br/>
                  • Оливково-зеленый базовый цвет<br/>
                  • Детерминированная случайность
                </div>
              </div>
            )}
            {selectedType === 'fluffy_tree' && (
              <div style={{ marginTop: '10px', padding: '10px', background: '#e6f7ff', borderRadius: '6px' }}>
                <div style={{ fontWeight: 'bold', color: '#1890ff', marginBottom: '5px' }}>🌿 Fluffy Tree Features:</div>
                <div style={{ fontSize: '12px', color: '#1890ff' }}>
                  • Кастомные GLSL шейдеры<br/>
                  • Billboarding эффект<br/>
                  • Пышная листва<br/>
                  • Анимация ветра в реальном времени<br/>
                  • three-custom-shader-material
                </div>
              </div>
            )}
            {selectedType === 'low_poly_tree' && (
              <div style={{ marginTop: '10px', padding: '10px', background: '#fff3e0', borderRadius: '6px' }}>
                <div style={{ fontWeight: 'bold', color: '#f57c00', marginBottom: '5px' }}>🔺 Low-poly Tree Features:</div>
                <div style={{ fontSize: '12px', color: '#f57c00' }}>
                  • Кастомная геометрия с множеством полигонов<br/>
                  • Органичные деформации без дырок<br/>
                  • flatShading для четких граней<br/>
                  • Яркие насыщенные цвета<br/>
                  • Асимметричная форма кроны<br/>
                  • Мягкая анимация ветра
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Инструкции */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#e3f2fd',
          borderRadius: '8px',
          border: '1px solid #bbdefb'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>Controls</h4>
          <div style={{ fontSize: '12px', color: '#1976d2' }}>
            • Mouse: Rotate view<br/>
            • Scroll: Zoom in/out<br/>
            • Right click + drag: Pan
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas
          shadows={{ type: 'PCFSoftShadowMap' }}
          camera={{ position: [0, 5, 8], fov: 45 }}
        >
          {/* Профессиональное освещение */}
          <ambientLight intensity={0.5} />
          <hemisphereLight 
            color={'#a8d8ff'}
            groundColor={'#b5a99a'}
            intensity={0.6} 
          />
          <directionalLight
            castShadow
            position={[-25, 30, 10]}
            intensity={2.5}
            color={'#FFDEB5'}
            shadow-mapSize-width={4096}
            shadow-mapSize-height={4096}
            shadow-camera-near={0.5}
            shadow-camera-far={100}
            shadow-camera-left={-25}
            shadow-camera-right={25}
            shadow-camera-top={25}
            shadow-camera-bottom={-25}
            shadow-bias={-0.0005}
          />
          <directionalLight
            position={[10, 20, -20]}
            intensity={0.75}
            color={'#cceaff'}
          />

          {/* Окружение */}
          <Environment preset="sunset" />

          {/* Управление камерой */}
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={20}
          />

          {/* Выбранное здание в центре */}
          <BuildingPreview 
            type={selectedType} 
            status={selectedStatus} 
            position={[0, 0, 0]}
            seed={['tree', 'low_poly_tree'].includes(selectedType) ? Math.random() : undefined}
          />

          {/* Все типы зданий в сетке для сравнения */}
          {buildingTypes.map((building, index) => {
            const row = Math.floor(index / 4)
            const col = index % 4
            const x = (col - 1.5) * 3
            const z = (row - 1) * 3
            
            return (
              <BuildingPreview
                key={building.type}
                type={building.type}
                status="open"
                position={[x, 0, z]}
                seed={['tree', 'low_poly_tree'].includes(building.type) ? index : undefined}
              />
            )
          })}
        </Canvas>

        {/* Overlay с информацией */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
            {buildingTypes.find(b => b.type === selectedType)?.name}
          </h3>
          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
            {buildingTypes.find(b => b.type === selectedType)?.description}
          </p>
        </div>
      </div>
    </div>
  )
}

export default BuildingShowcase
