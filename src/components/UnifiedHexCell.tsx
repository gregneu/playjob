import React, { useMemo, useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import Flag from './effects/Flag'
import { ZoneObjectComponent } from './buildings/BuildingComponents'
import { Html } from '@react-three/drei'
import { Stones, getStoneColorTint } from './Stones'
import { Trees, getTreeColorTint } from './Trees'
import BuildingProgressBubble from './BuildingProgressBubble'

export const HexCellState = {
  DEFAULT: 'default',
  EMPTY: 'empty',
  HOVER: 'hover',
  OCCUPIED: 'occupied',
  SELECTED: 'selected',
  ZONE: 'zone'
} as const

export type HexCellState = typeof HexCellState[keyof typeof HexCellState]

interface UnifiedHexCellProps {
  q: number
  r: number
  state: HexCellState
  color?: string
  zoneColor?: string
  isZoneCenter?: boolean
  cellType?: 'project-center' | 'building-slot' | 'hidden-slot'
  onClick?: (q: number, r: number, mousePosition?: { x: number; y: number }) => void
  onPointerEnter?: (q: number, r: number) => void
  onPointerLeave?: (q: number, r: number) => void
  showPlusIcon?: boolean
  hexSize?: number
  zoneObject?: {
    id: string
    type: 'story' | 'task' | 'bug' | 'test' | 'mountain' | 'castle' | 'house' | 'garden' | 'factory' | 'helipad'
    title: string
    description?: string
    status: string
    priority: string
    [key: string]: any
  } | null
  zoneName?: string // Имя зоны для отображения
  ticketCount?: number // Количество тикетов в зоне
  showStone?: boolean // Показывать ли камень на этой ячейке
  stoneSeed?: number // Seed для генерации камня
  stoneCount?: number // Количество камней в кластере (1-5)
  showTrees?: boolean // Показывать ли деревья на этой ячейке
  treeSeed?: number // Seed для генерации деревьев
  treeCount?: number // Количество деревьев в кластере (1-5)
  isDragTarget?: boolean // Подсвечивать ли здание при drag & drop
  isDragValid?: boolean // Валидное ли место для drop
  registerHoverTarget?: (key: string, mesh: THREE.Object3D) => void
  unregisterHoverTarget?: (key: string) => void
  sprintProgress?: { total: number; done: number } | undefined
}

// Конвертация hex-координат в мировые для сетки с ПЛОСКИМ верхом
const hexToWorldPosition = (q: number, r: number, hexSize: number = 1.0): [number, number, number] => {
  const x = hexSize * (3.0 / 2.0 * q)
  const z = hexSize * (Math.sqrt(3) / 2.0 * q + Math.sqrt(3) * r)
  return [x, 0, z]
}

const BEVEL_THICKNESS = 0.08;
const BEVEL_SIZE = 0.1;
// ИЗМЕНЕНИЕ: Добавляем коэффициент для создания зазора. 0.97 = 97% от исходного размера.
const HEX_SCALE_FACTOR = 0.97;

export const UnifiedHexCell: React.FC<UnifiedHexCellProps> = ({
  q,
  r,
  state,
  color,
  zoneColor,
  isZoneCenter = false,
  cellType = 'building-slot',
  onClick,
  onPointerEnter,
  onPointerLeave,
  showPlusIcon = false,
  hexSize = 2.0,
  zoneObject = null,
  zoneName,
  ticketCount = 0,
  showStone = false,
  stoneSeed = 0,
  stoneCount = 1,
  showTrees = false,
  treeSeed = 0,
  treeCount = 1,
  isDragTarget = false,
  isDragValid = false,
  registerHoverTarget,
  unregisterHoverTarget,
  sprintProgress,
}) => {
  console.log(`🏠 UnifiedHexCell [${q},${r}] rendering:`, {
    state,
    isZoneCenter,
    cellType,
    hasRegisterFunction: !!registerHoverTarget,
    hasUnregisterFunction: !!unregisterHoverTarget
  })
  const isSprintObject = Boolean(zoneObject && typeof zoneObject.type === 'string' && ['sprint', 'mountain'].includes(zoneObject.type.toLowerCase()))
  const meshRef = useRef<THREE.Mesh>(null!)
  const outlineRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)
  const [x, y, z] = hexToWorldPosition(q, r, hexSize)
  
  // Анимация для hover эффекта
  const [targetScale, setTargetScale] = useState(1)
  const [currentScale, setCurrentScale] = useState(1)
  
  // Регистрируем mesh для hover detection
  useEffect(() => {
    console.log(`🔧 UnifiedHexCell [${q},${r}]: useEffect triggered`, {
      hasMeshRef: !!meshRef.current,
      hasRegisterFunction: !!registerHoverTarget,
      hasUnregisterFunction: !!unregisterHoverTarget
    })
    
    if (meshRef.current && registerHoverTarget) {
      const key = `${q}_${r}`
      console.log(`🎯 UnifiedHexCell [${q},${r}]: Registering hover target with key:`, key)
      registerHoverTarget(key, meshRef.current)
      
      return () => {
        if (unregisterHoverTarget) {
          console.log(`🎯 UnifiedHexCell [${q},${r}]: Unregistering hover target with key:`, key)
          unregisterHoverTarget(key)
        }
      }
    } else {
      console.log(`❌ UnifiedHexCell [${q},${r}]: Cannot register - missing meshRef or registerHoverTarget`)
    }
  }, [q, r, registerHoverTarget, unregisterHoverTarget])
  
  // Обновляем визуальное состояние при drag
  useEffect(() => {
    if (isDragTarget) {
      setTargetScale(1.1)
    } else {
      setTargetScale(1)
    }
  }, [isDragTarget])
  
  // Плавная анимация масштаба и частиц
  useFrame((state, delta) => {
    if (currentScale !== targetScale) {
      const speed = 5
      const diff = targetScale - currentScale
      const step = diff * speed * delta
      
      if (Math.abs(diff) < 0.01) {
        setCurrentScale(targetScale)
      } else {
        setCurrentScale(currentScale + step)
      }
      
      if (meshRef.current) {
        meshRef.current.scale.setScalar(currentScale)
      }
      if (outlineRef.current) {
        outlineRef.current.scale.setScalar(currentScale * 1.05)
      }
    }
    
    // Анимация частиц для drag target
    if (isDragTarget && isDragValid && meshRef.current) {
      const time = state.clock.getElapsedTime()
      const particles = meshRef.current.parent?.children.filter(child => 
        child.userData.isParticle
      ) || []
      
      particles.forEach((particle, index) => {
        const angle = time * 2 + (index * Math.PI * 2) / 6
        particle.position.x = Math.cos(angle) * 1.5
        particle.position.z = Math.sin(angle) * 1.5
        particle.position.y = 0.1 + Math.sin(time * 4 + index) * 0.05
      })
    }
  })
  
  // Определяем цвет на основе состояния
  const getMaterialColor = () => {
    if (isDragTarget) {
      return isDragValid ? '#00ff88' : '#e0e0e0' // Убираем красный цвет
    }
    if (hovered) {
      return '#88ccff'
    }
    return zoneColor || color || '#e0e0e0'
  }
  
  // Определяем прозрачность
  const getOpacity = () => {
    if (isDragTarget) {
      return 0.9
    }
    if (hovered) {
      return 0.85
    }
    return 0.999 // Практически непрозрачно, но позволяет видеть hover эффекты
  }
  
  // Определяем дополнительные визуальные эффекты для hover
  const getHoverEffects = () => {
    const effects = {
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
      wireframe: false,
      roughness: 0.7,
      metalness: 0.1
    }
    
    if (isDragTarget) {
      if (isDragValid) {
        effects.emissive = new THREE.Color(0x00ff88)
        effects.emissiveIntensity = 0.3
        if (isZoneCenter) {
          effects.emissiveIntensity = 0.5
          effects.wireframe = true
        }
      }
      // Убираем красные эффекты для невалидных drop targets
    } else if (hovered) {
      effects.emissive = new THREE.Color(0x88ccff)
      effects.emissiveIntensity = 0.2
      
      if (isZoneCenter) {
        effects.emissiveIntensity = 0.3
        effects.roughness = 0.3
        effects.metalness = 0.3
      }
    }
    
    return effects
  }
  
  // Состояние для отслеживания hover на bubble и показа badge
  const [isBubbleHovered, setIsBubbleHovered] = useState(false)
  const [showZoneBadge, setShowZoneBadge] = useState(false)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Управление таймером для показа badge при hover на bubble
  useEffect(() => {
    if (isBubbleHovered) {
      // Очищаем предыдущий таймер
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
      
      // Устанавливаем новый таймер на 1 секунду
      hoverTimerRef.current = setTimeout(() => {
        setShowZoneBadge(true)
      }, 1000)
    } else {
      // При уходе с hover сразу скрываем badge и очищаем таймер
      setShowZoneBadge(false)
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = null
      }
    }

    // Очистка таймера при размонтировании компонента
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
    }
  }, [isBubbleHovered])

  // Удаляем неиспользуемую переменную cellColor

  const height = useMemo(() => {
    switch (state) {
      case HexCellState.SELECTED:
        return 0.15
      case HexCellState.ZONE:
        return 0.12
      case HexCellState.HOVER:
        return 0.11
      default:
        return 0.1
    }
  }, [state])
  
  const totalHeight = height + BEVEL_THICKNESS;

  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    
    // ИЗМЕНЕНИЕ: Умножаем радиус на наш коэффициент, чтобы уменьшить размер шестиугольника
    const radius = hexSize * HEX_SCALE_FACTOR;
    const sides = 6
    
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides
      const x_point = Math.cos(angle) * radius
      const y_point = Math.sin(angle) * radius
      
      if (i === 0) {
        shape.moveTo(x_point, y_point)
      } else {
        shape.lineTo(x_point, y_point)
      }
    }
    shape.closePath()
    
    const extrudeSettings = {
      depth: height,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelThickness: BEVEL_THICKNESS,
      bevelSize: BEVEL_SIZE,
    };

    const extrudeGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    extrudeGeometry.rotateX(-Math.PI / 2)
    
    return extrudeGeometry
  }, [hexSize, height])

  const material = useMemo(() => {
    const effects = getHoverEffects()
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(getMaterialColor()),
      emissive: effects.emissive,
      emissiveIntensity: effects.emissiveIntensity,
      metalness: effects.metalness,
      roughness: effects.roughness,
      transparent: true,
      opacity: getOpacity(),
      wireframe: effects.wireframe
    })
  }, [getMaterialColor, getOpacity, getHoverEffects])

  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      const effects = getHoverEffects()
      
      mat.color.set(getMaterialColor())
      mat.opacity = getOpacity()
      mat.emissive.copy(effects.emissive)
      mat.emissiveIntensity = effects.emissiveIntensity
      mat.metalness = effects.metalness
      mat.roughness = effects.roughness
      mat.wireframe = effects.wireframe
      mat.needsUpdate = true
    }
  }, [getMaterialColor, getOpacity, getHoverEffects])

  // Обработчики событий (без изменений)
  const handleClick = (event: any) => {
    event.stopPropagation()
    // Убеждаемся, что курсор остается pointer при клике
    document.body.style.cursor = 'pointer'
    if (onClick) {
      const mousePosition = {
        x: event.clientX || 0,
        y: event.clientY || 0
      }
      onClick(q, r, mousePosition)
    }
  }

  const handlePointerEnter = (event: any) => {
    event.stopPropagation()
    // Изменяем курсор мыши на hand только для центральных ячеек
    if (isZoneCenter) {
      console.log(`🖱️ Setting cursor to pointer for CENTRAL cell [${q}, ${r}]`)
      document.body.style.cursor = 'pointer'
      // Также устанавливаем курсор на canvas
      const canvas = document.querySelector('canvas')
      if (canvas) {
        canvas.style.cursor = 'pointer'
      }
    } else {
      console.log(`🖱️ Keeping default cursor for regular cell [${q}, ${r}]`)
    }
    if (onPointerEnter) {
      onPointerEnter(q, r)
    }
  }

  const handlePointerLeave = (event: any) => {
    event.stopPropagation()
    // Возвращаем курсор мыши в исходное состояние только если это была центральная ячейка
    if (isZoneCenter) {
      console.log(`🖱️ Setting cursor to default for CENTRAL cell [${q}, ${r}]`)
      document.body.style.cursor = 'default'
      // Также возвращаем курсор на canvas
      const canvas = document.querySelector('canvas')
      if (canvas) {
        canvas.style.cursor = 'default'
      }
    } else {
      console.log(`🖱️ No cursor change needed for regular cell [${q}, ${r}]`)
    }
    if (onPointerLeave) {
      onPointerLeave(q, r)
    }
  }

  return (
    <group position={[x, y, z]}>
      {/* Outline для hover эффекта */}
      {(isDragTarget || hovered) && (
        <mesh
          ref={outlineRef}
          position={[0, -0.01, 0]}
          rotation={[0, Math.PI / 6, 0]}
        >
          <cylinderGeometry args={[hexSize * 1.1, hexSize * 1.1, 0.05, 6]} />
          <meshStandardMaterial
            color={isDragValid ? '#00ff88' : isDragTarget ? '#22c55e' : '#ffffff'}
            transparent
            opacity={0.5}
            emissive={isDragValid ? '#00ff88' : isDragTarget ? '#22c55e' : '#ffffff'}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
      
      {/* Основной гексагон */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          handlePointerEnter(e)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
          handlePointerLeave(e)
        }}
        castShadow
        receiveShadow
        userData={{ 
          isBuilding: true,
          q, r,
          cellType: 'building-slot',
          isZoneCenter
        }}
      />
      
      {/* Убираем зеленый куб - оставляем только кольца и outline */}

      {/* Остальная часть компонента без изменений */}
      {showPlusIcon && (
        <mesh position={[0, totalHeight + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.3, 0.3]} />
          <meshBasicMaterial color="#4F46E5" transparent opacity={0.8} />
        </mesh>
      )}

      {isZoneCenter && (
        <group>
          <mesh position={[0, totalHeight + 0.02, 0]}>
            <sphereGeometry args={[0.1, 8, 6]} />
            <meshStandardMaterial color="#1F2937" />
          </mesh>
          {/* Отладочный бейдж для черного круглешка убран */}
        </group>
      )}

      {cellType === 'project-center' && q === 0 && r === 0 && (
        <Flag
          text={(window as any)?.currentProject?.name || 'PlayJoob'}
          position={[0, totalHeight + 0.1, 0]}
          rotationY={0}
          poleHeight={3.2}
          flagWidth={2.2}
          flagHeight={1.3}
          color={'#18181B'}
        />
      )}

      {/* Zone Object если есть */}
      {zoneObject && (
        <group position={[0, 0.2, 0]}>
          <ZoneObjectComponent
            type={zoneObject.type as any}
            status={zoneObject.status as 'open' | 'in_progress' | 'done'}
            isDragTarget={isDragTarget}
          />
        </group>
      )}

      {/* Bubble с количеством тикетов - по центру здания */}
      {isZoneCenter && ticketCount > 0 && !isSprintObject && (
        <Html position={[0, totalHeight + 1.5, 0]} center zIndexRange={[2050, 2000]}>
          <div 
            style={{
              background: '#3B82F6',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              minHeight: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              border: '2px solid white',
              pointerEvents: 'auto', // Включаем pointer events для hover
              zIndex: 10,
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={() => setIsBubbleHovered(true)}
            onMouseLeave={() => setIsBubbleHovered(false)}
          >
            {ticketCount}
          </div>
        </Html>
      )}

      {isZoneCenter && isSprintObject && sprintProgress && sprintProgress.total > 0 && (
        <Html position={[0, totalHeight + 1.5, 0]} center zIndexRange={[2050, 2000]}>
          <BuildingProgressBubble total={sprintProgress.total} done={sprintProgress.done} />
        </Html>
      )}

      {/* Плашка с именем зоны - показывается только при hover на bubble */}
      {isZoneCenter && zoneName && showZoneBadge && (
        <Html position={[1.2, totalHeight + 1.5, 0]} center zIndexRange={[2050, 2000]}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#1F2937',
            padding: '4px 8px',
            borderRadius: '8px',
            fontSize: '10px',
            fontFamily: 'Arial, sans-serif',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            border: '1px solid rgba(0,0,0,0.1)',
            zIndex: 10,
            opacity: showZoneBadge ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}>
            {zoneName}
          </div>
        </Html>
      )}

      {/* Рендеринг камней на ячейке зоны */}
      {showStone && (state === HexCellState.ZONE || state === HexCellState.HOVER) && !isZoneCenter && !zoneObject && (
        <Stones
          position={[0, 0, 0]}
          rotationY={stoneSeed * 0.5}
          scale={1.5}
          seed={stoneSeed}
          fitDiameter={0.4}
          colorTint={zoneColor ? getStoneColorTint(zoneColor) : undefined}
          tintStrength={0.2}
          stoneCount={stoneCount}
        />
      )}

      {/* Рендеринг деревьев на ячейке зоны */}
      {showTrees && (state === HexCellState.ZONE || state === HexCellState.HOVER) && !isZoneCenter && !zoneObject && (
        <Trees
          position={[0, 0, 0]}
          rotationY={treeSeed * 0.3}
          scale={1.2}
          seed={treeSeed}
          fitDiameter={1.0}
          colorTint={zoneColor ? getTreeColorTint(zoneColor) : undefined}
          tintStrength={0.3}
          treeCount={treeCount}
        />
      )}

      {/* Дополнительные визуальные эффекты для hover */}
      {(hovered || isDragTarget) && (
        <group>
          {/* Пульсирующее кольцо вокруг ячейки - только для валидных или обычного hover */}
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1000}>
            <ringGeometry args={[1.1, 1.2, 6]} />
            <meshBasicMaterial 
              color={isDragTarget ? (isDragValid ? '#00ff88' : '#88ccff') : '#88ccff'}
              transparent 
              opacity={isDragTarget ? 0.6 : 0.3}
              side={THREE.DoubleSide}
              depthTest={false}
            />
          </mesh>
          
          {/* Дополнительное кольцо для центральных зон */}
          {isZoneCenter && (
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1001}>
              <ringGeometry args={[1.3, 1.4, 6]} />
              <meshBasicMaterial 
                color={isDragTarget ? '#00ff88' : '#3b82f6'}
                transparent 
                opacity={0.4}
                side={THREE.DoubleSide}
                depthTest={false}
              />
            </mesh>
          )}
          
          {/* Частицы для привлечения внимания */}
          {isDragTarget && isDragValid && (
            <group>
              {[...Array(6)].map((_, i) => (
                <mesh 
                  key={i}
                  position={[
                    Math.cos((i * Math.PI * 2) / 6) * 1.5, 
                    0.1, 
                    Math.sin((i * Math.PI * 2) / 6) * 1.5
                  ]} 
                  renderOrder={1002}
                  userData={{ isParticle: true }}
                >
                  <sphereGeometry args={[0.05]} />
                  <meshBasicMaterial 
                    color="#00ff88" 
                    transparent 
                    opacity={0.8}
                    depthTest={false}
                  />
                </mesh>
              ))}
            </group>
          )}
          
          {/* Индикатор "можно дропнуть" */}
          {isDragTarget && isDragValid && (
            <Html position={[0, 2, 0]} center zIndexRange={[10, 0]}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(16, 185, 129, 0.9))',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                animation: 'dropZonePulse 1s ease-in-out infinite'
              }}>
                ✓ Drop here
              </div>
            </Html>
          )}
          
          {/* Убираем индикатор "нельзя дропнуть" */}
        </group>
      )}
    </group>
  )
}
