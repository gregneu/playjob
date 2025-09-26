import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

type Deg = 0 | 90 | 180 | 270

export interface ProceduralHouseRules {
  seed?: number
  fitDiameter?: number
  footprint?: { width: number; depth: number }
  maxFloors?: number
}

interface ModuleSpec {
  id: string
  src: string
  node?: string
}

const DEFAULT_FOOTPRINT: ProceduralHouseRules['footprint'] = { width: 4, depth: 4 }

const degToRad = (deg: Deg) => (deg * Math.PI) / 180

const gridKey = (x: number, y: number, z: number) => `${x}:${y}:${z}`

export const ProceduralGLBHouse: React.FC<{
  rules?: ProceduralHouseRules
  modules: {
    baseCubes: ModuleSpec[]
    lShaped: ModuleSpec[]
    mixed: ModuleSpec[]
    slats: ModuleSpec
    railings: ModuleSpec
    roof: ModuleSpec
  }
}> = React.memo(({ rules, modules }) => {
  const seed = rules?.seed ?? 123
  const rng = useMemo(() => {
    let s = seed >>> 0
    return () => {
      // xorshift32
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5
      return (s >>> 0) / 0xffffffff
    }
  }, [seed])

  // Load all GLBs in one hook call to respect React hook rules
  const allSpecs: ModuleSpec[] = useMemo(() => (
    [
      ...(modules.baseCubes || []),
      ...(modules.lShaped || []),
      ...(modules.mixed || []),
      modules.slats,
      modules.railings,
      modules.roof
    ].filter(Boolean) as ModuleSpec[]
  ), [modules])
  const allPaths = useMemo(() => allSpecs.map(s => s.src), [allSpecs])
  const gltfs = useLoader(GLTFLoader, allPaths)
  const pathToScene = useMemo(() => {
    const m = new Map<string, THREE.Object3D>()
    allPaths.forEach((p, i) => {
      const gltf: any = (Array.isArray(gltfs) ? gltfs[i] : gltfs)
      m.set(p, gltf.scene)
    })
    return m
  }, [allPaths, gltfs])

  const createGradientTexture = (stops: string[]) => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
    const n = Math.max(3, stops.length)
    // "вязный" градиент: неравномерное распределение стопов (липкий, более густой переход)
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      const eased = Math.pow(t, 0.65) // сдвиг плотности к началу
      grad.addColorStop(eased, stops[i % stops.length])
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    tex.needsUpdate = true
    return tex
  }

  const applyMaterialStyle = (scene: THREE.Object3D, opts: { tint?: string; gradient?: string[] }) => {
    const gradientTex = opts.gradient ? createGradientTexture(opts.gradient) : null
    const tintColor = opts.tint ? new THREE.Color(opts.tint) : null
    try {
      scene.traverse((obj: any) => {
        if (!obj || obj.type !== 'Mesh') return
        const mesh = obj as THREE.Mesh
        if (Object.prototype.hasOwnProperty.call(mesh, 'castShadow')) (mesh as any).castShadow = true
        if (Object.prototype.hasOwnProperty.call(mesh, 'receiveShadow')) (mesh as any).receiveShadow = true
        if (gradientTex) {
          mesh.material = new THREE.MeshStandardMaterial({ map: gradientTex, roughness: 0.8, metalness: 0.1 })
        } else if (tintColor) {
          mesh.material = new THREE.MeshStandardMaterial({ color: tintColor, roughness: 0.8, metalness: 0.1 })
        }
      })
    } catch (e) {
      console.warn('applyMaterialStyle traverse failed', e)
    }
  }

  const normalizeToUnit = (source: THREE.Object3D, style?: { tint?: string; gradient?: string[] }) => {
    const base = source.clone(true)
    if (style) applyMaterialStyle(base, style)
    const bbox = new THREE.Box3().setFromObject(base)
    const size = new THREE.Vector3()
    bbox.getSize(size)
    const maxXZ = Math.max(size.x, size.z) || 1
    const fit = 1 / maxXZ
    const group = new THREE.Group()
    const wrapped = base.clone(true)
    wrapped.scale.set(fit, fit, fit)
    const bbox2 = new THREE.Box3().setFromObject(wrapped)
    const size2 = new THREE.Vector3()
    const center2 = new THREE.Vector3()
    bbox2.getSize(size2)
    bbox2.getCenter(center2)
    wrapped.position.set(-center2.x, -(center2.y - size2.y / 2), -center2.z)
    group.add(wrapped)
    return { object: group, unitHeight: size2.y }
  }

  const house = useMemo(() => {
    // Exactly two blocks filling the cell: bottom Mixed, top L-shape
    const placed: Array<{ object: THREE.Object3D; position: [number, number, number]; rotationY: Deg }> = []

    const mixedSpec = modules.mixed[0]
    const lSpec = modules.lShaped[0]
    // gradient palettes similar to trees (soft vertical shades)
    const mixedStopsVariants = [
      // яркие тёплые (жёлтые/оранжевые)
      ['#FFF176', '#FFD54F', '#FFB300'],
      ['#FFE082', '#FFCA28', '#FB8C00'],
      // яркие холодные (голубые)
      ['#80DEEA', '#26C6DA', '#0097A7'],
      // контрастные фиолетово‑розовые
      ['#E1BEE7', '#BA68C8', '#8E24AA']
    ]
    const lStopsVariants = [
      // сиренево‑фиолетовые
      ['#E1BEE7', '#AB47BC', '#6A1B9A'],
      // яркий лайм→жёлтый
      ['#DCE775', '#FFD54F', '#FFA000'],
      // свежий мятный
      ['#A7FFEB', '#64FFDA', '#1DE9B6']
    ]
    const seededPick = (len: number, salt: number) => {
      const v = (((seed >>> 0) ^ (salt >>> 0)) * 2654435761) >>> 0
      return v % Math.max(1, len)
    }
    const mixedStops = mixedStopsVariants[seededPick(mixedStopsVariants.length, 0x9e3779b1)]
    const lStops = lStopsVariants[seededPick(lStopsVariants.length, 0x85ebca6b)]
    const { object: mixedUnit, unitHeight: mixedH } = normalizeToUnit(pathToScene.get(mixedSpec.src)!, { gradient: mixedStops })
    const { object: lUnit } = normalizeToUnit(pathToScene.get(lSpec.src)!, { gradient: lStops })
    // darker wood material for railings
    const { object: railsUnit } = normalizeToUnit(
      pathToScene.get(modules.railings.src)!,
      { gradient: ['#5D4037', '#4E342E', '#3E2723'] }
    )
    // Measure unit rail sizes for trimming
    const railsBBox = new THREE.Box3().setFromObject(railsUnit)
    const railsSize = new THREE.Vector3()
    railsBBox.getSize(railsSize)

    // slight horizontal offsets: base to the right, top to the left
    const dxBase = 0.1
    const dxTop = -0.2
    placed.push({ object: mixedUnit.clone(true), position: [dxBase, 0, 0], rotationY: 0 })
    const rotSteps: Deg[] = [0, 90, 180, 270]
    const rot = rotSteps[seededPick(rotSteps.length, 0xc2b2ae35)]
    placed.push({ object: lUnit.clone(true), position: [dxTop, mixedH, 0], rotationY: rot })

    // Add one slats module on the wall opposite to L-shape's facing (assumed window side)
    const normalByRot: Record<Deg, [number, number, number]> = {
      0: [0, 0, -1],
      90: [-1, 0, 0],
      180: [0, 0, 1],
      270: [1, 0, 0]
    }
    const rotYByNormal: Record<string, Deg> = {
      '0,0,-1': 0,
      '-1,0,0': 90,
      '0,0,1': 180,
      '1,0,0': 270
    }
    const n = normalByRot[rot]
    const marginEdge = 0.02
    const wallOffset = 0.5 - marginEdge
    const slatsPos: [number, number, number] = [
      dxBase + n[0] * wallOffset,
      mixedH * 0.5,
      0 + n[2] * wallOffset
    ]
    const slatsRot = rotYByNormal[`${n[0]},${n[1]},${n[2]}`]
    const rails = railsUnit.clone(true)
    rails.scale.set(0.9, 0.9, 0.9)
    placed.push({ object: rails, position: slatsPos, rotationY: slatsRot })

    // Perimeter railings on veranda (top of base) except the side with L-shape window
    const edgeNormals: Array<[Deg, [number, number, number]]> = [
      [0 as Deg, [0, 0, -1]], // north
      [90 as Deg, [-1, 0, 0]], // west
      [180 as Deg, [0, 0, 1]], // south
      [270 as Deg, [1, 0, 0]]  // east
    ]
    const isSameNormal = (a: [number, number, number], b: [number, number, number]) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
    edgeNormals.forEach(([rotDeg, dir]) => {
      if (isSameNormal(dir, n)) return // пропускаем сторону окна
      const perp: [number, number, number] = dir[0] !== 0 ? [0, 0, 1] : [1, 0, 0]
      // tile along the edge with whole segments only so nothing выходит за углы
      const tangentAxisIsX = dir[0] === 0 // north/south => tangent along X
      const unitLen = Math.max(0.001, tangentAxisIsX ? railsSize.x : railsSize.z)
      const span = 1 - marginEdge * 2
      const maxCount = Math.max(1, Math.floor(span / unitLen))
      const occupied = maxCount * unitLen
      const start = -occupied / 2 + unitLen / 2
      for (let i = 0; i < maxCount; i++) {
        const t = start + i * unitLen
        const seg = railsUnit.clone(true)
        seg.scale.set(0.85, 0.9, 0.85)
        const px = dxBase + dir[0] * wallOffset + perp[0] * t
        const pz = 0 + dir[2] * wallOffset + perp[2] * t
        placed.push({ object: seg, position: [px, mixedH + 0.02, pz], rotationY: rotDeg })
      }
    })

    return { placed, width: 1, depth: 1, floors: 2 }
  }, [modules, rng, rules, pathToScene])

  // Compute scale to fit hex tile
  const fitDiameter = rules?.fitDiameter ?? 1.6
  const scale = useMemo(() => {
    const group = new THREE.Group()
    house.placed.forEach(p => {
      const cell = new THREE.Group()
      cell.position.set(p.position[0], p.position[1], p.position[2])
      cell.rotation.y = degToRad(p.rotationY)
      cell.add(p.object)
      group.add(cell)
    })
    const bbox = new THREE.Box3().setFromObject(group)
    const size = new THREE.Vector3()
    bbox.getSize(size)
    const maxXZ = Math.max(size.x, size.z) || 1
    const shrink = 0.504 // minus extra 10% => 0.56 * 0.9 = 0.504
    return (fitDiameter * shrink) / maxXZ
  }, [house])

  // center and ground align
  const centered = useMemo(() => {
    const group = new THREE.Group()
    house.placed.forEach(p => {
      const cell = new THREE.Group()
      cell.position.set(p.position[0], p.position[1], p.position[2])
      cell.rotation.y = degToRad(p.rotationY)
      cell.add(p.object)
      group.add(cell)
    })
    const bbox = new THREE.Box3().setFromObject(group)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    bbox.getSize(size)
    bbox.getCenter(center)
    const root = new THREE.Group()
    const wrapped = group.clone(true)
    // Align base to exact ground by snapping Y to 0
    const groundY = -(center.y - size.y / 2)
    wrapped.position.set(-center.x, groundY, -center.z)
    root.add(wrapped)
    return root
  }, [house])

  return (
    <group position={[0, 0.1, 0]} scale={[scale, scale, scale]}>
      <primitive object={centered} />
    </group>
  )
})



