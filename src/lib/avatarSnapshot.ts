import * as THREE from 'three'

export async function renderGroupToDataURL(group: THREE.Group, width = 512, height = 512): Promise<string> {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff)
  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 100)
  camera.position.set(0, 0, 6)
  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(3, 5, 4)
  scene.add(light)
  scene.add(new THREE.AmbientLight(0xffffff, 0.7))

  const clone = group.clone(true)
  scene.add(clone)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.render(scene, camera)
  const dataUrl = renderer.domElement.toDataURL('image/png')
  renderer.dispose()
  return dataUrl
}


