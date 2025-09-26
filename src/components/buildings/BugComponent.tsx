import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const BugComponent: React.FC = () => {
  const bugRef = useRef<THREE.Group>(null)
  const animationRef = useRef({
    walkCycle: 0,
    antennaPhase: 0,
    legPhase: 0,
    targetX: 0,
    targetZ: 0,
    speed: 0.5 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2
  })

  // Создаем жука
  const createBug = () => {
    const bug = new THREE.Group()

    // Тело жука (овальное)
    const bodyGeometry = new THREE.SphereGeometry(0.3, 16, 8)
    bodyGeometry.scale(1.5, 0.8, 1)
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xcc2222,
      roughness: 0.6,
      metalness: 0.3
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.25
    body.castShadow = true
    bug.add(body)

    // Голова жука
    const headGeometry = new THREE.SphereGeometry(0.15, 12, 8)
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3d2817,
      roughness: 0.8
    })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.set(0, 0.25, 0.4)
    head.castShadow = true
    bug.add(head)

    // Глаза жука (белые)
    for (let i = 0; i < 2; i++) {
      const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 8)
      const eyeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.1
      })
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial)
      eye.position.set(i === 0 ? -0.08 : 0.08, 0.28, 0.48)
      bug.add(eye)

      // Черный зрачок
      const pupilGeometry = new THREE.SphereGeometry(0.02, 6, 6)
      const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 })
      const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial)
      pupil.position.set(i === 0 ? -0.08 : 0.08, 0.28, 0.5)
      bug.add(pupil)
    }

    // Усики
    for (let i = 0; i < 2; i++) {
      const antennaGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4)
      const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 })
      const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial)
      antenna.position.set(i === 0 ? -0.08 : 0.08, 0.35, 0.45)
      antenna.rotation.z = (i === 0 ? -1 : 1) * 0.3
      antenna.rotation.x = -0.2
      antenna.name = `antenna-${i}`
      bug.add(antenna)
    }

    // Лапки (6 штук) - черные
    for (let i = 0; i < 6; i++) {
      const legGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4)
      const legMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 })
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      
      const side = i < 3 ? -1 : 1
      const legIndex = i % 3
      
      leg.position.set(
        side * 0.35, 
        0.1, 
        -0.2 + legIndex * 0.2
      )
      leg.rotation.z = side * 0.6
      leg.rotation.x = 0.2
      leg.name = `leg-${i}`
      bug.add(leg)
    }

    // Крылья (элитры) - коричневые с блеском
    for (let i = 0; i < 2; i++) {
      const wingGeometry = new THREE.SphereGeometry(0.25, 12, 6)
      wingGeometry.scale(1.2, 0.1, 1.5)
      const wingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.3,
        metalness: 0.6
      })
      const wing = new THREE.Mesh(wingGeometry, wingMaterial)
      wing.position.set(i === 0 ? -0.15 : 0.15, 0.35, 0)
      wing.castShadow = true
      bug.add(wing)
    }

    return bug
  }

  useEffect(() => {
    if (bugRef.current) {
      // Очищаем существующие дети
      while (bugRef.current.children.length > 0) {
        bugRef.current.remove(bugRef.current.children[0])
      }
      
      // Создаем нового жука
      const bug = createBug()
      bugRef.current.add(bug)
    }
  }, [])

  useFrame((state, delta) => {
    if (!bugRef.current) return

    // Ограничиваем delta для предотвращения скачков при переключении табов
    const clampedDelta = Math.min(delta, 1/30) // Максимум 1/30 секунды (30 FPS)

    const anim = animationRef.current
    anim.walkCycle += 0.3
    anim.antennaPhase += 3 * clampedDelta
    anim.legPhase += 0.7

    // Случайное изменение направления каждые несколько секунд
    if (Math.random() < 0.005) {
      anim.targetX = (Math.random() - 0.5) * 1.5
      anim.targetZ = (Math.random() - 0.5) * 1.5
    }

    // Движение к цели
    const dx = anim.targetX - bugRef.current.position.x
    const dz = anim.targetZ - bugRef.current.position.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    
    if (distance > 0.1) {
      bugRef.current.position.x += (dx / distance) * anim.speed * 0.02
      bugRef.current.position.z += (dz / distance) * anim.speed * 0.02
      
      // Поворот в сторону движения
      bugRef.current.rotation.y = Math.atan2(dx, dz)
      
      // Анимация ходьбы
      bugRef.current.position.y = Math.sin(anim.walkCycle) * 0.02
      
      // Покачивание тела
      bugRef.current.rotation.x = Math.sin(anim.walkCycle * 0.5) * 0.05
      bugRef.current.rotation.z = Math.sin(anim.walkCycle * 0.7) * 0.03
    }

    // Анимация усиков
    bugRef.current.children.forEach((child) => {
      if (child.name?.startsWith('antenna-')) {
        const antennaIndex = parseInt(child.name.split('-')[1])
        child.rotation.y = Math.sin(anim.antennaPhase + antennaIndex) * 0.1
      }
    })

    // Анимация лапок
    bugRef.current.children.forEach((child) => {
      if (child.name?.startsWith('leg-')) {
        const legIndex = parseInt(child.name.split('-')[1])
        child.rotation.x = 0.2 + Math.sin(anim.legPhase + legIndex * 0.5) * 0.1
      }
    })
  })

  return (
    <group ref={bugRef} position={[0, 0.1, 0]} scale={[0.25, 0.25, 0.25]} />
  )
} 