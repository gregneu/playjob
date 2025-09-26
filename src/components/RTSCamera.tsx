import React, { useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface RTSCameraProps {
  // Настройки камеры
  fov?: number
  minHeight?: number
  maxHeight?: number
  minDistance?: number
  maxDistance?: number
  // Настройки движения
  moveSpeed?: number
  zoomSpeed?: number
  rotationSpeed?: number
  // Настройки зон движения
  edgeZoneSize?: number
  // Целевая позиция для камеры
  targetPosition?: [number, number, number]
  // Блокировка управления камерой
  disabled?: boolean
  // Блокировка при открытой модалке
  isModalOpen?: boolean
}

export const RTSCamera: React.FC<RTSCameraProps> = ({
  fov = 50,
  minHeight = 10,
  maxHeight = 80,
  minDistance = 5,
  maxDistance = 100,
  moveSpeed = 0.1,
  zoomSpeed = 0.05,
  rotationSpeed = 0.02,
  edgeZoneSize = 50,
  targetPosition = [0, 0, 0],
  disabled = false,
  isModalOpen = false
}) => {
  const { camera, gl } = useThree()
  const cameraRef = useRef<THREE.PerspectiveCamera>(camera as THREE.PerspectiveCamera)
  
  // Состояние камеры
  const cameraState = useRef({
    position: new THREE.Vector3(0, 30, 20),
    target: new THREE.Vector3(...targetPosition),
    rotation: 0,
    height: 30,
    distance: 20
  })

  // Состояние управления
  const controls = useRef({
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    rotateLeft: false,
    rotateRight: false,
    zoomIn: false,
    zoomOut: false,
    mouseX: 0,
    mouseY: 0,
    isMouseInEdgeZone: false,
    edgeDirection: new THREE.Vector2(0, 0)
  })

  // Инициализация камеры
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.fov = fov
      cameraRef.current.updateProjectionMatrix()
      
      // Устанавливаем начальную позицию
      cameraRef.current.position.copy(cameraState.current.position)
      cameraRef.current.lookAt(cameraState.current.target)
    }
  }, [fov])

  // Обработчики клавиатуры
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled || isModalOpen) return // Блокируем управление если камера отключена или модалка открыта
    
    const key = event.key.toLowerCase()
    
    switch (key) {
      case 'w':
      case 'arrowup':
        controls.current.moveForward = true
        break
      case 's':
      case 'arrowdown':
        controls.current.moveBackward = true
        break
      case 'a':
      case 'arrowleft':
        controls.current.moveLeft = true
        break
      case 'd':
      case 'arrowright':
        controls.current.moveRight = true
        break
      case 'q':
        controls.current.rotateLeft = true
        break
      case 'e':
        controls.current.rotateRight = true
        break
      case '=':
      case '+':
        controls.current.zoomIn = true
        break
      case '-':
        controls.current.zoomOut = true
        break
    }
  }, [disabled, isModalOpen])

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    
    switch (key) {
      case 'w':
      case 'arrowup':
        controls.current.moveForward = false
        break
      case 's':
      case 'arrowdown':
        controls.current.moveBackward = false
        break
      case 'a':
      case 'arrowleft':
        controls.current.moveLeft = false
        break
      case 'd':
      case 'arrowright':
        controls.current.moveRight = false
        break
      case 'q':
        controls.current.rotateLeft = false
        break
      case 'e':
        controls.current.rotateRight = false
        break
      case '=':
      case '+':
        controls.current.zoomIn = false
        break
      case '-':
        controls.current.zoomOut = false
        break
    }
  }, [])

  // Обработчик движения мыши
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (disabled || isModalOpen) return // Блокируем управление если камера отключена или модалка открыта
    
    const rect = gl.domElement.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    controls.current.mouseX = x
    controls.current.mouseY = y
    
    // Проверяем, находится ли мышь в зоне края экрана
    const edgeZone = edgeZoneSize
    const width = rect.width
    const height = rect.height
    
    let edgeX = 0
    let edgeY = 0
    
    if (x < edgeZone) {
      edgeX = -1
    } else if (x > width - edgeZone) {
      edgeX = 1
    }
    
    if (y < edgeZone) {
      edgeY = -1
    } else if (y > height - edgeZone) {
      edgeY = 1
    }
    
    controls.current.edgeDirection.set(edgeX, edgeY)
    controls.current.isMouseInEdgeZone = edgeX !== 0 || edgeY !== 0
  }, [gl, edgeZoneSize, disabled, isModalOpen])

  // Обработчик колесика мыши
  const handleWheel = useCallback((event: WheelEvent) => {
    if (disabled || isModalOpen) return // Блокируем управление если камера отключена или модалка открыта
    
    event.preventDefault()
    
    // Более плавное изменение зума с меньшими множителями
    const zoomDelta = event.deltaY * 0.005 // Уменьшаем чувствительность для плавности
    const state = cameraState.current
    
    if (event.deltaY > 0) {
      // Zoom out - более плавно
      state.height = Math.min(maxHeight, state.height + Math.abs(zoomDelta) * 8)
      state.distance = Math.min(maxDistance, state.distance + Math.abs(zoomDelta) * 4)
    } else {
      // Zoom in - более плавно
      state.height = Math.max(minHeight, state.height - Math.abs(zoomDelta) * 8)
      state.distance = Math.max(minDistance, state.distance - Math.abs(zoomDelta) * 4)
    }
  }, [disabled, isModalOpen, minHeight, maxHeight, minDistance, maxDistance])

  // Устанавливаем обработчики событий
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('wheel', handleWheel)
    }
  }, [handleKeyDown, handleKeyUp, handleMouseMove, handleWheel])

  // Переиспользуемые объекты для оптимизации
  const tempVector = useRef(new THREE.Vector3())
  const tempMatrix = useRef(new THREE.Matrix4())
  
  // Анимация камеры (оптимизированная)
  useFrame(() => {
    if (!cameraRef.current || disabled || isModalOpen) return // Блокируем анимацию если камера отключена или модалка открыта

    const state = cameraState.current
    const ctrl = controls.current
    
    // Вычисляем направление движения (переиспользуем объект)
    const moveDirection = tempVector.current.set(0, 0, 0)
    
    // Движение по клавишам
    if (ctrl.moveForward) moveDirection.z -= 1
    if (ctrl.moveBackward) moveDirection.z += 1
    if (ctrl.moveLeft) moveDirection.x -= 1
    if (ctrl.moveRight) moveDirection.x += 1
    
    // Нормализуем направление движения
    if (moveDirection.length() > 0) {
      moveDirection.normalize()
      
      // Применяем поворот камеры к направлению движения (переиспользуем матрицу)
      const rotationMatrix = tempMatrix.current
      rotationMatrix.makeRotationY(state.rotation)
      moveDirection.applyMatrix4(rotationMatrix)
      
      // Обновляем позицию камеры
      const moveAmount = moveSpeed
      state.position.x += moveDirection.x * moveAmount
      state.position.z += moveDirection.z * moveAmount
      state.target.x += moveDirection.x * moveAmount
      state.target.z += moveDirection.z * moveAmount
    }
    
    // Поворот камеры
    if (ctrl.rotateLeft) {
      state.rotation += rotationSpeed
    }
    if (ctrl.rotateRight) {
      state.rotation -= rotationSpeed
    }
    
    // Зум камеры теперь обрабатывается напрямую в handleWheel
    
    // Вычисляем позицию камеры на основе высоты, расстояния и поворота (переиспользуем объект)
    const cameraPosition = tempVector.current.set(
      state.target.x + Math.sin(state.rotation) * state.distance,
      state.height,
      state.target.z + Math.cos(state.rotation) * state.distance
    )
    
    // Плавно перемещаем камеру (уменьшаем скорость для более плавного зума)
    cameraRef.current.position.lerp(cameraPosition, 0.08)
    cameraRef.current.lookAt(state.target.x, state.target.y, state.target.z)
  })

  return null
} 