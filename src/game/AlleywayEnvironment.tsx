import { Clone, useGLTF } from '@react-three/drei'
import { useEffect } from 'react'
import type { Mesh, Object3D } from 'three'
import { sceneConfig } from '../config/sceneConfig'
import { modelAssets } from '../lib/assets'

function markShadowCasters(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Mesh
    if (!('isMesh' in mesh) || !mesh.isMesh) {
      return
    }

    mesh.castShadow = true
    mesh.receiveShadow = true
  })
}

export function AlleywayEnvironment() {
  const { scene } = useGLTF(modelAssets.alleyway)

  useEffect(() => {
    markShadowCasters(scene)
  }, [scene])

  return (
    <group
      position={sceneConfig.alleyway.position}
      rotation={sceneConfig.alleyway.rotation}
      scale={sceneConfig.alleyway.scale}
    >
      <Clone object={scene} />
    </group>
  )
}
