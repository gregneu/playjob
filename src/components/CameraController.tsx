import React, { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { CameraState } from '../types/dorfromantik'

interface CameraControllerProps {
  minZoom: number
  maxZoom: number
  initialZoom?: number
  onCameraChange?: (state: CameraState) => void
}

export const CameraController: React.FC<CameraControllerProps> = ({
  minZoom = 0.5,
  maxZoom = 3,
  initialZoom = 1,
  onCameraChange
}) => {
  const { camera } = useThree()
  const isPanning = useRef(false)
  const lastMousePosition = useRef({ x: 0, y: 0 })
  const targetPosition = useRef(new Vector3(0, 0, 0))
  const currentZoom = useRef(initialZoom)

  // Инициализация изометрической камеры
  useEffect(() => {
    // Устанавливаем изометрический угол (45 градусов по X и Y)
    const distance = 20 * currentZoom.current
    camera.position.set(distance, distance, distance)
    camera.lookAt(targetPosition.current)
    camera.updateMatrixWorld()

    if (onCameraChange) {
      onCameraChange({
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [targetPosition.current.x, targetPosition.current.y, targetPosition.current.z],
        zoom: currentZoom.current
      })
    }
  }, [camera, onCameraChange])

  // Обработка зума колесиком мыши
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      
      const zoomSpeed = 0.1
      const zoomDelta = event.deltaY > 0 ? -zoomSpeed : zoomSpeed
      
      currentZoom.current = Math.max(minZoom, Math.min(maxZoom, currentZoom.current + zoomDelta))
      
      // Обновляем позицию камеры с новым зумом
      const distance = 20 * currentZoom.current
      camera.position.set(distance, distance, distance)
      camera.lookAt(targetPosition.current)
      camera.updateMatrixWorld()

      if (onCameraChange) {
        onCameraChange({
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: [targetPosition.current.x, targetPosition.current.y, targetPosition.current.z],
          zoom: currentZoom.current
        })
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [camera, minZoom, maxZoom, onCameraChange])

  // Обработка панорамирования
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0) { // Левая кнопка мыши
        isPanning.current = true
        lastMousePosition.current = { x: event.clientX, y: event.clientY }
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!isPanning.current) return

      const deltaX = event.clientX - lastMousePosition.current.x
      const deltaY = event.clientY - lastMousePosition.current.y

      // Панорамирование в изометрической проекции
      const panSpeed = 0.01 * currentZoom.current
      const right = new Vector3(1, 0, -1).normalize()
      const up = new Vector3(0, 1, 0)

      targetPosition.current.add(right.multiplyScalar(-deltaX * panSpeed))
      targetPosition.current.add(up.multiplyScalar(-deltaY * panSpeed))

      camera.lookAt(targetPosition.current)
      camera.updateMatrixWorld()

      lastMousePosition.current = { x: event.clientX, y: event.clientY }

      if (onCameraChange) {
        onCameraChange({
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: [targetPosition.current.x, targetPosition.current.y, targetPosition.current.z],
          zoom: currentZoom.current
        })
      }
    }

    const handleMouseUp = () => {
      isPanning.current = false
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [camera, onCameraChange])

  // Плавная анимация камеры
  useFrame(() => {
    if (isPanning.current) {
      // Плавное следование за целью
      const lerpFactor = 0.1
      camera.position.lerp(new Vector3(
        20 * currentZoom.current,
        20 * currentZoom.current,
        20 * currentZoom.current
      ), lerpFactor)
    }
  })

  return null
} 