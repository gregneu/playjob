import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Типы блоков
interface BuildingBlock {
  width: number
  height: number
  depth: number
  position: [number, number, number]
  rotation: [number, number, number]
  color: string
  windowConfig?: {
    x: number
    y: number
    z: number
    width: number
    height: number
  } | null
}

// Конфигурации блоков
const BLOCK_CONFIGS = [
  { width: 4, height: 2, depth: 3 },
  { width: 3, height: 2, depth: 4 },
  { width: 3.5, height: 1.8, depth: 2.5 },
  { width: 2.5, height: 2.5, depth: 3 },
  { width: 3, height: 1.5, depth: 3 },
  { width: 2, height: 3, depth: 2.5 },
  { width: 4.5, height: 1.8, depth: 2.8 },
  { width: 2.8, height: 2.2, depth: 3.2 }
]

// Цвета для блоков
const BLOCK_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD",
  "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9", "#F8C471", "#82E0AA",
  "#E74C3C", "#3498DB", "#2ECC71", "#F39C12", "#9B59B6", "#1ABC9C"
]

// Возможные позиции блоков (геометрически правильные)
const POSITION_VARIANTS = [
  // 2 блока - вертикальная башня
  [
    { x: 0, y: 1, z: 0, rot: [0, 0, 0] },
    { x: 0, y: 3, z: 0, rot: [0, 0, 0] }
  ],
  // 2 блока - горизонтальная линия
  [
    { x: -1.5, y: 1, z: 0, rot: [0, 0, 0] },
    { x: 1.5, y: 1, z: 0, rot: [0, 0, 0] }
  ],
  // 3 блока - L-образная форма
  [
    { x: -1, y: 1, z: 0, rot: [0, 0, 0] },
    { x: 1, y: 1, z: 0, rot: [0, 0, 0] },
    { x: 1, y: 3, z: 0, rot: [0, 0, 0] }
  ],
  // 3 блока - T-образная форма
  [
    { x: 0, y: 1, z: 0, rot: [0, 0, 0] },
    { x: -1, y: 3, z: 0, rot: [0, 0, 0] },
    { x: 1, y: 3, z: 0, rot: [0, 0, 0] }
  ],
  // 4 блока - квадратная форма
  [
    { x: -1, y: 1, z: 0, rot: [0, 0, 0] },
    { x: 1, y: 1, z: 0, rot: [0, 0, 0] },
    { x: -1, y: 3, z: 0, rot: [0, 0, 0] },
    { x: 1, y: 3, z: 0, rot: [0, 0, 0] }
  ],
  // 4 блока - прямоугольная форма
  [
    { x: -1.5, y: 1, z: 0, rot: [0, 0, 0] },
    { x: 0, y: 1, z: 0, rot: [0, 0, 0] },
    { x: 1.5, y: 1, z: 0, rot: [0, 0, 0] },
    { x: 0, y: 3, z: 0, rot: [0, 0, 0] }
  ]
]

// Функция создания окна
const createWindowConfig = (width: number, height: number, depth: number) => {
  const hasWindow = Math.random() > 0.3 // 70% шанс окна
  if (!hasWindow) return null

  const windowWidth = width * 0.4
  const windowHeight = height * 0.6
  const windowX = (Math.random() - 0.5) * (width - windowWidth) * 0.5
  const windowY = (Math.random() - 0.5) * (height - windowHeight) * 0.5

  return {
    x: windowX,
    y: windowY,
    z: depth / 2 + 0.05,
    width: windowWidth,
    height: windowHeight
  }
}

// Функция генерации случайного здания
const generateRandomBuilding = (): BuildingBlock[] => {
  const numBlocks = Math.random() > 0.5 ? 
    (Math.random() > 0.5 ? 2 : 3) : 4
  
  const positionVariant = POSITION_VARIANTS[Math.floor(Math.random() * POSITION_VARIANTS.length)]
  const selectedPositions = positionVariant.slice(0, numBlocks)
  
  const building: BuildingBlock[] = []
  const usedColors = new Set<string>()
  
  selectedPositions.forEach((pos, index) => {
    const blockConfig = BLOCK_CONFIGS[Math.floor(Math.random() * BLOCK_CONFIGS.length)]
    
    // Выбираем уникальный цвет
    let color: string
    do {
      color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)]
    } while (usedColors.has(color))
    usedColors.add(color)
    
    building.push({
      width: blockConfig.width,
      height: blockConfig.height,
      depth: blockConfig.depth,
      position: [pos.x, pos.y, pos.z],
      rotation: pos.rot,
      color,
      windowConfig: createWindowConfig(blockConfig.width, blockConfig.height, blockConfig.depth)
    })
  })
  
  return building
}

// Компонент блока здания
const BuildingBlock: React.FC<{ block: BuildingBlock }> = ({ block }) => {
  return (
    <group position={block.position} rotation={block.rotation}>
      {/* Основной блок */}
      <mesh 
        castShadow 
        receiveShadow
        onClick={(event) => {
          console.log('Modular building block clicked')
          // Клик обрабатывается родительским компонентом
        }}
      >
        <boxGeometry args={[block.width, block.height, block.depth]} />
        <meshStandardMaterial color={block.color} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Окно с реальным стеклом */}
      {block.windowConfig && (
        <group position={[block.windowConfig.x, block.windowConfig.y, block.windowConfig.z]}>
          {/* Рамка окна */}
          <mesh 
            position={[0, 0, block.depth * 0.05]}
            onClick={(event) => {
              // Клик обрабатывается родительским компонентом
            }}
          >
            <boxGeometry args={[block.windowConfig.width + 0.1, block.windowConfig.height + 0.1, 0.1]} />
            <meshStandardMaterial color="#333333" roughness={0.7} />
          </mesh>

          {/* Стекло */}
          <mesh 
            position={[0, 0, block.depth * 0.1]}
            onClick={(event) => {
              // Клик обрабатывается родительским компонентом
            }}
          >
            <boxGeometry args={[block.windowConfig.width, block.windowConfig.height, 0.02]} />
            <meshStandardMaterial
              color="#87CEEB"
              transparent
              opacity={0.3}
              roughness={0.1}
              metalness={0.9}
              envMapIntensity={1.0}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}

// Компонент дерева
const Tree: React.FC<{ position: [number, number, number]; isSpruce?: boolean }> = ({ position, isSpruce = false }) => {
  return (
    <group position={position}>
      {/* Ствол с текстурой коры */}
      <mesh 
        position={[0, 0.75, 0]} 
        castShadow
        onClick={(event) => {
          // Клик обрабатывается родительским компонентом
        }}
      >
        <cylinderGeometry args={[0.1, 0.15, 1.5, 8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>

      {/* Корни дерева */}
      <mesh 
        position={[0, 0.1, 0]} 
        castShadow
        onClick={(event) => {
          // Клик обрабатывается родительским компонентом
        }}
      >
        <cylinderGeometry args={[0.2, 0.1, 0.2, 8]} />
        <meshStandardMaterial color="#654321" roughness={0.9} />
      </mesh>

      {isSpruce ? (
        // Елка с несколькими ярусами
        <>
          {/* Нижний ярус елки */}
          <mesh 
            position={[0, 1.4, 0]} 
            castShadow
            onClick={(event) => {
              // Клик обрабатывается родительским компонентом
            }}
          >
            <coneGeometry args={[0.8, 1.0, 8]} />
            <meshStandardMaterial color="#228B22" roughness={0.6} />
          </mesh>
          
          {/* Средний ярус елки */}
          <mesh 
            position={[0, 1.9, 0]} 
            castShadow
            onClick={(event) => {
              // Клик обрабатывается родительским компонентом
            }}
          >
            <coneGeometry args={[0.6, 0.8, 8]} />
            <meshStandardMaterial color="#32CD32" roughness={0.6} />
          </mesh>
          
          {/* Верхний ярус елки */}
          <mesh 
            position={[0, 2.3, 0]} 
            castShadow
            onClick={(event) => {
              // Клик обрабатывается родительским компонентом
            }}
          >
            <coneGeometry args={[0.4, 0.6, 8]} />
            <meshStandardMaterial color="#228B22" roughness={0.6} />
          </mesh>
          
          {/* Верхушка елки */}
          <mesh 
            position={[0, 2.6, 0]} 
            castShadow
            onClick={(event) => {
              // Клик обрабатывается родительским компонентом
            }}
          >
            <coneGeometry args={[0.1, 0.3, 6]} />
            <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
          </mesh>
        </>
      ) : (
        // Обычное дерево с детальной кроной
        <>
          {/* Основная крона */}
          <mesh 
            position={[0, 1.8, 0]} 
            castShadow
            onClick={(event) => {
              // Клик обрабатывается родительским компонентом
            }}
          >
            <sphereGeometry args={[0.6, 8, 6]} />
            <meshStandardMaterial color="#32CD32" roughness={0.6} />
          </mesh>
          
          {/* Дополнительные ветки */}
          <mesh 
            position={[0.3, 1.6, 0]} 
            castShadow
            onClick={(event) => {
              // Клик обрабатывается родительским компонентом
            }}
          >
            <sphereGeometry args={[0.3, 6, 4]} />
            <meshStandardMaterial color="#228B22" roughness={0.6} />
          </mesh>
          
          <mesh 
            position={[-0.3, 1.6, 0]} 
            castShadow
            onClick={(event) => {
              // Клик обрабатывается родительским компонентом
            }}
          >
            <sphereGeometry args={[0.3, 6, 4]} />
            <meshStandardMaterial color="#228B22" roughness={0.6} />
          </mesh>
          
          <mesh 
            position={[0, 1.6, 0.3]} 
            castShadow
            onClick={(event) => {
              // Клик обрабатывается родительским компонентом
            }}
          >
            <sphereGeometry args={[0.3, 6, 4]} />
            <meshStandardMaterial color="#228B22" roughness={0.6} />
          </mesh>
          
          <mesh 
            position={[0, 1.6, -0.3]} 
            castShadow
            onClick={(event) => {
              // Клик обрабатывается родительским компонентом
            }}
          >
            <sphereGeometry args={[0.3, 6, 4]} />
            <meshStandardMaterial color="#228B22" roughness={0.6} />
          </mesh>
          
          {/* Верхняя крона */}
          <mesh 
            position={[0, 2.1, 0]} 
            castShadow
            onClick={(event) => {
              // Клик обрабатывается родительским компонентом
            }}
          >
            <sphereGeometry args={[0.4, 6, 4]} />
            <meshStandardMaterial color="#228B22" roughness={0.6} />
          </mesh>
        </>
      )}
    </group>
  )
}

export const ModularBuilding: React.FC = () => {
  const buildingRef = useRef<THREE.Group>(null)

  // Генерируем случайное здание только один раз
  const buildingBlocks = useMemo(() => {
    return generateRandomBuilding()
  }, [])

  // Генерируем деревья вокруг дома
  const trees = useMemo(() => {
    const treePositions: Array<{ pos: [number, number, number]; isSpruce: boolean }> = []
    
    // Добавляем 2-4 дерева вокруг дома
    const numTrees = Math.floor(Math.random() * 3) + 2
    
    for (let i = 0; i < numTrees; i++) {
      const angle = (i / numTrees) * Math.PI * 2
      const distance = 3 + Math.random() * 2
      const x = Math.cos(angle) * distance
      const z = Math.sin(angle) * distance
      const isSpruce = Math.random() > 0.5
      
      treePositions.push({
        pos: [x, 0, z],
        isSpruce
      })
    }
    
    return treePositions
  }, [])

  useFrame((state) => {
    if (buildingRef.current) {
      buildingRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.02
    }
  })

  return (
    <group ref={buildingRef} position={[0, 0.1, 0]} scale={[0.15, 0.15, 0.15]}>
      {/* Блоки здания */}
      {buildingBlocks.map((block, index) => (
        <BuildingBlock key={index} block={block} />
      ))}
      
      {/* Деревья вокруг дома */}
      {trees.map((tree, index) => (
        <Tree key={`tree-${index}`} position={tree.pos} isSpruce={tree.isSpruce} />
      ))}
    </group>
  )
} 