import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { createHexAvatar, generateRandomConfig, type HexAvatarConfig } from '../lib/hexAvatar'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { userService } from '../lib/userService'
import { renderGroupToDataURL } from '../lib/avatarSnapshot'

const panelBackground = 'radial-gradient(1000px 700px at 60% 30%, #0b1020 0%, #060a14 40%, #030611 70%, #000000 100%)'

export const HexAvatarPanel: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const avatarGroupRef = useRef<THREE.Group | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [characterType, setCharacterType] = useState<'animal' | 'human'>('human')
  const [config, setConfig] = useState<HexAvatarConfig | null>(null)
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState('')

  const animalColors: Record<string, any> = {
    lion: { body: 0xD4A574, mane: 0x8B4513, accent: 0xFFD700 },
    tiger: { body: 0xFF8C00, stripes: 0x000000, accent: 0xFFFFFF },
    wolf: { body: 0x696969, fur: 0x2F4F4F, accent: 0xFFFFFF },
    bear: { body: 0x8B4513, fur: 0x654321, accent: 0x000000 }
  }

  const humanColors = [0xF4C2A1, 0xE8B796, 0xD4A574, 0xC89664, 0xA67C52, 0x8D5524]
  const clothColors = [0x4ECDC4, 0x45B7D1, 0x96CEB4, 0xF7DC6F, 0xBB8FCE, 0xFF6B6B]

  const createHexBody = (color: number, size = 0.6) => {
    const geometry = new THREE.CylinderGeometry(size, size, size * 1.2, 6)
    const material = new THREE.MeshLambertMaterial({ color })
    return new THREE.Mesh(geometry, material)
  }

  const createAnimalFace = (type: string, colors: any) => {
    const faceGroup = new THREE.Group()
    const snoutGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 3)
    const snoutMaterial = new THREE.MeshLambertMaterial({ color: colors.body })
    const snout = new THREE.Mesh(snoutGeometry, snoutMaterial)
    snout.position.set(0, 0, 0.45)
    snout.rotation.x = Math.PI / 2

    const eyeGeometry = new THREE.TetrahedronGeometry(0.08)
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 })
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.15, 0.2, 0.4)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.15, 0.2, 0.4)

    const noseGeometry = new THREE.TetrahedronGeometry(0.03)
    const noseMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 })
    const nose = new THREE.Mesh(noseGeometry, noseMaterial)
    nose.position.set(0, 0, 0.55)

    faceGroup.add(snout, leftEye, rightEye, nose)

    const earGeometry = new THREE.OctahedronGeometry(0.12)
    const earMaterial = new THREE.MeshLambertMaterial({ color: colors.body })
    const leftEar = new THREE.Mesh(earGeometry, earMaterial)
    leftEar.position.set(-0.3, 0.5, 0.2)
    const rightEar = new THREE.Mesh(earGeometry, earMaterial)
    rightEar.position.set(0.3, 0.5, 0.2)
    faceGroup.add(leftEar, rightEar)

    if (type === 'lion') {
      const maneGeometry = new THREE.DodecahedronGeometry(0.8)
      const maneMaterial = new THREE.MeshLambertMaterial({ color: colors.mane })
      const mane = new THREE.Mesh(maneGeometry, maneMaterial)
      mane.position.set(0, 0.1, 0)
      faceGroup.add(mane)
    }

    return faceGroup
  }

  const createHumanFace = (skinColor: number) => {
    const faceGroup = new THREE.Group()
    const headGeometry = new THREE.OctahedronGeometry(0.3)
    headGeometry.scale(1, 1, 0.7)
    const headMaterial = new THREE.MeshLambertMaterial({ color: skinColor })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.set(0, 0, 0.45)

    const eyeGeometry = new THREE.SphereGeometry(0.04, 4, 3)
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 })
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.1, 0.1, 0.65)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.1, 0.1, 0.65)

    faceGroup.add(head, leftEye, rightEye)
    return faceGroup
  }

  const createLimb = (type: 'animal' | 'human', color: number) => {
    const limbGroup = new THREE.Group()
    if (type === 'animal') {
      const pawGeometry = new THREE.ConeGeometry(0.08, 0.4, 4)
      const pawMaterial = new THREE.MeshLambertMaterial({ color })
      const paw = new THREE.Mesh(pawGeometry, pawMaterial)
      limbGroup.add(paw)
    } else {
      const limbGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.35, 5)
      const limbMaterial = new THREE.MeshLambertMaterial({ color })
      const limb = new THREE.Mesh(limbGeometry, limbMaterial)
      limbGroup.add(limb)
    }
    return limbGroup
  }

  const createTail = (color: number) => {
    const tailGeometry = new THREE.ConeGeometry(0.05, 0.5, 4)
    const tailMaterial = new THREE.MeshLambertMaterial({ color })
    const tail = new THREE.Mesh(tailGeometry, tailMaterial)
    tail.position.set(0, 0, -0.7)
    tail.rotation.x = Math.PI / 2
    return tail
  }

  const generateRandomAvatar = async () => {
    if (!sceneRef.current || !avatarGroupRef.current) return
    setIsGenerating(true)
    const cfg = generateRandomConfig(characterType)
    setConfig(cfg)
    createHexAvatar(avatarGroupRef.current, cfg)
    // persist to profile
    try {
      if (user?.id) {
        console.log('🔧 Saving avatar_config for user', user.id, cfg)
        let snapshotUrl: string | null = null
        try {
          if (avatarGroupRef.current) snapshotUrl = await renderGroupToDataURL(avatarGroupRef.current, 512, 512)
        } catch {}
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_config: cfg, avatar_url: snapshotUrl ?? null })
          .eq('id', user.id)
        if (error) {
          console.error('Failed to save avatar_config:', error)
        } else {
          console.log('✅ avatar_config saved')
          try { localStorage.setItem(`hex_avatar_config_${user.id}`, JSON.stringify(cfg)) } catch {}
          userService.invalidateUserProfile(user.id)
          try { window.dispatchEvent(new CustomEvent('hex-avatar-updated', { detail: { userId: user.id, config: cfg, snapshotUrl } })) } catch {}
        }
      }
    } catch (e) { console.error('Save avatar_config exception:', e) }
    setTimeout(() => setIsGenerating(false), 200)
  }

  useEffect(() => {
    if (!mountRef.current) return
    // Avoid duplicate mounts in React 18 StrictMode
    if (rendererRef.current) return
    // Clear any previous canvas
    try { mountRef.current.innerHTML = '' } catch {}
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x090f1a)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(60, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000)
    camera.position.set(3, 2, 3)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    // Ensure canvas fills the panel and doesn't stack vertically
    Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' })
    renderer.shadowMap.enabled = true
    rendererRef.current = renderer
    mountRef.current.appendChild(renderer.domElement)

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambientLight)
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.9)
    dir1.position.set(5, 10, 5)
    scene.add(dir1)
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.35)
    dir2.position.set(-5, 5, -5)
    scene.add(dir2)

    const avatarGroup = new THREE.Group()
    avatarGroupRef.current = avatarGroup
    scene.add(avatarGroup)

    // Wait for user to be available; separate effect handles generation

    const animate = () => {
      requestAnimationFrame(animate)
      if (avatarGroupRef.current) {
        avatarGroupRef.current.rotation.y += 0.008
      }
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!mountRef.current) return
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement)
      renderer.dispose()
      rendererRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Do not auto-generate on type change; generation happens only on explicit "New"

  // Load existing config for current user and render it
  useEffect(() => {
    const load = async () => {
      if (!user?.id || !avatarGroupRef.current) return
      try {
        // 1) Try cached config for instant persistence across reloads
        try {
          const cached = localStorage.getItem(`hex_avatar_config_${user.id}`)
          if (cached) {
            const parsed = JSON.parse(cached) as HexAvatarConfig
            setConfig(parsed)
            setCharacterType(parsed.characterType)
            createHexAvatar(avatarGroupRef.current, parsed)
          }
        } catch {}

        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_config, full_name, email')
          .eq('id', user.id)
          .single()
        if (error) {
          console.warn('Load avatar_config error:', error)
          return
        }
        setDisplayName((data?.full_name as string) || (data?.email as string) || '')
        if (data?.avatar_config) {
          setConfig(data.avatar_config as HexAvatarConfig)
          setCharacterType((data.avatar_config as HexAvatarConfig).characterType)
          createHexAvatar(avatarGroupRef.current, data.avatar_config as HexAvatarConfig)
        } else {
          // if none, create once and persist
          await generateRandomAvatar()
        }
      } catch (e) {
        console.warn('Load avatar_config exception:', e)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: panelBackground, borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, zIndex: 2, pointerEvents: 'auto' }}>
        <select
          value={characterType}
          onChange={(e) => setCharacterType((e.target.value as 'animal' | 'human'))}
          style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '6px 8px' }}
        >
          <option value="human">Human</option>
          <option value="animal">Animal</option>
        </select>
        <button
          onClick={generateRandomAvatar}
          disabled={isGenerating}
          style={{ background: '#4ECDC4', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', opacity: isGenerating ? 0.6 : 1, cursor: isGenerating ? 'default' : 'pointer' }}
        >
          {isGenerating ? '...' : 'New'}
        </button>
      </div>
      {displayName && (
        <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', color: 'white', fontSize: 18, fontWeight: 600 }}>
          {displayName}
        </div>
      )}
    </div>
  )
}

export default HexAvatarPanel


