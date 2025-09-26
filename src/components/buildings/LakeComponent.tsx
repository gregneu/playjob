import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const LakeComponent: React.FC = () => {
  const waterRef = useRef<THREE.Mesh>(null)
  const wavesRef = useRef<THREE.Mesh>(null)
  const lakeRef = useRef<THREE.Group>(null)

  // Анимация волн
  useFrame((state) => {
    if (waterRef.current) {
      waterRef.current.position.y = 0.25 + Math.sin(state.clock.elapsedTime * 2) * 0.02
    }
    if (wavesRef.current) {
      const time = state.clock.elapsedTime
      wavesRef.current.position.y = 0.26 + Math.sin(time * 1.5) * 0.01
      wavesRef.current.rotation.z = Math.sin(time * 0.3) * 0.02
    }
    if (lakeRef.current) {
      lakeRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.01
    }
  })

  // Создаем неровную форму озера внутри клетки
  const lakeShape = useMemo(() => {
    const shape = new THREE.Shape()
    
    // Начинаем с центра клетки
    shape.moveTo(0, 0)
    
    // Создаем случайную форму озера
    const segments = 64
    const lakeType = Math.floor(Math.random() * 4) // 0-3 разные типы озер
    
    let maxRadius, minRadius, noisePattern
    
    switch (lakeType) {
      case 0: // Круглое озеро
        maxRadius = 3.6
        minRadius = 3.2
        noisePattern = (angle: number) => Math.sin(angle * 2) * 0.2 + Math.sin(angle * 5) * 0.1
        break
      case 1: // Овальное озеро
        maxRadius = 3.8
        minRadius = 3.0
        noisePattern = (angle: number) => Math.sin(angle * 3) * 0.4 + Math.sin(angle * 7) * 0.2
        break
      case 2: // Звездообразное озеро
        maxRadius = 3.7
        minRadius = 3.1
        noisePattern = (angle: number) => Math.sin(angle * 5) * 0.5 + Math.sin(angle * 3) * 0.3
        break
      case 3: // Каплевидное озеро
        maxRadius = 3.9
        minRadius = 3.3
        noisePattern = (angle: number) => Math.sin(angle * 2) * 0.3 + Math.sin(angle * 4) * 0.2 + Math.sin(angle * 6) * 0.1
        break
      default:
        maxRadius = 3.6
        minRadius = 3.2
        noisePattern = (angle: number) => Math.sin(angle * 2) * 0.2
    }
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const noise = noisePattern(angle)
      const radius = minRadius + (maxRadius - minRadius) * (0.5 + Math.sin(angle * 2) * 0.3) + noise
      
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius // Используем Z вместо Y для горизонтального расположения
      
      if (i === 0) {
        shape.moveTo(x, z)
      } else {
        shape.lineTo(x, z)
      }
    }
    
    shape.closePath()
    return shape
  }, [])

  // Создаем геометрию воды (без волн)
  const waterGeometry = useMemo(() => {
    return new THREE.ShapeGeometry(lakeShape)
  }, [lakeShape])
  
  // Создаем отдельную геометрию для волн
  const wavesGeometry = useMemo(() => {
    const geometry = new THREE.ShapeGeometry(lakeShape)
    
    // Добавляем только легкую рябь на поверхность
    const positions = geometry.attributes.position
    const vertexCount = positions.count
    
    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z = positions.getZ(i)
      
      const distanceFromCenter = Math.sqrt(x * x + z * z)
      
      // Только легкая рябь внутри озера
      if (distanceFromCenter < 3.0) {
        const ripple = Math.sin(x * 8) * Math.cos(z * 8) * 0.005
        positions.setY(i, y + ripple)
      }
    }
    
    geometry.computeVertexNormals()
    return geometry
  }, [lakeShape])
  
  // Генерируем случайные деревья вокруг озера
  const trees = useMemo(() => {
    const treeCount = Math.floor(Math.random() * 4) + 2 // 2-5 деревьев
    const treePositions = []
    
    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = 4.5 + Math.random() * 2 // Между 4.5 и 6.5 от центра
      const x = Math.cos(angle) * distance
      const z = Math.sin(angle) * distance
      const scale = 0.8 + Math.random() * 0.4 // Размер от 0.8 до 1.2
      const type = Math.random() > 0.5 ? 'tree' : 'spruce' // Случайный тип
      
      treePositions.push({ x, z, scale, type })
    }
    
    return treePositions
  }, [])

  // Создаем геометрию для пляжа с рельефом (вся клетка минус озеро)
  const beachGeometry = useMemo(() => {
    const cellShape = new THREE.Shape()
    
    // Создаем форму шестиугольной клетки
    const hexRadius = 6.2
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const x = Math.cos(angle) * hexRadius
      const z = Math.sin(angle) * hexRadius // Используем Z вместо Y для горизонтального расположения
      
      if (i === 0) {
        cellShape.moveTo(x, z)
      } else {
        cellShape.lineTo(x, z)
      }
    }
    cellShape.closePath()
    
    // Вычитаем форму озера из формы клетки
    const geometry = new THREE.ShapeGeometry([cellShape, lakeShape])
    
    // Добавляем рельеф песка через модификацию вершин
    const positions = geometry.attributes.position
    const vertexCount = positions.count
    
    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z = positions.getZ(i)
      
      // Создаем волнообразный рельеф песка
      const distanceFromCenter = Math.sqrt(x * x + z * z)
      const wave1 = Math.sin(distanceFromCenter * 0.8) * 0.1
      const wave2 = Math.sin(x * 2) * Math.cos(z * 2) * 0.075
      const wave3 = Math.sin(distanceFromCenter * 1.5) * 0.05
      
      // Применяем рельеф только к пляжу (не к воде)
      if (distanceFromCenter > 3.0) {
        positions.setY(i, y + wave1 + wave2 + wave3)
      }
    }
    
    geometry.computeVertexNormals()
    return geometry
  }, [lakeShape])

      return (
      <group ref={lakeRef} position={[0, 0.05, 0]} scale={[0.15, 0.15, 0.15]}>
      {/* Пляж по краям клетки с рельефом */}
      <mesh geometry={beachGeometry} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#F8F4E6" 
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Градиентный песок - светлые участки */}
      <mesh geometry={beachGeometry} position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#FEF9E7" 
          roughness={0.8}
          side={THREE.DoubleSide}
          transparent={true}
          opacity={0.4}
        />
      </mesh>
      
      {/* Градиентный песок - очень легкий желтый оттенок */}
      <mesh geometry={beachGeometry} position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#FEFBF0" 
          roughness={0.9}
          side={THREE.DoubleSide}
          transparent={true}
          opacity={0.25}
        />
      </mesh>
      
      {/* Градиентный песок - темные участки */}
      <mesh geometry={beachGeometry} position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#F7DC6F" 
          roughness={1.0}
          side={THREE.DoubleSide}
          transparent={true}
          opacity={0.1}
        />
      </mesh>
      
              {/* Вода озера */}
        <mesh ref={waterRef} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <primitive object={waterGeometry} />
          <meshStandardMaterial 
            color="#00CED1" // Бирюзовый
            transparent={true}
            opacity={0.6}
            roughness={0.05}
            metalness={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Слой волн поверх воды */}
        <mesh ref={wavesRef} position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <primitive object={wavesGeometry} />
          <meshStandardMaterial 
            color="#00CED1" // Бирюзовый
            transparent={true}
            opacity={0.3}
            roughness={0.1}
            metalness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Случайные деревья вокруг озера */}
        {trees.map((tree, index) => (
          <group key={index} position={[tree.x, 0, tree.z]} scale={[tree.scale, tree.scale, tree.scale]}>
            {/* Ствол */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.1, 0.15, 0.8, 6]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            
            {/* Крона */}
            {tree.type === 'spruce' ? (
              // Елка - три конуса
              <>
                <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
                  <coneGeometry args={[0.4, 0.8, 6]} />
                  <meshStandardMaterial color="#228B22" />
                </mesh>
                <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
                  <coneGeometry args={[0.3, 0.6, 6]} />
                  <meshStandardMaterial color="#32CD32" />
                </mesh>
                <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
                  <coneGeometry args={[0.2, 0.4, 6]} />
                  <meshStandardMaterial color="#90EE90" />
                </mesh>
              </>
            ) : (
              // Обычное дерево - сферическая крона
              <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
                <sphereGeometry args={[0.4, 8, 6]} />
                <meshStandardMaterial color="#228B22" />
              </mesh>
            )}
          </group>
        ))}
      
      {/* Дополнительные детали пляжа - только по краям */}
      <mesh position={[4.0, 0.23, 0.5]} castShadow receiveShadow>
        <coneGeometry args={[0.08, 0.15, 2]} />
        <meshStandardMaterial color="#FEF9E7" roughness={0.8} />
      </mesh>
      
      <mesh position={[-4.0, 0.23, 0.8]} castShadow receiveShadow>
        <coneGeometry args={[0.06, 0.12, 2]} />
        <meshStandardMaterial color="#F8F4E6" roughness={0.9} />
      </mesh>
      
      <mesh position={[3.6, 0.23, -3.6]} castShadow receiveShadow>
        <coneGeometry args={[0.1, 0.2, 3]} />
        <meshStandardMaterial color="#F7DC6F" roughness={0.8} />
      </mesh>
      
      <mesh position={[-3.4, 0.23, -3.4]} castShadow receiveShadow>
        <coneGeometry args={[0.08, 0.15, 2]} />
        <meshStandardMaterial color="#FEF9E7" roughness={0.8} />
      </mesh>
      
      {/* Пляжные камни - только по краям */}
      <mesh position={[4.1, 0.3, 0.5]} castShadow receiveShadow>
        <coneGeometry args={[0.06, 0.12, 2]} />
        <meshStandardMaterial color="#8B7355" roughness={0.9} />
      </mesh>
      
      <mesh position={[-4.1, 0.3, -0.2]} castShadow receiveShadow>
        <coneGeometry args={[0.05, 0.1, 2]} />
        <meshStandardMaterial color="#8B7355" roughness={0.9} />
      </mesh>
      
      <mesh position={[3.8, 0.3, -3.8]} castShadow receiveShadow>
        <coneGeometry args={[0.08, 0.15, 2]} />
        <meshStandardMaterial color="#8B7355" roughness={0.9} />
      </mesh>
      
      {/* Камни в воде */}
      <mesh position={[1.5, 0.3, 1.8]} castShadow receiveShadow>
        <coneGeometry args={[0.12, 0.25, 3]} />
        <meshStandardMaterial color="#696969" roughness={0.9} />
      </mesh>
      
      <mesh position={[-1.2, 0.3, -2.0]} castShadow receiveShadow>
        <coneGeometry args={[0.1, 0.2, 2]} />
        <meshStandardMaterial color="#696969" roughness={0.9} />
      </mesh>
      
      <mesh position={[1.0, 0.3, -0.8]} castShadow receiveShadow>
        <coneGeometry args={[0.15, 0.3, 4]} />
        <meshStandardMaterial color="#696969" roughness={0.9} />
      </mesh>
    </group>
  )
} 