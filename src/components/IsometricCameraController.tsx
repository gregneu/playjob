import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'

interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
  zoom: number
}

interface IsometricCameraControllerProps {
  mapSize: number
  children: React.ReactNode
  initialPosition?: [number, number]
  initialZoom?: number
}

// Конфигурация камеры
const cameraConfig = {
  zoom: {
    min: 5,
    max: 50,
    speed: 2,
    smoothing: 0.1
  },
  pan: {
    speed: 1.5,
    acceleration: 0.05,
    friction: 0.9,
    edgeScrollZone: 50 // pixels
  },
  // Правильный изометрический угол (сверху вниз)
  isometricAngle: {
    x: 20,
    y: 20,
    z: 20
  }
}

export function IsometricCameraController({
  mapSize,
  children,
  initialPosition = [0, 0],
  initialZoom = 20
}: IsometricCameraControllerProps) {
  const { gl, size } = useThree()
  const cameraRef = useRef<THREE.OrthographicCamera>(null)
  
  // Состояние камеры - только позиция и зум, без вращения
  const [cameraState, setCameraState] = useState<CameraState>({
    position: [initialPosition[0], initialPosition[1], 0],
    target: [0, 0, 0],
    zoom: initialZoom
  })

  // Состояние ввода
  const [inputState, setInputState] = useState({
    keys: new Set<string>(),
    mousePosition: [0, 0],
    isMiddleMouseDown: false,
    lastMousePosition: [0, 0]
  })

  // Плавные анимации
  const [smoothState, setSmoothState] = useState({
    targetPosition: [initialPosition[0], initialPosition[1], 0],
    targetZoom: initialZoom,
    velocity: [0, 0, 0]
  })

  // Вычисление границ карты
  const calculateMapBounds = useCallback(() => {
    const hexSize = 0.866 // Размер гексагона
    const mapRadius = mapSize * hexSize
    return {
      minX: -mapRadius,
      maxX: mapRadius,
      minY: -mapRadius,
      maxY: mapRadius
    }
  }, [mapSize])

  // Ограничение позиции камеры в границах карты
  const clampPosition = useCallback((position: [number, number, number]) => {
    const bounds = calculateMapBounds()
    const currentZoom = cameraState.zoom
    const zoomFactor = currentZoom / 20 // Нормализация зума

    return [
      Math.max(bounds.minX, Math.min(bounds.maxX, position[0])),
      Math.max(bounds.minY, Math.min(bounds.maxY, position[1])),
      position[2]
    ] as [number, number, number]
  }, [cameraState.zoom, calculateMapBounds])

  // Обработка зума
  const handleZoom = useCallback((delta: number) => {
    const zoomSpeed = cameraConfig.zoom.speed
    const newZoom = Math.max(
      cameraConfig.zoom.min,
      Math.min(cameraConfig.zoom.max, cameraState.zoom - delta * zoomSpeed)
    )
    
    setSmoothState(prev => ({
      ...prev,
      targetZoom: newZoom
    }))
  }, [cameraState.zoom])

  // Обработка панорамирования - только перемещение, без вращения
  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    const panSpeed = cameraConfig.pan.speed
    const currentZoom = cameraState.zoom
    const zoomFactor = currentZoom / 20

    // Простое перемещение камеры по X и Y
    const newPosition: [number, number, number] = [
      cameraState.position[0] + deltaX * panSpeed * zoomFactor,
      cameraState.position[1] - deltaY * panSpeed * zoomFactor,
      cameraState.position[2] // Z остается фиксированным
    ]

    const clampedPosition = clampPosition(newPosition)
    setSmoothState(prev => ({
      ...prev,
      targetPosition: clampedPosition
    }))
  }, [cameraState.position, cameraState.zoom, clampPosition])

  // Обработка клавиатуры
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        setInputState(prev => ({
          ...prev,
          keys: new Set([...prev.keys, key])
        }))
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      setInputState(prev => {
        const newKeys = new Set(prev.keys)
        newKeys.delete(key)
        return { ...prev, keys: newKeys }
      })
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      handleZoom(event.deltaY * 0.01)
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 1) { // Middle mouse
        setInputState(prev => ({
          ...prev,
          isMiddleMouseDown: true,
          lastMousePosition: [event.clientX, event.clientY]
        }))
      }
    }

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 1) {
        setInputState(prev => ({
          ...prev,
          isMiddleMouseDown: false
        }))
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      setInputState(prev => ({
        ...prev,
        mousePosition: [event.clientX, event.clientY]
      }))

      if (prev.isMiddleMouseDown) {
        const deltaX = event.clientX - prev.lastMousePosition[0]
        const deltaY = event.clientY - prev.lastMousePosition[1]
        handlePan(deltaX, deltaY)
        setInputState(prev => ({
          ...prev,
          lastMousePosition: [event.clientX, event.clientY]
        }))
      }
    }

    // Edge scrolling
    const handleEdgeScroll = () => {
      const edgeZone = cameraConfig.pan.edgeScrollZone
      const [mouseX, mouseY] = inputState.mousePosition
      
      let deltaX = 0
      let deltaY = 0

      if (mouseX < edgeZone) {
        deltaX = -1
      } else if (mouseX > size.width - edgeZone) {
        deltaX = 1
      }

      if (mouseY < edgeZone) {
        deltaY = 1
      } else if (mouseY > size.height - edgeZone) {
        deltaY = -1
      }

      if (deltaX !== 0 || deltaY !== 0) {
        handlePan(deltaX * 2, deltaY * 2)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)

    const edgeScrollInterval = setInterval(handleEdgeScroll, 16) // 60fps

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      clearInterval(edgeScrollInterval)
    }
  }, [handleZoom, handlePan, inputState.mousePosition, size.width, size.height])

  // Плавные анимации камеры
  useFrame(() => {
    if (!cameraRef.current) return

    const smoothing = cameraConfig.zoom.smoothing

    // Плавный зум
    const zoomDiff = smoothState.targetZoom - cameraState.zoom
    if (Math.abs(zoomDiff) > 0.01) {
      setCameraState(prev => ({
        ...prev,
        zoom: prev.zoom + zoomDiff * smoothing
      }))
    }

    // Плавное панорамирование
    const positionDiff = [
      smoothState.targetPosition[0] - cameraState.position[0],
      smoothState.targetPosition[1] - cameraState.position[1],
      smoothState.targetPosition[2] - cameraState.position[2]
    ]

    if (Math.abs(positionDiff[0]) > 0.01 || Math.abs(positionDiff[1]) > 0.01) {
      setCameraState(prev => ({
        ...prev,
        position: [
          prev.position[0] + positionDiff[0] * smoothing,
          prev.position[1] + positionDiff[1] * smoothing,
          prev.position[2] + positionDiff[2] * smoothing
        ]
      }))
    }

    // Обработка WASD - только перемещение, без вращения
    const keys = inputState.keys
    let panX = 0
    let panY = 0

    if (keys.has('w') || keys.has('arrowup')) panY += 1
    if (keys.has('s') || keys.has('arrowdown')) panY -= 1
    if (keys.has('a') || keys.has('arrowleft')) panX -= 1
    if (keys.has('d') || keys.has('arrowright')) panX += 1

    if (panX !== 0 || panY !== 0) {
      handlePan(panX * 2, panY * 2)
    }

    // Обновление камеры - фиксированный изометрический угол
    cameraRef.current.position.set(
      cameraState.position[0] + cameraConfig.isometricAngle.x,
      cameraState.position[1] + cameraConfig.isometricAngle.y,
      cameraState.position[2] + cameraConfig.isometricAngle.z
    )
    cameraRef.current.lookAt(
      cameraState.target[0],
      cameraState.target[1],
      cameraState.target[2]
    )
    cameraRef.current.zoom = cameraState.zoom
    cameraRef.current.updateProjectionMatrix()
  })

  return (
    <>
      <OrthographicCamera
        ref={cameraRef}
        position={[
          cameraConfig.isometricAngle.x,
          cameraConfig.isometricAngle.y,
          cameraConfig.isometricAngle.z
        ]}
        zoom={cameraState.zoom}
        near={0.1}
        far={1000}
        makeDefault
      />
      {children}
    </>
  )
} 