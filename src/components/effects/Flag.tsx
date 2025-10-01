import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface FlagProps {
  text: string
  position?: [number, number, number]
  rotationY?: number
  poleHeight?: number
  flagWidth?: number
  flagHeight?: number
  color?: string
}

// Waving flag with dynamic texture containing provided text
export const Flag: React.FC<FlagProps> = ({
  text,
  position = [0, 0, 0],
  rotationY = 0,
  poleHeight = 2.6,
  flagWidth = 1.8,
  flagHeight = 1.1,
  color = '#17162B'
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const texture = useMemo(() => {
    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
    const w = Math.round(1024 * dpr)
    const h = Math.round(512 * dpr)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!

    // Background
    // Helpers to get lighter/darker variants of provided color
    const darken = (hex: string, factor: number) => {
      const h = hex.replace('#', '')
      const r = Math.max(0, Math.min(255, Math.floor(parseInt(h.slice(0, 2), 16) * (1 - factor))))
      const g = Math.max(0, Math.min(255, Math.floor(parseInt(h.slice(2, 4), 16) * (1 - factor))))
      const b = Math.max(0, Math.min(255, Math.floor(parseInt(h.slice(4, 6), 16) * (1 - factor))))
      const toHex = (v: number) => v.toString(16).padStart(2, '0')
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    }
    const lighten = (hex: string, factor: number) => {
      const h = hex.replace('#', '')
      const r = Math.max(0, Math.min(255, Math.floor(parseInt(h.slice(0, 2), 16) + (255 - parseInt(h.slice(0, 2), 16)) * factor)))
      const g = Math.max(0, Math.min(255, Math.floor(parseInt(h.slice(2, 4), 16) + (255 - parseInt(h.slice(2, 4), 16)) * factor)))
      const b = Math.max(0, Math.min(255, Math.floor(parseInt(h.slice(4, 6), 16) + (255 - parseInt(h.slice(4, 6), 16)) * factor)))
      const toHex = (v: number) => v.toString(16).padStart(2, '0')
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    }
    const topLeft = lighten(color, 0.08)
    const bottomRight = darken(color, 0.32)
    // Diagonal gradient for a richer cloth look
    const grd = ctx.createLinearGradient(0, 0, w, h)
    grd.addColorStop(0, topLeft)
    grd.addColorStop(1, bottomRight)
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, w, h)

    // Subtle stripe
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    for (let i = 0; i < 6; i++) {
      const y = Math.round((i + 1) * (h / 7))
      ctx.fillRect(0, y, w, 4)
    }

    // Gentle highlight along the free edge (right side)
    const edge = ctx.createLinearGradient(w * 0.7, 0, w, 0)
    edge.addColorStop(0, 'rgba(255,255,255,0.0)')
    edge.addColorStop(1, 'rgba(255,255,255,0.10)')
    ctx.fillStyle = edge
    ctx.fillRect(0, 0, w, h)

    // Text
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `${Math.round(h * 0.34)}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const maxWidth = Math.round(w * 0.86)
    const baseText = (text || '').trim()

    const wrapWords = (input: string) => {
      if (!input) return ['']
      const words = input.split(/\s+/)
      const lines: string[] = []
      let current = ''

      const pushCurrent = () => {
        if (current.length) {
          lines.push(current)
          current = ''
        }
      }

      const pushWithHyphenation = (word: string) => {
        let segment = ''
        for (const char of word) {
          const test = segment + char
          if (ctx.measureText(test).width > maxWidth && segment.length) {
            lines.push(segment)
            segment = char
          } else {
            segment = test
          }
        }
        if (segment.length) {
          if (ctx.measureText(segment).width > maxWidth && segment.length > 1) {
            let trimmed = segment
            while (ctx.measureText(trimmed).width > maxWidth && trimmed.length > 1) {
              trimmed = trimmed.slice(0, -1)
            }
            lines.push(trimmed)
          } else {
            lines.push(segment)
          }
        }
      }

      for (const word of words) {
        if (!word) continue
        const tentative = current ? `${current} ${word}` : word
        if (ctx.measureText(tentative).width <= maxWidth) {
          current = tentative
        } else {
          pushCurrent()
          if (ctx.measureText(word).width > maxWidth) {
            pushWithHyphenation(word)
          } else {
            current = word
          }
        }
      }

      pushCurrent()
      return lines.length ? lines : ['']
    }

    let lines = wrapWords(baseText)

    if (lines.length > 2) {
      const ellipsis = '...'
      const rest = lines.slice(1).join(' ')
      let second = rest.trim()
      while (ctx.measureText(`${second}${ellipsis}`).width > maxWidth && second.length > 0) {
        second = second.slice(0, -1)
      }
      lines = [lines[0], `${second}${ellipsis}`]
    }

    const lineHeight = Math.round(h * 0.34)
    const totalHeight = lineHeight * lines.length
    let y = h / 2 - (totalHeight - lineHeight) / 2

    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 8
    for (const line of lines) {
      ctx.fillText(line, w / 2, y)
      y += lineHeight
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }, [text, color])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMap: { value: texture },
      uAmp: { value: 0.12 },
      uFreq: { value: 2.6 },
      uSpeed: { value: 1.2 },
      uCorner: { value: 0.08 } // 0..0.5 in UV space
    }),
    [texture]
  )

  useFrame((_, delta) => {
    if (materialRef.current) {
      // Ограничиваем delta для предотвращения скачков при переключении табов
      const clampedDelta = Math.min(delta, 1/30) // Максимум 1/30 секунды (30 FPS)
      materialRef.current.uniforms.uTime.value += clampedDelta
    }
  })

  const vertex = `
    varying vec2 vUv;
    uniform float uTime;
    uniform float uAmp;
    uniform float uFreq;
    uniform float uSpeed;
    void main() {
      vUv = uv;
      vec3 p = position;
      // wave along X (flag length), stronger at the free end (x=1.0 in uv)
      float edge = vUv.x; // 0 at pole, 1 at far edge
      float wave = sin((vUv.y * 3.1415 + uTime * uSpeed) + vUv.x * uFreq) * uAmp * edge;
      p.z += wave;
      p.y += wave * 0.35;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `

  const fragment = `
    varying vec2 vUv;
    uniform sampler2D uMap;
    uniform float uCorner;
    
    // Signed distance to a rounded rectangle centered at 0.5 with half-size 0.5
    float sdRoundRect(vec2 uv, vec2 halfSize, float r) {
      vec2 p = uv - vec2(0.5);
      vec2 q = abs(p) - (halfSize - vec2(r));
      return length(max(q, 0.0)) - r;
    }
    
    void main() {
      vec4 col = texture2D(uMap, vUv);
      // Slight darkening near folds using vUv.x (free edge brighter)
      float shade = mix(0.9, 1.05, vUv.x);
      vec3 rgb = col.rgb * shade;
      
      // Rounded corners alpha mask
      float d = sdRoundRect(vUv, vec2(0.5), clamp(uCorner, 0.0, 0.5));
      float aa = fwidth(d) * 1.5;
      float mask = smoothstep(0.0, aa, -d);
      
      gl_FragColor = vec4(rgb, col.a * mask);
    }
  `

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Pole anchored at group's origin (center of cell) */}
      <mesh castShadow receiveShadow position={[0, poleHeight / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.035, poleHeight, 16]} />
        <meshStandardMaterial color="#8B8B8B" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, poleHeight + 0.05, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#D9D9D9" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* Flag cloth */}
      {/* Offset cloth so its left edge attaches to the pole at x=0 */}
      <mesh castShadow receiveShadow position={[flagWidth * 0.5, poleHeight * 0.78, 0]}>
        <planeGeometry args={[flagWidth, flagHeight, 48, 24]} />
        <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default Flag


