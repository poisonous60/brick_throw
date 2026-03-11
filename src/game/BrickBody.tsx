import { Clone, useGLTF } from '@react-three/drei'
import {
  CuboidCollider,
  RigidBody,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import {
  Box3,
  MeshStandardMaterial,
  Vector3,
  type Mesh,
  type Object3D,
} from 'three'
import { sceneConfig, type Vec3Tuple } from '../config/sceneConfig'
import { modelAssets } from '../lib/assets'

export type BrickKind = 'thrown' | 'wall'

type BrickBodyProps = {
  id: string
  kind: BrickKind
  position: Vec3Tuple
  rotation?: Vec3Tuple
  linearVelocity?: Vec3Tuple
  angularVelocity?: Vec3Tuple
  registerBody: (id: string, body: RapierRigidBody | null, kind: BrickKind) => void
  onImpact: (id: string, kind: BrickKind, speed: number) => void
}

type BrickVisualProps = {
  rotation?: Vec3Tuple
}

const brickVisualCache = new WeakMap<
  Object3D,
  {
    center: Vec3Tuple
    scale: number
  }
>()

const brickVisualMaterial = new MeshStandardMaterial({
  color: sceneConfig.visuals.aimColor,
  roughness: 0.62,
  metalness: 0.04,
})

function markShadowCasters(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Mesh
    if (!('isMesh' in mesh) || !mesh.isMesh) {
      return
    }

    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.material = brickVisualMaterial
  })
}

function getBrickVisualTransform(root: Object3D) {
  const cached = brickVisualCache.get(root)

  if (cached) {
    return cached
  }

  const box = new Box3().setFromObject(root)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  const targetSize = new Vector3(
    sceneConfig.brick.collider[0] * 2,
    sceneConfig.brick.collider[1] * 2,
    sceneConfig.brick.collider[2] * 2,
  )
  const scale = Math.min(
    targetSize.x / size.x,
    targetSize.y / size.y,
    targetSize.z / size.z,
  )
  const transform = {
    center: [center.x, center.y, center.z] as Vec3Tuple,
    scale,
  }

  brickVisualCache.set(root, transform)

  return transform
}

export function BrickBody({
  angularVelocity,
  id,
  kind,
  linearVelocity,
  onImpact,
  position,
  registerBody,
  rotation = [0, 0, 0],
}: BrickBodyProps) {
  const rigidBodyRef = useRef<RapierRigidBody | null>(null)

  useEffect(() => {
    registerBody(id, rigidBodyRef.current, kind)

    return () => {
      registerBody(id, null, kind)
    }
  }, [id, kind, registerBody])

  useEffect(() => {
    if (!rigidBodyRef.current) {
      return
    }

    if (linearVelocity) {
      rigidBodyRef.current.setLinvel(
        {
          x: linearVelocity[0],
          y: linearVelocity[1],
          z: linearVelocity[2],
        },
        true,
      )
    }

    if (angularVelocity) {
      rigidBodyRef.current.setAngvel(
        {
          x: angularVelocity[0],
          y: angularVelocity[1],
          z: angularVelocity[2],
        },
        true,
      )
    }
  }, [angularVelocity, linearVelocity])

  return (
    <RigidBody
      ref={rigidBodyRef}
      ccd
      colliders={false}
      friction={sceneConfig.brick.friction}
      linearDamping={
        kind === 'thrown'
          ? sceneConfig.brick.thrownLinearDamping
          : sceneConfig.brick.wallLinearDamping
      }
      angularDamping={
        kind === 'thrown'
          ? sceneConfig.brick.thrownAngularDamping
          : sceneConfig.brick.wallAngularDamping
      }
      restitution={sceneConfig.brick.restitution}
      mass={kind === 'thrown' ? sceneConfig.brick.thrownMass : sceneConfig.brick.wallMass}
      gravityScale={kind === 'thrown' ? sceneConfig.brick.thrownGravityScale : 1}
      position={position}
      rotation={rotation}
      onCollisionEnter={() => {
        const velocity = rigidBodyRef.current?.linvel()

        if (!velocity) {
          return
        }

        const speed = Math.hypot(velocity.x, velocity.y, velocity.z)
        onImpact(id, kind, speed)
      }}
    >
      <CuboidCollider args={sceneConfig.brick.collider} />
      <BrickVisual />
    </RigidBody>
  )
}

export function BrickVisual({ rotation = [0, 0, 0] }: BrickVisualProps) {
  const { scene } = useGLTF(modelAssets.brick)
  const visualTransform = getBrickVisualTransform(scene)

  useEffect(() => {
    markShadowCasters(scene)
  }, [scene])

  return (
    <group
      rotation={rotation}
      scale={visualTransform.scale * sceneConfig.brick.visualScale}
    >
      <group
        position={[
          -visualTransform.center[0],
          -visualTransform.center[1],
          -visualTransform.center[2],
        ]}
      >
        <Clone object={scene} />
      </group>
    </group>
  )
}
