import React, { useMemo, useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import Flag from './effects/Flag'
import { ZoneObjectComponent } from './buildings/BuildingComponents'
import { Html } from '@react-three/drei'
import { Stones, getStoneColorTint } from './Stones'
import { Trees, getTreeColorTint } from './Trees'
import BuildingProgressBubble from './BuildingProgressBubble'
import { MeetingBadge } from './MeetingBadge'

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
  commentCount?: number // Количество комментариев в тикетах здания
  hasMentions?: boolean // Есть ли упоминания текущего пользователя в комментариях
  assignmentCount?: number // Количество назначенных текущему пользователю тикетов
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
  energyPulse?: 'source' | 'target' | null
  energyPulseKey?: string | number
  energyPulseColor?: string | null
  ticketBadgeAnimation?: 'gain' | 'lose' | null
  ticketBadgeAnimationKey?: string | number
  // Meeting participants props
  meetingParticipants?: Array<{
    id: string
    name: string
    avatarUrl?: string
    avatarConfig?: any
    userId?: string
  }>
  onMeetingClick?: () => void
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
  commentCount = 0,
  hasMentions = false,
  assignmentCount = 0,
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
  energyPulse = null,
  energyPulseKey,
  energyPulseColor = null,
  ticketBadgeAnimation = null,
  ticketBadgeAnimationKey,
  meetingParticipants = [],
  onMeetingClick,
}) => {
  // Removed excessive logging - this was called on every render for every cell
  const isSprintObject = Boolean(zoneObject && typeof zoneObject.type === 'string' && ['sprint', 'mountain'].includes(zoneObject.type.toLowerCase()))
  const meshRef = useRef<THREE.Mesh>(null!)
  const outlineRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)
  const [x, y, z] = hexToWorldPosition(q, r, hexSize)
  
  // Анимация для hover эффекта
  const [targetScale, setTargetScale] = useState(1)
  const [currentScale, setCurrentScale] = useState(1)
  const [activeAura, setActiveAura] = useState<{ type: 'source' | 'target'; startedAt: number; key?: string | number; color: string } | null>(null)
  const auraMeshRef = useRef<THREE.Mesh>(null)
  const auraMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const lastPulseKeyRef = useRef<string | number | null>(null)
  const AURA_DURATION = 1.25
  const badgeClassName = useMemo(() => {
    const classes = ['ticket-badge']
    if (ticketBadgeAnimation === 'gain') classes.push('ticket-badge--gain')
    if (ticketBadgeAnimation === 'lose') classes.push('ticket-badge--lose')
    return classes.join(' ')
  }, [ticketBadgeAnimation])
  const badgeDomKey = ticketBadgeAnimationKey != null ? `badge-${ticketBadgeAnimationKey}` : 'badge-default'
  // Check if this is a Meet building first
  const isMeetBuilding = useMemo(() => {
    if (!zoneObject) return false
    const title = zoneObject.title?.toLowerCase() || ''
    const description = zoneObject.description?.toLowerCase() || ''
    const isMeet = title.includes('meet') || description.includes('meet') || 
                   title.includes('meeting') || description.includes('meeting')
    
    // Debug logging
    if (isMeet) {
      console.log('🏢 UnifiedHexCell: Meet building detected:', {
        buildingId: zoneObject.id,
        title: zoneObject.title,
        description: zoneObject.description,
        isMeet
      })
    }
    
    return isMeet
  }, [zoneObject])
  
  // Don't show ticket bubble for Meet buildings
  const showTicketBubble = ticketCount > 0 && !isMeetBuilding
  const showCommentNotification = commentCount > 0
  const showAssignmentNotification = (assignmentCount ?? 0) > 0
  const notificationItems: Array<{ key: string; icon: string; count: number; showCount: boolean; animationClass: string }> = useMemo(() => {
    const items: Array<{ key: string; icon: string; count: number; showCount: boolean; animationClass: string }> = []
    if (showCommentNotification) {
      const safeCount = typeof commentCount === 'number' ? commentCount : 0
      items.push({
        key: 'comments',
        icon: '/icons/stash_comments-solid.svg',
        count: safeCount,
        showCount: safeCount > 1,
        animationClass: 'notification-icon--comment'
      })
    }
    if (showAssignmentNotification) {
      const safeCount = typeof assignmentCount === 'number' ? assignmentCount : 0
      items.push({
        key: 'assignments',
        icon: '/icons/my_new_ticket.svg',
        count: safeCount,
        showCount: safeCount > 1,
        animationClass: 'notification-icon--assignment'
      })
    }
    return items
  }, [showCommentNotification, showAssignmentNotification, commentCount, assignmentCount])
  const showNotificationPanel = notificationItems.length > 0
  
  const showMeetingBadge = isMeetBuilding && meetingParticipants && meetingParticipants.length > 0
  
  // Debug logging for meeting badge
  if (isMeetBuilding) {
    console.log('👥 UnifiedHexCell: Meeting badge check:', {
      buildingId: zoneObject?.id,
      isMeetBuilding,
      participantsCount: meetingParticipants?.length || 0,
      showMeetingBadge
    })
  }

  const notificationStyleTag = useMemo(() => (
    `<style>
      .notification-icon {
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));
        transform-origin: center;
      }
      .notification-icon--comment {
        animation: notification-comment-pulse 1.8s ease-in-out infinite;
      }
      .notification-icon--assignment {
        animation: notification-assignment-pulse 1.8s ease-in-out infinite;
        animation-delay: 0.4s;
      }
      @keyframes notification-comment-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.32); opacity: 0.78; }
      }
      @keyframes notification-assignment-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.32); opacity: 0.78; }
      }
      .notification-panel {
        position: relative;
        overflow: visible;
      }
      .notification-panel::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 40px;
        background: radial-gradient(circle, rgba(68, 132, 255, 0.55) 0%, rgba(68, 132, 255, 0) 70%);
        opacity: 0;
        animation: notification-panel-wave 2.4s ease-out infinite;
      }
      .notification-panel::after {
        content: '';
        position: absolute;
        inset: -9px;
        border-radius: 44px;
        border: 2px solid rgba(68, 132, 255, 0.5);
        opacity: 0;
        animation: notification-panel-wave 2.4s ease-out infinite;
        animation-delay: 0.4s;
      }
      @keyframes notification-panel-wave {
        0% { opacity: 0; transform: scale(0.9); }
        18% { opacity: 0.7; transform: scale(1); }
        62% { opacity: 0.25; transform: scale(1.12); }
        100% { opacity: 0; transform: scale(1.18); }
      }
    </style>`
  ), [])

  useEffect(() => {
    if (isZoneCenter) {
      console.log('[UnifiedHexCell] badge flags', JSON.stringify({
        q,
        r,
        zoneObjectId: zoneObject?.id ?? null,
        ticketCount,
        commentCount,
        hasMentions,
        assignmentCount,
        showTicketBubble,
        showCommentNotification,
        showAssignmentNotification,
        showNotificationPanel
      }, null, 2))
    }
  }, [
    isZoneCenter,
    q,
    r,
    zoneObject?.id,
    ticketCount,
    commentCount,
    hasMentions,
    assignmentCount,
    showTicketBubble,
    showCommentNotification,
    showAssignmentNotification,
    showNotificationPanel
  ])
  
  // Регистрируем mesh для hover detection
  useEffect(() => {
    // Removed excessive logging - this was called for every cell on every render
    
    if (meshRef.current && registerHoverTarget) {
      const key = `${q}_${r}`
      // Removed excessive logging - this was called for every cell on every render
      registerHoverTarget(key, meshRef.current)
      
      return () => {
        if (unregisterHoverTarget) {
          // Removed excessive logging - this was called for every cell cleanup
          unregisterHoverTarget(key)
        }
      }
    } else {
      // Removed excessive logging - this was called for every cell without proper setup
    }
  }, [q, r, registerHoverTarget, unregisterHoverTarget])
  
  useEffect(() => {
    if (auraMeshRef.current) {
      auraMeshRef.current.visible = false
    }
    if (auraMaterialRef.current) {
      auraMaterialRef.current.opacity = 0
    }
  }, [])
  
  // Обновляем визуальное состояние при drag
  useEffect(() => {
    if (isDragTarget) {
      setTargetScale(1.1)
    } else {
      setTargetScale(1)
    }
  }, [isDragTarget])

  useEffect(() => {
    if (!energyPulse) return
    const pulseKey = energyPulseKey ?? `${energyPulse}-${performance.now()}`
    if (lastPulseKeyRef.current === pulseKey) return
    lastPulseKeyRef.current = pulseKey

    const startedAt = performance.now() / 1000
    const fallbackColor = energyPulse === 'source' ? '#38bdf8' : '#f59e0b'
    const auraColor = energyPulseColor ?? fallbackColor
    setActiveAura({ type: energyPulse, startedAt, key: pulseKey, color: auraColor })

    if (auraMaterialRef.current) {
      auraMaterialRef.current.color.set(auraColor)
      auraMaterialRef.current.opacity = energyPulse === 'source' ? 0.45 : 0.38
    }
    if (auraMeshRef.current) {
      auraMeshRef.current.visible = true
      auraMeshRef.current.scale.setScalar(0.8)
    }
  }, [energyPulse, energyPulseKey])

  useEffect(() => {
    if (!activeAura && auraMeshRef.current) {
      auraMeshRef.current.visible = false
    }
    if (!activeAura && auraMaterialRef.current) {
      auraMaterialRef.current.opacity = 0
    }
  }, [activeAura])
  
  // Плавная анимация масштаба и частиц
  useFrame((state, delta) => {
    const now = performance.now() / 1000

    let desiredScale = targetScale
    if (activeAura) {
      const auraElapsed = now - activeAura.startedAt
      if (auraElapsed >= AURA_DURATION) {
        setActiveAura(null)
      } else {
        const wave = 1 + Math.sin(auraElapsed * 8.5) * 0.04
        desiredScale = Math.max(desiredScale, 1.04 * wave)

        if (auraMeshRef.current && auraMaterialRef.current) {
          const progress = Math.min(1, auraElapsed / AURA_DURATION)
          const scale = THREE.MathUtils.lerp(0.85, 2.35, progress)
          auraMeshRef.current.scale.setScalar(scale)
          auraMeshRef.current.position.y = 0.06 + Math.sin(auraElapsed * 6.0) * 0.05
          auraMeshRef.current.rotation.z = auraElapsed * (activeAura.type === 'source' ? 2.4 : -2.0)
          const baseOpacity = activeAura.type === 'source' ? 0.45 : 0.35
          auraMaterialRef.current.color.set(activeAura.color)
          auraMaterialRef.current.opacity = baseOpacity * (1 - progress)
        }
      }
    }

    if (currentScale !== desiredScale) {
      const speed = 5
      const diff = desiredScale - currentScale
      const step = diff * speed * delta
      
      if (Math.abs(diff) < 0.01) {
        setCurrentScale(desiredScale)
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

      {activeAura && (
        <pointLight
          position={[0, 1.6, 0]}
          intensity={activeAura.type === 'source' ? 1.3 : 1.0}
          distance={5}
          decay={2.4}
          color={activeAura.color}
        />
      )}

      <mesh
        ref={auraMeshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        visible={Boolean(activeAura)}
      >
        <ringGeometry args={[0.45, 1.1, 64]} />
        <meshBasicMaterial
          ref={auraMaterialRef}
          color="#38bdf8"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

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

      {/* Bubble с уведомлениями и количеством тикетов - по центру здания */}
      {isZoneCenter && !isSprintObject && (showTicketBubble || showNotificationPanel) && (
        <Html key={badgeDomKey} position={[0, totalHeight + 1.5, 0]} center zIndexRange={[2050, 2000]}>
          <div
            style={{
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {showTicketBubble && (
              <div 
                className={badgeClassName}
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
                  pointerEvents: 'auto',
                  zIndex: 10,
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setIsBubbleHovered(true)}
                onMouseLeave={() => setIsBubbleHovered(false)}
              >
                {ticketCount}
              </div>
            )}
            {showNotificationPanel && (
              <>
                <span
                  dangerouslySetInnerHTML={{ __html: notificationStyleTag }}
                  style={{ display: 'none' }}
                />
                <div
                  className="notification-panel"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: 'rgba(27, 27, 36, 0.86)',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 600,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    pointerEvents: 'auto',
                    zIndex: 10,
                    height: '24px',
                    lineHeight: 1
                  }}
                >
                  {notificationItems.map(item => (
                    <div
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: item.showCount ? 4 : 0
                      }}
                    >
                      <img
                        src={item.icon}
                        alt={item.key}
                        style={{ width: 14, height: 14 }}
                        className={`notification-icon ${item.animationClass}`}
                      />
                      {item.showCount && <span>{item.count}</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Html>
      )}

      {isZoneCenter && isSprintObject && ((sprintProgress && sprintProgress.total > 0) || showNotificationPanel) && (
        <Html position={[0, totalHeight + 1.5, 0]} center zIndexRange={[2050, 2000]}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {sprintProgress && sprintProgress.total > 0 && (
              <BuildingProgressBubble total={sprintProgress.total} done={sprintProgress.done} />
            )}
            {showNotificationPanel && (
              <>
                <span
                  dangerouslySetInnerHTML={{ __html: notificationStyleTag }}
                  style={{ display: 'none' }}
                />
                <div
                  className="notification-panel"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: 'rgba(27, 27, 36, 0.86)',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 600,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    pointerEvents: 'auto',
                    zIndex: 10,
                    height: '24px',
                    lineHeight: 1
                  }}
                >
                  {notificationItems.map(item => (
                    <div
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: item.showCount ? 4 : 0
                      }}
                    >
                      <img
                        src={item.icon}
                        alt={item.key}
                        style={{ width: 14, height: 14 }}
                        className={`notification-icon ${item.animationClass}`}
                      />
                      {item.showCount && <span>{item.count}</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Html>
      )}

      {/* Meeting Badge - показывается для любых Meet зданий, не только центральных */}
      {showMeetingBadge && (
        <Html position={[0, totalHeight + 1.5, 0]} center zIndexRange={[2050, 2000]}>
          <MeetingBadge
            participants={meetingParticipants}
            onClick={onMeetingClick}
          />
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
