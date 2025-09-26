import React, { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { ZoneObjectComponent } from './buildings/BuildingComponents'
import Flag from './effects/Flag'
import { Vegetation } from './Vegetation'
import { getCellColorByCategory } from '../types/cellCategories'

// Функция для затемнения цвета
const darkenColor = (color: string, factor: number): string => {
  // Убираем # если есть
  const hex = color.replace('#', '')
  
  // Конвертируем в RGB
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Затемняем
  const newR = Math.floor(r * (1 - factor))
  const newG = Math.floor(g * (1 - factor))
  const newB = Math.floor(b * (1 - factor))
  
  // Конвертируем обратно в hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

// Компонент пульсирующего border для выбранных зданий - ВРЕМЕННО ОТКЛЮЧЕНО
/* const PulsingBorder: React.FC<{ zoneColor?: string }> = ({ zoneColor }) => {
  const ringRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  
  // Определяем цвет кольца
  const ringColor = zoneColor ? darkenColor(zoneColor, 0.3) : '#22c55e'
  
  useFrame((state) => {
    if (ringRef.current && materialRef.current) {
      const time = state.clock.getElapsedTime()
      const pulse = Math.sin(time * 3) * 0.3 + 0.7 // Пульсация от 0.4 до 1.0
      const scale = 1 + Math.sin(time * 2) * 0.05 // Меньшее изменение размера
      
      ringRef.current.scale.setScalar(scale)
      materialRef.current.opacity = pulse
    }
  })
  
  return (
    <mesh 
      ref={ringRef} 
      position={[0, 0.05, 0]} 
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={500}
    >
      <ringGeometry args={[1.15, 1.25, 6]} />
      <meshBasicMaterial 
        ref={materialRef}
        color={ringColor}
        transparent
        opacity={0.8}
        depthTest={false}
        depthWrite={false}
        side={2} // DoubleSide
      />
    </mesh>
  )
} */
import { BuildingType } from '../types/building'

// Удаляем функцию getStableBuildingVariant - она больше не нужна

interface ZoneMarking {
  id: string
  name: string
  color: string
  cells: Array<[number, number]>
  createdAt: Date
}

interface HexCellProps {
  q: number
  r: number
  type: 'project-center' | 'building-slot' | 'hidden-slot'
  state: 'empty' | 'occupied' | 'highlighted' | 'hidden'
  buildingType?: BuildingType | null
  category?: string
  priority?: number
  // Признак наличия дорожного сегмента на ячейке
  hasRoad?: boolean
  // Вариант модели дороги
  roadModel?: 'straight' | 'turn60_left' | 'turn60_right' | 'turn120_left' | 'turn120_right'
  // Дополнительный поворот Y для ориентации плитки дороги (радианы)
  roadRotation?: number
  // Прямой путь к GLB-плитке дороги (если указан — имеет приоритет)
  roadSrc?: string
  onClick: (q: number, r: number, isRightClick?: boolean, mousePosition?: [number, number]) => void
  onPointerEnter: (q: number, r: number) => void
  onPointerLeave: (q: number, r: number) => void
  // Новые пропсы для выделения зон
  isZoneMode: boolean
  isSelected: boolean
  zoneColor?: string
  zoneInfo?: ZoneMarking
  isZoneCenter?: boolean
  hoveredZoneColor?: string | null
  hoveredCellType?: 'empty' | 'adjacent-zone' | 'new-zone' | 'zone-cell' | 'zone-add' | null
  // Hover состояние для ячейки
  isHovered?: boolean
  // Новый пропс для редактирования зон
  onZoneEdit?: (zoneId: string) => void
  // Пропсы для режима редактирования зон
  isZoneEditMode?: boolean
  editingZoneId?: string | null
  // Объект зоны на этой ячейке
  zoneObject?: {
    id: string
    type: 'story' | 'task' | 'bug' | 'test' | 'mountain' | 'castle' | 'house' | 'garden' | 'factory' | 'helipad' | 'zone'
    title: string
    zoneId: string
    cellPosition: [number, number]
    createdAt: Date
    status?: 'open' | 'in_progress' | 'done'
  } | null
  visualState?: 'empty' | 'zone' | 'occupied' | 'hover' | 'drag-hover' | 'selected' | 'zone-edit-target' | 'zone-edit-existing' | 'zone-edit-remove' | 'linked-selected' | 'link-source' | 'link-target'
}

const HexCellComponent: React.FC<HexCellProps> = ({
  q,
  r,
  type,
  state,
  buildingType,
  category,
  priority,
  hasRoad = false,
  roadRotation = 0,
  onClick,
  onPointerEnter,
  onPointerLeave,
  isZoneMode,
  isSelected,
  zoneColor,
  zoneInfo,
  isZoneCenter,
  hoveredZoneColor,
  hoveredCellType,
  isHovered = false,
  onZoneEdit,
  isZoneEditMode = false,
  editingZoneId = null,
  zoneObject = null,
  visualState
}) => {
  
  // Простая гексагональная плитка без GLB
  const SimpleHexTile: React.FC<{ color: string; opacity: number; rotationYExtra?: number }> = ({ color, opacity, rotationYExtra = 0 }) => {
    const geometry = useMemo(() => {
      return new THREE.CylinderGeometry(0.5, 0.5, 0.1, 6)
    }, [])

    const material = useMemo(() => {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.2,
        roughness: 0.6,
        transparent: true,
        opacity
      })
    }, [color, opacity])

    return (
      <mesh 
        geometry={geometry}
        material={material}
        rotation={[0, rotationYExtra, 0]}
        castShadow 
        receiveShadow 
      />
    )
  }
  
  // Отладочная информация для зон
  // Debug logs removed for performance

  // Конвертация hex координат в world позиции
  const hexToWorldPosition = (q: number, r: number): [number, number, number] => {
    const HEX_SIZE = 1.0
    const x = HEX_SIZE * (3/2 * q)
    const z = HEX_SIZE * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r)
    return [x, 0, z]
  }

  const [x, y, z] = hexToWorldPosition(q, r)

  // Квантование поворота к допустимым углам гекса (30° + k*60°)
  const rotationY = React.useMemo(() => {
    const base = 0
    const step = Math.PI / 3
    const desired = base + (hasRoad ? roadRotation : 0)
    const k = Math.round((desired - base) / step)
    return base + k * step
  }, [hasRoad, roadRotation])

  const setCanvasCursor = (value: string) => {
    try {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
      if (canvas) canvas.style.cursor = value
    } catch {}
  }

  // Стабильные обработчики событий
  const handleMainCellClick = useCallback((event: any) => {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation()
    }
    // Определяем, была ли нажата правая кнопка мыши
    const isRightClick = event.button === 2 || event.nativeEvent.button === 2
    const mousePosition: [number, number] = [event.clientX, event.clientY]
    
    // Если это правый клик на ячейке зоны, запускаем режим редактирования
    if (isRightClick && zoneInfo && onZoneEdit) {
      console.log('Right click on zone cell, starting edit mode')
      event.stopPropagation()
      onZoneEdit(zoneInfo.id)
      return
    }
    
    onClick(q, r, isRightClick, mousePosition)
  }, [q, r, onClick, zoneInfo, onZoneEdit])






  // Вспомогательные функции для определения «зелёности» цвета
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '')
    const r = parseInt(h.substring(0, 2), 16)
    const g = parseInt(h.substring(2, 4), 16)
    const b = parseInt(h.substring(4, 6), 16)
    return { r, g, b }
  }

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2
    const d = max - min
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }
    return { h: h * 360, s, l }
  }

  const isGreenish = (hex: string): boolean => {
    try {
      const { r, g, b } = hexToRgb(hex)
      const { h, s } = rgbToHsl(r, g, b)
      // зелёные оттенки ~80..160° по HSL, с умеренной насыщенностью
      return h >= 80 && h <= 160 && s >= 0.2
    } catch {
      return false
    }
  }

  // Функция для получения цвета приоритета
  const getPriorityColor = (priority?: number): string | null => {
    if (!priority || priority <= 0) return null
    
    // Цветовая схема приоритетов
    switch (priority) {
      case 1: return '#FF4444' // Красный - критический
      case 2: return '#FF8800' // Оранжевый - высокий
      case 3: return '#FFCC00' // Желтый - средний
      case 4: return '#88CC00' // Зеленый - низкий
      case 5: return '#4488CC' // Синий - очень низкий
      default: return '#888888' // Серый - неопределенный
    }
  }

  // Определение цвета ячейки
  const getCurrentColor = () => {
    // Приоритет 1: Hover эффект для ячеек с объектами - затемнение текущего цвета
    if (isHovered && (buildingType || type === 'project-center')) {
      // Получаем базовый цвет ячейки
      let baseColor = '#FFFFFF' // По умолчанию белый
      
      // Определяем базовый цвет в зависимости от состояния
      if (zoneColor) {
        baseColor = zoneColor
      } else if (state === 'occupied' && category) {
        baseColor = getCellColorByCategory(category)
      } else if (type === 'project-center') {
        baseColor = '#90EE90'
      } else if (state === 'highlighted') {
        baseColor = '#87CEEB'
      } else if (type === 'hidden-slot') {
        baseColor = '#E8E8E8'
      }
      
      // Затемняем цвет на 20%
      return darkenColor(baseColor, 0.2)
    }
    
    // Приоритет 2: Hover цвет зоны (если наводимся на ячейку в режиме зон)
    if (hoveredZoneColor && isZoneMode && !zoneColor && hoveredCellType) {
      return hoveredZoneColor
    }
    
    // Приоритет 3: Цвет зоны (если ячейка принадлежит к созданной зоне)
    if (zoneColor) {
      return zoneColor
    }
    
    // Приоритет 4: Выделение в режиме зон
    if (isSelected && isZoneMode) {
      return '#FF6B6B' // Красный для выделенных
    }
    
    // Приоритет 5: Темная подсветка для свободных ячеек при hover
    if (hoveredCellType && state === 'empty' && !zoneColor) {
      return '#E0E0E0' // Темно-серый для hover на свободных ячейках
    }
    
    // Приоритет 6: Цвет категории для занятых ячеек
    if (state === 'occupied' && category) {
      return getCellColorByCategory(category)
    }
    
    // Приоритет 7: Центральная ячейка проекта
    if (type === 'project-center') {
      return '#90EE90' // Светло-зеленый для центра
    }
    
    // Приоритет 8: Подсветка при наведении
    if (state === 'highlighted') {
      return '#87CEEB' // Светло-голубой для подсветки
    }
    
    // Приоритет 9: Скрытые ячейки (теперь более заметные)
    if (type === 'hidden-slot') {
      return '#E8E8E8' // Более заметный серый для скрытых ячеек
    }
    
    // Приоритет 10: По умолчанию
    return '#FFFFFF' // Белый по умолчанию
  }

  // Предвычисляем цвет приоритета, чтобы не передавать потенциально null в JSX
  const priorityColor = getPriorityColor(priority)

  // Определение прозрачности
  const getOpacity = () => {
    // Все ячейки полностью видимы
    if (isSelected && isZoneMode) {
      return 0.8 // Выделенные ячейки немного прозрачные
    }
    // Ячейки зон без изменения прозрачности фона
    return 1.0 // Полностью видимые ячейки
  }

  // Убираем проверку скрытия - все ячейки отображаются
  // if (!isVisible && !isHovered) {
  //   return null
  // }

  const resolveBase = () => {
    switch (visualState) {
      case 'hover':
        return { color: darkenColor(getCurrentColor(), 0.15), opacity: getOpacity() }
      case 'drag-hover':
        return { color: getCurrentColor(), opacity: getOpacity() }
      case 'selected':
      case 'linked-selected':
        return { color: darkenColor(getCurrentColor(), 0.25), opacity: getOpacity() }
      case 'link-source':
        return { color: darkenColor(getCurrentColor(), 0.4), opacity: getOpacity() }
      case 'link-target':
        return { color: darkenColor(getCurrentColor(), 0.2), opacity: getOpacity() }
      case 'zone-edit-target':
      case 'zone-edit-existing':
        return { color: getCurrentColor(), opacity: Math.max(0.6, getOpacity()) }
      case 'zone-edit-remove':
        return { color: getCurrentColor(), opacity: Math.max(0.6, getOpacity()) }
      default:
        return { color: getCurrentColor(), opacity: getOpacity() }
    }
  }
  const baseMat = resolveBase()

  // Решаем, должна ли плитка быть «травяной» на основе текущего итогового цвета
  const isGreenTile = React.useMemo(() => isGreenish(baseMat.color), [baseMat.color])
  // Белая фоновая клетка? Скрываем в обычном режиме, показываем только в режиме зон
  const isWhiteish = (hex: string): boolean => {
    try {
      const { r, g, b } = hexToRgb(hex)
      const { s, l } = rgbToHsl(r, g, b)
      return s < 0.05 && l > 0.85
    } catch { return false }
  }
  const showBaseTile = React.useMemo(() => {
    if (hasRoad) return true
    if (isZoneMode) return true
    if (type === 'project-center' || isZoneCenter) return true
    return !isWhiteish(baseMat.color)
  }, [hasRoad, isZoneMode, type, isZoneCenter, baseMat.color])
  // Для разнообразия травяных плит выбираем один из 6 допустимых поворотов кратных 60°
  const grassRotationExtra = React.useMemo(() => {
    // стабильный детерминированный сид по координатам
    const seed = (q * 73856093) ^ (r * 19349663)
    const idx = Math.abs(seed) % 6
    return (Math.PI / 3) * idx // 0, 60°, 120° ... 300°
  }, [q, r])



  return (
    <group position={[x, y, z]} userData={{ isZoneCenter: Boolean(isZoneCenter), q, r }}>
      {/* Основа ячейки (простая геометрия) */}
      {/* Поворот к ближайшему корректному углу (30° + k*60°) */}
      <group rotation={[0, rotationY, 0]} scale={((visualState === 'hover') || (visualState === 'drag-hover')) && (buildingType) ? 1.1 : 1.0}>
        {/* Простая гексагональная плитка */}
        {showBaseTile && (
          <SimpleHexTile
            color={baseMat.color}
            opacity={baseMat.opacity}
            rotationYExtra={!hasRoad && isGreenTile ? grassRotationExtra : 0}
          />
        )}
      </group>

      {/* Биом: трава для зеленых зон (не рендерим поверх дорог) */}
      {/* grass removed */}

      {/* Невидимый кликабельный контур над плиткой для стабильных событий */}
      <mesh
        rotation={[0, Math.PI / 6, 0]}
        position={[0, 0.06, 0]}
        onClick={handleMainCellClick}
        onPointerMove={() => onPointerEnter(q, r)}
        onPointerOut={() => onPointerLeave(q, r)}
        onPointerOver={() => {
          if (buildingType || type === 'project-center' || isZoneCenter || zoneColor) {
            setCanvasCursor('pointer')
          } else {
            setCanvasCursor('default')
          }
        }}
        onPointerLeave={() => { setCanvasCursor('default') }}
        // custom DOM dnd handled on group level to avoid TS types on mesh
      >
        <cylinderGeometry args={[1.05, 1.05, 0.02, 6]} />
        <meshBasicMaterial transparent opacity={0.0} depthWrite={false} depthTest={false} />
      </mesh>

      {/* Отладочные подписи отключены */}

      {/* Рамка приоритета */}
      {priorityColor && (buildingType || type === 'project-center' || isZoneCenter) && (
        <mesh
          rotation={[0, Math.PI / 6, 0]}
          position={[0, 0.06, 0]}
        >
          <cylinderGeometry args={[1.05, 1.05, 0.02, 6]} />
          <meshStandardMaterial 
            color={priorityColor}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Контур зоны убран в откате */}

      {/* Убрали невидимую кликабельную плоскость, клики обрабатывает сама модель центра */}

      {/* Центральная ячейка: пара GLB-деревьев вместо test.glb */}
      {type === 'project-center' && (
        <group renderOrder={2} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = 'default' }}>
          {(() => {
            const models = [
              '/models/Tree_1.glb','/models/Tree_2.glb','/models/Tree_3.glb',
              '/models/Tree_4.glb','/models/Tree_5.glb','/models/Tree_6.glb','/models/Tree_7.glb'
            ]
            const pick = (seed: number) => models[Math.abs(seed) % models.length]
            // much smaller trees: fitDiameter ~ 0.35–0.45
            return (
              <>
                <Vegetation
                  modelPath={pick(q * 7 + r * 13)}
                  position={[0.22, 0, 0.12]}
                  rotationY={Math.PI * 0.25}
                  scale={0.9}
                  seed={q * 31 + r * 17}
                  fitDiameter={0.42}
                />
                <Vegetation
                  modelPath={pick(q * 11 + r * 17 + 1)}
                  position={[-0.18, 0, -0.08]}
                  rotationY={Math.PI * 0.6}
                  scale={0.85}
                  seed={q * 19 + r * 23}
                  fitDiameter={0.36}
                />
                <mesh position={[0, 0.2, 0]} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = 'default' }}>
                  <cylinderGeometry args={[1.4, 1.4, 0.4, 6]} />
                  <meshBasicMaterial transparent opacity={0.0} depthWrite={false} depthTest={false} />
                </mesh>
              </>
            )
          })()}
        </group>
      )}

      {/* Central project flag with project name */}
      {type === 'project-center' && (
        <Flag
          text={(window as any)?.currentProject?.name || 'Project'}
          position={[0.0, 0.0, 0.0]}
          rotationY={0}
          poleHeight={3.2}
          flagWidth={2.2}
          flagHeight={1.3}
          color={'#18181B'}
        />
      )}

      {/* No procedural grass */}

      {/* 3D объект здания */}
      {buildingType && state === 'occupied' && (
        <group>
          {/* BuildingComponent type={buildingType} /> */}
          {/* Невидимая плоскость для обработки кликов здания */}
          <mesh
            position={[0, 1.0, 0]}
            onClick={handleMainCellClick}
            onPointerOver={() => { document.body.style.cursor = 'pointer' }}
            onPointerLeave={() => { document.body.style.cursor = 'default' }}
            castShadow
          >
            <cylinderGeometry args={[1.5, 1.5, 0.01, 6]} />
            <meshStandardMaterial 
              color="#000000"
              transparent
              opacity={0.0}
              depthWrite={false}
              depthTest={false}
              colorWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Убираем черную рамку - используем только затемнение ячейки */}

      {/* Кнопки "+" для связывания зданий - временно скрыты */}
      {false && (visualState === 'selected' || visualState === 'linked-selected') && (isZoneCenter || type === 'project-center' || buildingType) && (
        <group renderOrder={3000}>
          {/* Кнопка "+" на каждой стороне ячейки */}
          {[
            { pos: [0.95, 0, 0], rot: 0 },       // правая сторона (между правой верхней и правой нижней вершинами)
            { pos: [0.475, 0, 0.823], rot: 60 }, // правая верхняя сторона (между правой верхней и верхней вершинами)
            { pos: [-0.475, 0, 0.823], rot: 120 }, // левая верхняя сторона (между верхней и левой верхней вершинами)
            { pos: [-0.95, 0, 0], rot: 180 },    // левая сторона (между левой верхней и левой нижней вершинами)
            { pos: [-0.475, 0, -0.823], rot: 240 }, // левая нижняя сторона (между левой нижней и нижней вершинами)
            { pos: [0.475, 0, -0.823], rot: 300 }  // правая нижняя сторона (между нижней и правой нижней вершинами)
          ].map((side, index) => (
            <group key={index} position={[side.pos[0], 0.12, side.pos[2]]} rotation={[0, (side.rot * Math.PI) / 180, 0]}>
              {/* Полупрозрачный черный фон для "+" */}
              <mesh
                rotation={[0, 0, 0]}
              >
                <cylinderGeometry args={[0.15, 0.15, 0.01, 32]} />
                <meshStandardMaterial color="#000000" transparent opacity={0.6} />
              </mesh>
              {/* Знак "+" - плоский */}
              <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.12, 0.03]} />
                <meshStandardMaterial color="#FFFFFF" />
              </mesh>
              <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.03, 0.12]} />
                <meshStandardMaterial color="#FFFFFF" />
              </mesh>
              {/* Кликабельная область */}
              <mesh
                rotation={[0, 0, 0]}
                onClick={(e) => {
                  e.stopPropagation()
                  // Здесь будет логика для начала связывания
                  console.log('Link button clicked at corner', index)
                }}
                onPointerOver={(e) => { 
                  e.stopPropagation(); 
                  setCanvasCursor('pointer') 
                }}
                onPointerOut={(e) => { 
                  e.stopPropagation(); 
                  setCanvasCursor('default') 
                }}
              >
                <cylinderGeometry args={[0.15, 0.15, 0.01, 32]} />
                <meshStandardMaterial transparent opacity={0.0} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Highlight drop target: only for zone center or project center */}
      {(visualState === 'drag-hover') && (isZoneCenter || type === 'project-center') && (
        <group renderOrder={2000}>
          {/* Elevated ring visibly above buildings */}
          <mesh position={[0, 2.2, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2001}>
            <ringGeometry args={[1.0, 1.35, 64]} />
            <meshBasicMaterial color={'#22c55e'} transparent opacity={0.55} depthTest={false} depthWrite={false} />
          </mesh>
          {/* Elevated soft halo column */}
          <mesh position={[0, 1.6, 0]} renderOrder={2000}>
            <cylinderGeometry args={[1.18, 1.18, 3.2, 32]} />
            <meshBasicMaterial color={'#22c55e'} transparent opacity={0.18} depthTest={false} depthWrite={false} />
          </mesh>
        </group>
      )}
      


      {/* Убрали 2D UI бейдж для зон */}

      {/* 2D UI бейдж для объектов зоны (оставляем) */}
      {/* Убираем бейджи/объекты на клетках вокруг центра зоны */}

      {/* 3D объекты для зон */}
      {zoneObject && (
        <group
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'default' }}
          userData={{ isZoneCenter: Boolean(isZoneCenter), q, r }}
        >
          {/* Невидимая зона для hover курсора над объектом в зоне */}
          { (buildingType || isZoneCenter || type === 'project-center' || zoneColor) && (
          <mesh
            position={[0, 0.8, 0]}
            onPointerOver={(e) => { e.stopPropagation(); setCanvasCursor('pointer') }}
            onPointerOut={(e) => { e.stopPropagation(); setCanvasCursor('default') }}
            onPointerMove={(e) => { e.stopPropagation() }}
          >
            <cylinderGeometry args={[1.2, 1.2, 0.01, 6]} />
            <meshBasicMaterial transparent opacity={0.0} depthWrite={false} depthTest={false} />
          </mesh>
          )}
          
          {/* Удалено процедурное центральное здание зоны */}

          {/* Единый рендер GLB для любого типа zoneObject */}
          <group position={[0, 0.1, 0]} scale={[1.0, 1.0, 1.0]}>
            <ZoneObjectComponent type={zoneObject.type as any} status={zoneObject.status} />
          </group>
        </group>
      )}

      {/* Индикатор выделения зоны */}
      {isSelected && isZoneMode && (
        <mesh position={[0, 0.06, 0]} rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[1.05, 1.05, 0.02, 6]} />
          <meshStandardMaterial 
            color={zoneColor || '#FF6B6B'}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* Пульсирующая анимация для выбранного здания - ВРЕМЕННО ОТКЛЮЧЕНО */}
      {/* {(() => {
        const shouldShow = isSelected && (buildingType || type === 'project-center' || isZoneCenter)
        if (shouldShow) {
          console.log(`🎯 PulsingBorder should show for cell [${q}, ${r}]:`, {
            isSelected,
            buildingType,
            type,
            isZoneCenter
          })
        }
        return shouldShow
      })() && (
        <group renderOrder={1000}>
          <PulsingBorder zoneColor={zoneColor} />
        </group>
      )} */}

      {/* Иконка "+" для свободных ячеек при hover */}
      {hoveredCellType && state === 'empty' && !zoneColor && (
        <group position={[0, 0.1, 0]} rotation={[99, 0, 0]}>
          {/* Вертикальная линия "+" */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.05, 0.3, 0.01]} />
            <meshStandardMaterial color="#666666" />
          </mesh>
          {/* Горизонтальная линия "+" */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.3, 0.05, 0.01]} />
            <meshStandardMaterial color="#666666" />
          </mesh>
        </group>
      )}

      {/* Иконка "+" для ячеек внутри зон при hover (только не в режиме редактирования и только для пустых ячеек) */}
      {false && (hoveredCellType === 'zone-cell' || hoveredCellType === 'zone-add') && state === 'empty' && zoneColor && !isZoneEditMode && !zoneObject && (
        <group position={[0, 0.1, 0]} rotation={[99, 0, 0]}>
          {/* Вертикальная линия "+" */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.05, 0.3, 0.01]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          {/* Горизонтальная линия "+" */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.3, 0.05, 0.01]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </group>
      )}

      {/* Иконка "-" для удаления ячеек из зоны при редактировании */}
      {isZoneEditMode && editingZoneId && hoveredCellType === 'zone-cell' && zoneColor && zoneInfo && zoneInfo.id === editingZoneId && (
        <group position={[0, 0.1, 0]} rotation={[99, 0, 0]}>
          {/* Только горизонтальная линия "-" */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.3, 0.05, 0.01]} />
            <meshStandardMaterial color="#FF6B6B" />
          </mesh>
        </group>
      )}

      {/* Hover effect для ячеек внутри зон */}
      {isZoneEditMode && hoveredCellType === 'zone-cell' && zoneColor && (
        <mesh position={[0, 0.06, 0]} rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[1.05, 1.05, 0.02, 6]} />
          <meshStandardMaterial 
            color={zoneColor}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Zone name above center removed in favor of DOM badges */}
    </group>
  )
}

// Мемоизация ячейки, чтобы движение мыши не перерисовывало весь грид
const arePropsEqual = (prev: HexCellProps, next: HexCellProps) => {
  // Базовые неизменные
  if (prev.q !== next.q) return false
  if (prev.r !== next.r) return false
  if (prev.type !== next.type) return false
  if (prev.state !== next.state) return false
  if (prev.buildingType !== next.buildingType) return false
  if (prev.category !== next.category) return false
  if (prev.priority !== next.priority) return false
  // Зонная информация/цвет
  if (prev.isZoneMode !== next.isZoneMode) return false
  if (prev.isSelected !== next.isSelected) return false
  if (prev.zoneColor !== next.zoneColor) return false
  if (prev.isZoneCenter !== next.isZoneCenter) return false
  // Hover только для этой ячейки
  if (prev.isHovered !== next.isHovered) return false
  if (prev.hoveredZoneColor !== next.hoveredZoneColor) return false
  if (prev.hoveredCellType !== next.hoveredCellType) return false
  // Объекты зон / UI
  const prevObjId = prev.zoneObject?.id || null
  const nextObjId = next.zoneObject?.id || null
  if (prevObjId !== nextObjId) return false
  return true
}

export const HexCell = React.memo(HexCellComponent, arePropsEqual)