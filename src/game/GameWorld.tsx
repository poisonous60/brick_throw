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
import {
  BrickBody,
  BrickVisual,
  type BrickImpact,
  type BrickKind,
} from './BrickBody'
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

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function normalizeImpact(force: number) {
  const normalized =
    (force - sceneConfig.audio.minImpactForce) /
    (sceneConfig.audio.maxImpactForce - sceneConfig.audio.minImpactForce)

  return Math.sqrt(clamp01(normalized))
}

function normalizeImpactSpeed(speed: number) {
  const normalized =
    (speed - sceneConfig.audio.minImpactSpeed) /
    (sceneConfig.audio.strongImpactSpeed - sceneConfig.audio.minImpactSpeed)

  return clamp01(normalized)
}

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
  const [lastImpact, setLastImpact] = useState<{
    type: 'impact' | 'scratch'
    clip: 'medium' | 'strong' | 'scratch'
    force: number | null
    speed: number | null
    intensity: number
    otherKind: BrickKind | 'world' | 'floor'
  } | null>(null)
  const thrownBodiesRef = useRef(new Map<string, RapierRigidBody>())
  const wallBodiesRef = useRef(new Map<string, RapierRigidBody>())
  const brickCounterRef = useRef(0)
  const bodyImpactTimestampsRef = useRef(new Map<string, number>())
  const pairImpactTimestampsRef = useRef(new Map<string, number>())
  const scratchBodyTimestampsRef = useRef(new Map<string, number>())
  const scratchActiveIdsRef = useRef(new Set<string>())
  const globalImpactTimestampRef = useRef(0)
  const globalScratchTimestampRef = useRef(0)
  const spotLightRef = useRef<ThreeSpotLight | null>(null)
  const spotTargetRef = useRef<Object3D | null>(null)
  const { playImpact, playScratch } = useImpactAudio()

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

  const handleImpact = ({ force, id, kind, otherId, otherKind, speed }: BrickImpact) => {
    if (kind !== 'thrown') {
      return
    }

    if (speed < sceneConfig.audio.minImpactSpeed) {
      return
    }

    const forceIntensity = normalizeImpact(force)
    const speedIntensity = normalizeImpactSpeed(speed)
    const intensity = Math.max(forceIntensity, speedIntensity)

    if (intensity <= 0) {
      return
    }

    const now = performance.now()
    const lastBodyImpact = bodyImpactTimestampsRef.current.get(id) ?? 0
    const pairKey = `${id}:${otherId ?? otherKind}`
    const lastPairImpact = pairImpactTimestampsRef.current.get(pairKey) ?? 0

    if (now - lastBodyImpact < sceneConfig.audio.bodyCooldownMs) {
      return
    }

    if (now - lastPairImpact < sceneConfig.audio.pairCooldownMs) {
      return
    }

    if (now - globalImpactTimestampRef.current < sceneConfig.audio.globalCooldownMs) {
      return
    }

    bodyImpactTimestampsRef.current.set(id, now)
    pairImpactTimestampsRef.current.set(pairKey, now)
    globalImpactTimestampRef.current = now

    const clip = speed >= sceneConfig.audio.strongImpactSpeed ? 'strong' : 'medium'

    setLastImpact({
      type: 'impact',
      clip,
      force: Number(force.toFixed(2)),
      speed: Number(speed.toFixed(2)),
      intensity: Number(intensity.toFixed(3)),
      otherKind,
    })
    playImpact({
      clip,
      intensity,
      material: otherKind === 'world' ? 'world' : 'brick',
    })
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
    const despawnedThrownBrickIds = new Set<string>()
    const scratchCandidates: Array<{ id: string; intensity: number }> = []
    const thrownBrickSnapshot = [...thrownBodiesRef.current.entries()].map(
      ([id, body]) => {
        const position = body.translation()

        if (position.y <= sceneConfig.brick.despawnY) {
          despawnedThrownBrickIds.add(id)
          return null
        }

        const velocity = body.linvel()
        const horizontalSpeed = Math.hypot(velocity.x, velocity.z)
        const nearFloor =
          position.y <=
          sceneConfig.physics.floorY +
            sceneConfig.brick.collider[1] +
            sceneConfig.audio.scratchFloorDistance
        const verticalSpeed = Math.abs(velocity.y)
        const canScratch =
          nearFloor &&
          !body.isSleeping() &&
          horizontalSpeed >= sceneConfig.audio.scratchMinSpeed &&
          horizontalSpeed <= sceneConfig.audio.scratchMaxSpeed &&
          verticalSpeed <= sceneConfig.audio.scratchMaxVerticalSpeed

        if (canScratch) {
          const normalizedScratch =
            (horizontalSpeed - sceneConfig.audio.scratchMinSpeed) /
            (sceneConfig.audio.scratchMaxSpeed - sceneConfig.audio.scratchMinSpeed)

          scratchCandidates.push({
            id,
            intensity: clamp01(normalizedScratch),
          })
        } else if (
          body.isSleeping() ||
          horizontalSpeed < sceneConfig.audio.scratchMinSpeed * 0.65 ||
          verticalSpeed > sceneConfig.audio.scratchMaxVerticalSpeed * 1.4
        ) {
          scratchActiveIdsRef.current.delete(id)
        }

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
    ).filter((brick) => brick !== null)
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

    if (despawnedThrownBrickIds.size > 0) {
      for (const id of despawnedThrownBrickIds) {
        bodyImpactTimestampsRef.current.delete(id)
        scratchBodyTimestampsRef.current.delete(id)
        scratchActiveIdsRef.current.delete(id)
        pairImpactTimestampsRef.current.forEach((_value, pairKey) => {
          if (pairKey.startsWith(`${id}:`)) {
            pairImpactTimestampsRef.current.delete(pairKey)
          }
        })
      }

      setThrownBricks((currentBricks) => {
        const nextBricks = currentBricks.filter(
          (brick) => !despawnedThrownBrickIds.has(brick.id),
        )

        return nextBricks.length === currentBricks.length ? currentBricks : nextBricks
      })
    }

    for (const candidate of scratchCandidates) {
      if (scratchActiveIdsRef.current.has(candidate.id)) {
        continue
      }

      const now = performance.now()
      const lastScratch = scratchBodyTimestampsRef.current.get(candidate.id) ?? 0
      const lastImpact = bodyImpactTimestampsRef.current.get(candidate.id) ?? 0

      if (now - lastScratch < sceneConfig.audio.scratchBodyCooldownMs) {
        continue
      }

      if (now - globalScratchTimestampRef.current < sceneConfig.audio.scratchGlobalCooldownMs) {
        continue
      }

      if (now - lastImpact < sceneConfig.audio.scratchAfterImpactDelayMs) {
        continue
      }

      scratchBodyTimestampsRef.current.set(candidate.id, now)
      globalScratchTimestampRef.current = now
      scratchActiveIdsRef.current.add(candidate.id)
      setLastImpact({
        type: 'scratch',
        clip: 'scratch',
        force: null,
        speed: null,
        intensity: Number(candidate.intensity.toFixed(3)),
        otherKind: 'floor',
      })
      playScratch({
        intensity: candidate.intensity,
      })
    }

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
