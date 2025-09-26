import React from 'react'
import { useGLTF } from '@react-three/drei'
import { HEX_SIZE } from '../../types/building'
import { StylizedTree } from './StylizedTree'
import { FluffyTree } from './FluffyTree'
import { SprintModel } from './SprintModel'
import { LowPolyTree } from './LowPolyTree'
import { HubGLB } from '../HubGLB'

// Простые геометрические фигуры для каждого типа здания
export const ZoneObjectComponent: React.FC<{
  type: 'mountain' | 'castle' | 'house' | 'garden' | 'factory' | 'helipad' | 'meet' | 'refinement' | 'task' | 'test' | 'tree' | 'fluffy_tree' | 'low_poly_tree'
  status?: 'open' | 'in_progress' | 'done'
  progress?: number
  seed?: number
  isDragTarget?: boolean
}> = ({ type, status = 'open', seed = 0, isDragTarget = false }) => {
  // Отладка: логируем когда isDragTarget меняется
  React.useEffect(() => {
    if (isDragTarget) {
      console.log('🟢 ZoneObjectComponent: isDragTarget = true for type:', type)
    }
  }, [isDragTarget, type])
  
  // Базовый размер здания - увеличиваем для лучшей видимости
  const baseSize = HEX_SIZE * 0.6
  
  // Цвета по статусам
  const statusColors = {
    open: type === 'mountain' ? '#8B8B8B' : 
          type === 'helipad' ? '#B0BEC5' : '#6B8E23',        // Серый для гор, светло-серый для Development, оливково-зеленый для деревьев
    in_progress: '#4ECDC4', // Бирюзовый
    done: '#45B7D1'         // Синий
  }
  
  const color = statusColors[status] || statusColors.open

  switch (type) {
    case 'mountain': // Sprint GLB модель
      return (
        <group position={[0, 0, 0]} scale={[baseSize * 1.0, baseSize * 1.0, baseSize * 1.0]}>
          <SprintModel 
            color={color}
            seed={seed}
          />
          {/* Убираем зеленый бокс при drag & drop */}
        </group>
      )
      
    case 'castle': // hub - Hub GLB model
      return (
        <group position={[0, 0, 0]} scale={[baseSize * 1.2, baseSize * 1.2, baseSize * 1.2]}>
          <HubGLB 
            position={[0, 0, 0]}
            rotationY={0}
            scale={1.0}
            fitDiameter={1.8}
          />
          {/* Убираем зеленый бокс при drag & drop */}
        </group>
      )
      
    case 'house': // meet - GLB модель meet.glb
      return <MeetModel color={color} baseSize={baseSize} />
      
    case 'garden': // refinement - GLB модель refinement.glb
      return <RefinementModel color={color} baseSize={baseSize} />
      
    case 'factory': // qa - GLB модель qa.glb
      return <QAModel color={color} baseSize={baseSize} />
      
    case 'helipad': // development - GLB модель Development.glb
      return <DevelopmentModel color={color} baseSize={baseSize} />
      
    case 'meet': // meet - GLB модель meet.glb
      return <MeetModel color={color} baseSize={baseSize} />
      
    case 'task': // Задача - Куб
      return (
        <group position={[0, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[baseSize * 0.6, baseSize * 0.6, baseSize * 0.6]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Убираем зеленый бокс при drag & drop */}
        </group>
      )
      
    case 'test': // Тест - Сфера
      return (
        <group position={[0, 0, 0]}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[baseSize * 0.4, 8, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Убираем зеленый бокс при drag & drop */}
        </group>
      )
      
    case 'tree': // Дерево - стилизованное low-poly дерево
      return (
        <group position={[0, 0, 0]} scale={[baseSize * 0.7, baseSize * 0.7, baseSize * 0.7]}>
          <StylizedTree 
            color={color} 
            seed={seed || Math.random()}
          />
        </group>
      )
      
    case 'fluffy_tree': // Пышное дерево - с кастомными шейдерами
      return (
        <group position={[0, 0, 0]} scale={[baseSize * 0.7, baseSize * 0.7, baseSize * 0.7]}>
          <FluffyTree 
            color={color}
          />
        </group>
      )
      
    case 'low_poly_tree': // Low-poly дерево как на скриншоте
      return (
        <group position={[0, 0, 0]} scale={[baseSize * 1.2, baseSize * 1.2, baseSize * 1.2]}>
          <LowPolyTree 
            seed={seed}
          />
        </group>
      )
      
    default:
      return null
  }
}

// Компонент для GLB модели Development
const DevelopmentModel: React.FC<{ color: string; baseSize: number }> = ({ color, baseSize }) => {
  const { scene } = useGLTF('/models/Development.glb')
  
  // Клонируем сцену БЕЗ принудительного применения цвета (используем оригинальные цвета GLB)
  const clonedScene = React.useMemo(() => {
    const cloned = scene.clone()
    cloned.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as any
        mesh.castShadow = true
        mesh.receiveShadow = true
        // НЕ применяем цвет - используем оригинальные цвета из GLB
      }
    })
    return cloned
  }, [scene])

  return (
    <group position={[0, 0, 0]} scale={[baseSize * 0.8, baseSize * 0.8, baseSize * 0.8]}>
      <primitive object={clonedScene} />
    </group>
  )
}

// Компонент для GLB модели Meet
const MeetModel: React.FC<{ color: string; baseSize: number }> = ({ color, baseSize }) => {
  const { scene } = useGLTF('/models/meet.glb')
  
  // Клонируем сцену БЕЗ принудительного применения цвета (используем оригинальные цвета GLB)
  const clonedScene = React.useMemo(() => {
    const cloned = scene.clone()
    cloned.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as any
        mesh.castShadow = true
        mesh.receiveShadow = true
        // НЕ применяем цвет - используем оригинальные цвета из GLB
      }
    })
    return cloned
  }, [scene])

  return (
    <group position={[0, 0, 0]} scale={[baseSize * 0.225, baseSize * 0.225, baseSize * 0.225]}>
      <primitive object={clonedScene} />
    </group>
  )
}

// Компонент для GLB модели Refinement
const RefinementModel: React.FC<{ color: string; baseSize: number }> = ({ color, baseSize }) => {
  const { scene } = useGLTF('/models/refinement.glb')
  
  // Клонируем сцену БЕЗ принудительного применения цвета (используем оригинальные цвета GLB)
  const clonedScene = React.useMemo(() => {
    const cloned = scene.clone()
    cloned.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as any
        mesh.castShadow = true
        mesh.receiveShadow = true
        // НЕ применяем цвет - используем оригинальные цвета из GLB
      }
    })
    return cloned
  }, [scene])

  return (
    <group position={[0, 0.1, 0]} scale={[baseSize * 0.8, baseSize * 0.8, baseSize * 0.8]}>
      <primitive object={clonedScene} />
    </group>
  )
}

// Компонент для GLB модели QA
const QAModel: React.FC<{ color: string; baseSize: number }> = ({ color, baseSize }) => {
  const { scene } = useGLTF('/models/qa.glb')
  
  // Клонируем сцену БЕЗ принудительного применения цвета (используем оригинальные цвета GLB)
  const clonedScene = React.useMemo(() => {
    const cloned = scene.clone()
    cloned.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as any
        mesh.castShadow = true
        mesh.receiveShadow = true
        // НЕ применяем цвет - используем оригинальные цвета из GLB
      }
    })
    return cloned
  }, [scene])

  return (
    <group position={[0, 0.1, 0]} scale={[baseSize * 0.4, baseSize * 0.4, baseSize * 0.4]}>
      <primitive object={clonedScene} />
    </group>
  )
}

// Предзагружаем GLB модели
useGLTF.preload('/models/Development.glb')
useGLTF.preload('/models/meet.glb')
useGLTF.preload('/models/refinement.glb')
useGLTF.preload('/models/qa.glb') 