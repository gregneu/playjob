import { useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'

interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
  zoom: number
}

interface SmoothState {
  targetPosition: [number, number, number]
  targetZoom: number
  velocity: [number, number, number]
}

// Главный хук для управления изометрической камерой
export function useIsometricCamera(
  initialPosition: [number, number] = [0, 0],
  initialZoom: number = 20
) {
  const [cameraState, setCameraState] = useState<CameraState>({
    position: [initialPosition[0], initialPosition[1], 0],
    target: [0, 0, 0],
    zoom: initialZoom
  })

  const [smoothState, setSmoothState] = useState<SmoothState>({
    targetPosition: [initialPosition[0], initialPosition[1], 0],
    targetZoom: initialZoom,
    velocity: [0, 0, 0]
  })

  const updateCamera = useCallback((newState: Partial<CameraState>) => {
    setCameraState(prev => ({ ...prev, ...newState }))
  }, [])

  const updateSmoothTarget = useCallback((newTarget: Partial<SmoothState>) => {
    setSmoothState(prev => ({ ...prev, ...newTarget }))
  }, [])

  return {
    cameraState,
    smoothState,
    updateCamera,
    updateSmoothTarget
  }
}

// Хук для управления панорамированием
export function usePanControls(
  cameraState: CameraState,
  updateSmoothTarget: (target: Partial<SmoothState>) => void,
  mapSize: number
) {
  const calculateMapBounds = useCallback(() => {
    const hexSize = 0.866
    const mapRadius = mapSize * hexSize
    return {
      minX: -mapRadius,
      maxX: mapRadius,
      minY: -mapRadius,
      maxY: mapRadius
    }
  }, [mapSize])

  const clampPosition = useCallback((position: [number, number, number]) => {
    const bounds = calculateMapBounds()
    const currentZoom = cameraState.zoom
    const zoomFactor = currentZoom / 20

    return [
      Math.max(bounds.minX, Math.min(bounds.maxX, position[0])),
      Math.max(bounds.minY, Math.min(bounds.maxY, position[1])),
      position[2]
    ] as [number, number, number]
  }, [cameraState.zoom, calculateMapBounds])

  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    const panSpeed = 1.5
    const currentZoom = cameraState.zoom
    const zoomFactor = currentZoom / 20

    const newPosition: [number, number, number] = [
      cameraState.position[0] + deltaX * panSpeed * zoomFactor,
      cameraState.position[1] - deltaY * panSpeed * zoomFactor,
      cameraState.position[2]
    ]

    const clampedPosition = clampPosition(newPosition)
    updateSmoothTarget({ targetPosition: clampedPosition })
  }, [cameraState.position, cameraState.zoom, clampPosition, updateSmoothTarget])

  return {
    handlePan,
    clampPosition,
    calculateMapBounds
  }
}

// Хук для управления зумом
export function useZoomControls(
  cameraState: CameraState,
  updateSmoothTarget: (target: Partial<SmoothState>) => void
) {
  const handleZoom = useCallback((delta: number) => {
    const zoomSpeed = 2
    const minZoom = 5
    const maxZoom = 50
    
    const newZoom = Math.max(
      minZoom,
      Math.min(maxZoom, cameraState.zoom - delta * zoomSpeed)
    )
    
    updateSmoothTarget({ targetZoom: newZoom })
  }, [cameraState.zoom, updateSmoothTarget])

  return {
    handleZoom
  }
}

// Хук для ограничений камеры
export function useCameraBounds(
  mapSize: number,
  cameraState: CameraState
) {
  const calculateBounds = useCallback(() => {
    const hexSize = 0.866
    const mapRadius = mapSize * hexSize
    const currentZoom = cameraState.zoom
    const zoomFactor = currentZoom / 20

    return {
      minX: -mapRadius * zoomFactor,
      maxX: mapRadius * zoomFactor,
      minY: -mapRadius * zoomFactor,
      maxY: mapRadius * zoomFactor
    }
  }, [mapSize, cameraState.zoom])

  const isWithinBounds = useCallback((position: [number, number, number]) => {
    const bounds = calculateBounds()
    return (
      position[0] >= bounds.minX &&
      position[0] <= bounds.maxX &&
      position[1] >= bounds.minY &&
      position[1] <= bounds.maxY
    )
  }, [calculateBounds])

  return {
    calculateBounds,
    isWithinBounds
  }
} 