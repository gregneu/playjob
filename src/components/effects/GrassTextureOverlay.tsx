import React, { useMemo } from 'react'
import * as THREE from 'three'

interface GrassTextureOverlayProps {
  radius?: number
  colorBase?: string
  colorLight?: string
  noiseScale?: number
  opacity?: number
}

export const GrassTextureOverlay: React.FC<GrassTextureOverlayProps> = ({
  radius = 1.05,
  colorBase = '#a7e3a1',
  colorLight = '#c9f1c6',
  noiseScale = 64,
  opacity = 1.0,
}) => {
  const texture = useMemo(() => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    // Base fill
    ctx.fillStyle = colorBase
    ctx.fillRect(0, 0, size, size)
    // Noise strokes to emulate blades
    const light = colorLight
    ctx.strokeStyle = light
    ctx.lineWidth = 1
    const rand = (n: number) => Math.random() * n
    const count = Math.floor(size * 180)
    for (let i = 0; i < count; i++) {
      const x = rand(size)
      const y = rand(size)
      const len = 3 + Math.random() * 10
      const angle = (Math.random() - 0.5) * 0.6
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle)
      ctx.globalAlpha = 0.25 + Math.random() * 0.4
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -len)
      ctx.stroke()
      ctx.restore()
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(noiseScale / 64, noiseScale / 64)
    tex.anisotropy = 4
    tex.needsUpdate = true
    return tex
  }, [colorBase, colorLight, noiseScale])

  // Hex tile: cylinder with 6 segments, scaled to radius
  return (
    <mesh rotation={[-Math.PI / 2, Math.PI / 6, 0]} position={[0, 0.061, 0]}>
      {/* Hex polygon (flat-top): 6 segments */}
      <circleGeometry args={[radius, 6]} />
      <meshStandardMaterial
        map={texture}
        color={new THREE.Color('#6CBF3B')}
        roughness={0.9}
        metalness={0}
        transparent
        opacity={opacity}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  )
}


