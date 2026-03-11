import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { sceneConfig } from '../config/sceneConfig'
import { GameWorld } from './GameWorld'

export function GameCanvas() {
  return (
    <Canvas
      camera={{
        position: sceneConfig.camera.position,
        fov: sceneConfig.camera.fov,
        near: 0.1,
        far: 60,
      }}
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
      }}
      shadows
    >
      <Suspense fallback={null}>
        <GameWorld />
      </Suspense>
    </Canvas>
  )
}
