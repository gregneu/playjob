import * as THREE from 'three'

export type HexAvatarConfig = {
  characterType: 'human' | 'animal'
  variant?: 'lion' | 'tiger' | 'wolf' | 'bear'
  colors: Record<string, number>
}

export const defaultHumanColors = [0xF4C2A1, 0xE8B796, 0xD4A574, 0xC89664, 0xA67C52, 0x8D5524]
export const defaultClothColors = [0x4ECDC4, 0x45B7D1, 0x96CEB4, 0xF7DC6F, 0xBB8FCE, 0xFF6B6B]

export const defaultAnimalColors: Record<string, any> = {
  lion: { body: 0xD4A574, mane: 0x8B4513, accent: 0xFFD700 },
  tiger: { body: 0xFF8C00, stripes: 0x000000, accent: 0xFFFFFF },
  wolf: { body: 0x696969, fur: 0x2F4F4F, accent: 0xFFFFFF },
  bear: { body: 0x8B4513, fur: 0x654321, accent: 0x000000 }
}

export function generateRandomConfig(type: 'human' | 'animal' = 'human'): HexAvatarConfig {
  if (type === 'animal') {
    const animalTypes = Object.keys(defaultAnimalColors)
    const variant = animalTypes[Math.floor(Math.random() * animalTypes.length)] as HexAvatarConfig['variant']
    const palette = defaultAnimalColors[variant]
    return { characterType: 'animal', variant, colors: palette }
  }
  const skin = defaultHumanColors[Math.floor(Math.random() * defaultHumanColors.length)]
  const cloth = defaultClothColors[Math.floor(Math.random() * defaultClothColors.length)]
  return { characterType: 'human', colors: { skin, cloth } }
}

// Build hex avatar into provided group based on config
export function createHexAvatar(target: THREE.Group, config: HexAvatarConfig) {
  // clear
  while (target.children.length > 0) target.remove(target.children[0])

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
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial); leftEye.position.set(-0.15, 0.2, 0.4)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial); rightEye.position.set(0.15, 0.2, 0.4)
    const noseGeometry = new THREE.TetrahedronGeometry(0.03)
    const noseMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 })
    const nose = new THREE.Mesh(noseGeometry, noseMaterial); nose.position.set(0, 0, 0.55)
    faceGroup.add(snout, leftEye, rightEye, nose)

    const earGeometry = new THREE.OctahedronGeometry(0.12)
    const earMaterial = new THREE.MeshLambertMaterial({ color: colors.body })
    const leftEar = new THREE.Mesh(earGeometry, earMaterial); leftEar.position.set(-0.3, 0.5, 0.2)
    const rightEar = new THREE.Mesh(earGeometry, earMaterial); rightEar.position.set(0.3, 0.5, 0.2)
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
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial); leftEye.position.set(-0.1, 0.1, 0.65)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial); rightEye.position.set(0.1, 0.1, 0.65)
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

  if (config.characterType === 'animal') {
    const variant = config.variant || 'bear'
    const colors = { ...defaultAnimalColors[variant], ...config.colors }
    target.add(createHexBody(colors.body))
    target.add(createAnimalFace(variant, colors))
    const fl = createLimb('animal', colors.body); fl.position.set(-0.4, -0.8, 0.3); fl.rotation.z = 0.3
    const fr = createLimb('animal', colors.body); fr.position.set(0.4, -0.8, 0.3); fr.rotation.z = -0.3
    const bl = createLimb('animal', colors.body); bl.position.set(-0.4, -0.8, -0.3); bl.rotation.z = 0.3
    const br = createLimb('animal', colors.body); br.position.set(0.4, -0.8, -0.3); br.rotation.z = -0.3
    target.add(fl, fr, bl, br, createTail(colors.body))
    return
  }

  // human
  const skin = config.colors.skin ?? defaultHumanColors[0]
  const cloth = config.colors.cloth ?? defaultClothColors[0]
  target.add(createHexBody(cloth))
  target.add(createHumanFace(skin))
  const la = createLimb('human', skin); la.position.set(-0.7, 0, 0); la.rotation.z = Math.PI / 6
  const ra = createLimb('human', skin); ra.position.set(0.7, 0, 0); ra.rotation.z = -Math.PI / 6
  const ll = createLimb('human', 0x000080); ll.position.set(-0.2, -0.8, 0)
  const rl = createLimb('human', 0x000080); rl.position.set(0.2, -0.8, 0)
  target.add(la, ra, ll, rl)
}


