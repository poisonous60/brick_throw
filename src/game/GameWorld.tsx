import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  CuboidCollider,
  Physics,
  RigidBody,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useEffect, useRef, useState } from 'react'
import { Object3D, SpotLight as ThreeSpotLight, Vector3 } from 'three'
import {
  buildTargetWallLayout,
  sceneConfig,
  type Vec3Tuple,
} from '../config/sceneConfig'
import { roundTuple, setDebugSnapshot } from '../lib/debugState'
import { modelAssets } from '../lib/assets'
import { AlleywayEnvironment } from './AlleywayEnvironment'
import { BrickBody, BrickVisual, type BrickKind } from './BrickBody'
import { useImpactAudio } from './useImpactAudio'
import { useLookDrag } from './useLookDrag'
import { type AimState, type ThrowLaunch, useThrowInput } from './useThrowInput'

type ThrownBrick = {
  id: string
  position: Vec3Tuple
  rotation: Vec3Tuple
  velocity: Vec3Tuple
  angularVelocity: Vec3Tuple
}

const wallLayout = buildTargetWallLayout()
const cameraDirection = new Vector3()
const activeInvisibleWalls = sceneConfig.invisibleWalls.filter((wall) => wall.enabled)

function createThrownBrick(id: number, launch: ThrowLaunch): ThrownBrick {
  return {
    id: `thrown-${id}`,
    position: launch.position,
    rotation: launch.rotation,
    velocity: launch.velocity,
    angularVelocity: launch.angularVelocity,
  }
}

export function GameWorld() {
  const [aimState, setAimState] = useState<AimState | null>(null)
  const [thrownBricks, setThrownBricks] = useState<ThrownBrick[]>([])
  const [lastImpact, setLastImpact] = useState<'weak' | 'strong' | null>(null)
  const thrownBodiesRef = useRef(new Map<string, RapierRigidBody>())
  const wallBodiesRef = useRef(new Map<string, RapierRigidBody>())
  const brickCounterRef = useRef(0)
  const bodyImpactTimestampsRef = useRef(new Map<string, number>())
  const globalImpactTimestampRef = useRef(0)
  const spotLightRef = useRef<ThreeSpotLight | null>(null)
  const spotTargetRef = useRef<Object3D | null>(null)
  const { playImpact } = useImpactAudio()

  useGLTF.preload(modelAssets.alleyway)
  useGLTF.preload(modelAssets.brick)

  useEffect(() => {
    if (!spotLightRef.current || !spotTargetRef.current) {
      return
    }

    spotLightRef.current.target = spotTargetRef.current
    spotTargetRef.current.updateMatrixWorld()
  }, [])

  const registerBody = (
    id: string,
    body: RapierRigidBody | null,
    kind: BrickKind,
  ) => {
    const targetMap =
      kind === 'thrown' ? thrownBodiesRef.current : wallBodiesRef.current

    if (!body) {
      targetMap.delete(id)
      return
    }

    targetMap.set(id, body)
  }

  const handleImpact = (id: string, _kind: BrickKind, speed: number) => {
    if (speed < sceneConfig.audio.weakSpeedThreshold) {
      return
    }

    const now = performance.now()
    const lastBodyImpact = bodyImpactTimestampsRef.current.get(id) ?? 0

    if (now - lastBodyImpact < sceneConfig.audio.bodyCooldownMs) {
      return
    }

    if (now - globalImpactTimestampRef.current < sceneConfig.audio.globalCooldownMs) {
      return
    }

    bodyImpactTimestampsRef.current.set(id, now)
    globalImpactTimestampRef.current = now

    const impactStrength =
      speed >= sceneConfig.audio.strongSpeedThreshold ? 'strong' : 'weak'
    setLastImpact(impactStrength)
    playImpact(impactStrength)
  }

  const handleThrow = (launch: ThrowLaunch) => {
    brickCounterRef.current += 1

    setThrownBricks((currentBricks) => {
      const nextBricks = [
        ...currentBricks,
        createThrownBrick(brickCounterRef.current, launch),
      ]

      if (nextBricks.length <= sceneConfig.brick.spawnLimit) {
        return nextBricks
      }

      return nextBricks.slice(nextBricks.length - sceneConfig.brick.spawnLimit)
    })
  }

  useThrowInput({
    onAimStateChange: setAimState,
    onThrow: handleThrow,
  })
  useLookDrag()

  useFrame(({ camera }) => {
    const cameraPosition = roundTuple([
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ])
    const cameraTarget = roundTuple(
      camera
        .getWorldDirection(cameraDirection)
        .multiplyScalar(sceneConfig.camera.lookDistance)
        .add(camera.position)
        .toArray() as [number, number, number],
    )
    const thrownBrickSnapshot = [...thrownBodiesRef.current.entries()].map(
      ([id, body]) => {
        const position = body.translation()
        const velocity = body.linvel()

        return {
          id,
          position: roundTuple([position.x, position.y, position.z]),
          velocity: roundTuple([velocity.x, velocity.y, velocity.z]),
          angularVelocity: roundTuple([
            body.angvel().x,
            body.angvel().y,
            body.angvel().z,
          ]),
          sleeping: body.isSleeping(),
        }
      },
    )
    const wallBrickSnapshot = [...wallBodiesRef.current.entries()].map(
      ([id, body]) => {
        const position = body.translation()
        const velocity = body.linvel()

        return {
          id,
          position: roundTuple([position.x, position.y, position.z]),
          velocity: roundTuple([velocity.x, velocity.y, velocity.z]),
          angularVelocity: roundTuple([
            body.angvel().x,
            body.angvel().y,
            body.angvel().z,
          ]),
          sleeping: body.isSleeping(),
        }
      },
    )

    setDebugSnapshot({
      coordinateSystem:
        'x increases to the right, y increases upward, negative z travels down the alley toward the target wall.',
      mode: aimState ? 'aiming' : 'ready',
      thrownBrickCap: sceneConfig.brick.spawnLimit,
      throwOrigin: sceneConfig.throw.origin,
      camera: {
        position: cameraPosition,
        target: cameraTarget,
      },
      aim: aimState
        ? {
            dragPixels: aimState.drag,
            velocity: aimState.velocity,
            angularVelocity: aimState.angularVelocity,
            heldPosition: aimState.heldPosition,
            heldRotation: aimState.heldRotation,
          }
        : null,
      thrownBricks: thrownBrickSnapshot,
      wallBricks: wallBrickSnapshot,
      invisibleWalls: activeInvisibleWalls.map((wall) => ({
        id: wall.id,
        position: roundTuple(wall.position),
        size: roundTuple(wall.size),
      })),
      lastImpact,
    })
  })

  return (
    <>
      <color attach="background" args={[sceneConfig.world.background]} />
      <fog
        attach="fog"
        args={[
          sceneConfig.world.fogColor,
          sceneConfig.world.fogNear,
          sceneConfig.world.fogFar,
        ]}
      />

      <ambientLight intensity={sceneConfig.lighting.ambientIntensity} />
      <hemisphereLight
        intensity={sceneConfig.lighting.hemisphereIntensity}
        color={sceneConfig.lighting.hemisphereSkyColor}
        groundColor={sceneConfig.lighting.hemisphereGroundColor}
      />
      <directionalLight
        castShadow
        intensity={sceneConfig.lighting.directionalIntensity}
        color={sceneConfig.lighting.directionalColor}
        position={sceneConfig.lighting.directionalPosition}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={sceneConfig.lighting.directionalShadowFar}
        shadow-camera-left={-sceneConfig.lighting.directionalShadowBounds}
        shadow-camera-right={sceneConfig.lighting.directionalShadowBounds}
        shadow-camera-top={sceneConfig.lighting.directionalShadowBounds}
        shadow-camera-bottom={-sceneConfig.lighting.directionalShadowBounds}
      />
      <object3D
        ref={spotTargetRef}
        position={sceneConfig.lighting.spotTarget}
      />
      <spotLight
        ref={spotLightRef}
        angle={sceneConfig.lighting.spotAngle}
        castShadow
        intensity={sceneConfig.lighting.spotIntensity}
        penumbra={sceneConfig.lighting.spotPenumbra}
        position={sceneConfig.lighting.spotPosition}
        distance={sceneConfig.lighting.spotDistance}
        decay={sceneConfig.lighting.spotDecay}
        shadow-bias={sceneConfig.lighting.spotShadowBias}
        color={sceneConfig.lighting.spotColor}
      />

      <Physics gravity={sceneConfig.physics.gravity}>
        <AlleywayEnvironment />

        <RigidBody type="fixed" colliders={false}>
          {activeInvisibleWalls.map((wall) => {
            const wallRotation = 'rotation' in wall ? wall.rotation : undefined

            return (
              <CuboidCollider
                key={wall.id}
                args={wall.size}
                position={wall.position}
                rotation={wallRotation}
              />
            )
          })}
        </RigidBody>

        {sceneConfig.debug.showInvisibleWalls
          ? activeInvisibleWalls.map((wall) => {
              const wallRotation = 'rotation' in wall ? wall.rotation : undefined

              return (
                <mesh
                  key={`debug-${wall.id}`}
                  position={wall.position}
                  rotation={wallRotation}
                >
                <boxGeometry
                  args={[
                    wall.size[0] * 2,
                    wall.size[1] * 2,
                    wall.size[2] * 2,
                  ]}
                />
                <meshBasicMaterial
                  color={sceneConfig.debug.invisibleWallColor}
                  opacity={sceneConfig.debug.invisibleWallOpacity}
                  transparent
                  depthWrite={false}
                />
              </mesh>
              )
            })
          : null}

        {wallLayout.map((position, index) => (
          <BrickBody
            key={`wall-${index}`}
            id={`wall-${index}`}
            kind="wall"
            position={position}
            registerBody={registerBody}
            onImpact={handleImpact}
          />
        ))}

        {thrownBricks.map((brick) => (
          <BrickBody
            key={brick.id}
            id={brick.id}
            kind="thrown"
            position={brick.position}
            rotation={brick.rotation}
            linearVelocity={brick.velocity}
            angularVelocity={brick.angularVelocity}
            registerBody={registerBody}
            onImpact={handleImpact}
          />
        ))}

        <mesh
          castShadow
          position={[sceneConfig.throw.origin[0], sceneConfig.physics.floorY + 0.012, sceneConfig.throw.origin[2] + 0.35]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.62, 0.96]} />
          <meshStandardMaterial
            color={sceneConfig.visuals.aimColor}
            emissive={sceneConfig.visuals.aimColor}
            emissiveIntensity={0.12}
          />
        </mesh>
      </Physics>

      {aimState ? (
        <group position={aimState.heldPosition}>
          <BrickVisual rotation={aimState.heldRotation} />
        </group>
      ) : null}
    </>
  )
}
