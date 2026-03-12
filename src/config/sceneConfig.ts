import { Vector3 } from 'three'

export type Vec3Tuple = [number, number, number]
export type ColliderBoxTuple = [number, number, number]

export type InvisibleWallConfig = {
  id: string
  enabled: boolean
  position: Vec3Tuple
  size: ColliderBoxTuple
  rotation?: Vec3Tuple
}

const alleywayConfig = {
  position: [0, -3.1, 10.5] as Vec3Tuple,
  rotation: [0, Math.PI, 0] as Vec3Tuple,
  scale: 0.75,
} as const

const targetWallConfig = {
  anchor: [0, 1.13, -15.95] as Vec3Tuple,
  rows: 3,
  columns: 4,
  gap: 0.1,
} as const

const physicsConfig = {
  gravity: [0, -18, 0] as Vec3Tuple,
  floorY: -3.02,
  laneHalfWidth: 4.8,
  laneHalfDepth: 20,
  floorThickness: 0.22,
  sideWallHeight: 12,
  sideWallThickness: 0.18,
  endWallThickness: 0.22,
  endWallInset: 2,
} as const

const laneMidZ = targetWallConfig.anchor[2] / 2
const wallMidY = physicsConfig.sideWallHeight / 2

const invisibleWalls = [
  {
    id: 'floor',
    enabled: true,
    size: [
      physicsConfig.laneHalfWidth * 10,
      physicsConfig.floorThickness / 2,
      physicsConfig.laneHalfDepth * 10,
    ] as ColliderBoxTuple,
    position: [
      0,
      physicsConfig.floorY - physicsConfig.floorThickness / 2,
      laneMidZ,
    ] as Vec3Tuple,
  },
  {
    id: 'leftWall',
    enabled: true,
    size: [
      physicsConfig.sideWallThickness / 2,
      physicsConfig.sideWallHeight,
      physicsConfig.laneHalfDepth * 10,
    ] as ColliderBoxTuple,
    position: [
      -physicsConfig.laneHalfWidth - physicsConfig.sideWallThickness / 2,
      wallMidY,
      laneMidZ,
    ] as Vec3Tuple,
  },
  {
    id: 'rightWall',
    enabled: true,
    size: [
      physicsConfig.sideWallThickness / 2,
      physicsConfig.sideWallHeight,
      physicsConfig.laneHalfDepth * 10,
    ] as ColliderBoxTuple,
    position: [
      physicsConfig.laneHalfWidth + physicsConfig.sideWallThickness / 2,
      wallMidY,
      laneMidZ,
    ] as Vec3Tuple,
  },
  {
    id: 'frontWall',
    enabled: true,
    size: [
      physicsConfig.laneHalfWidth,
      physicsConfig.sideWallHeight,
      physicsConfig.endWallThickness / 2,
    ] as ColliderBoxTuple,
    position: [
      0,
      wallMidY,
      targetWallConfig.anchor[2] - physicsConfig.endWallInset,
    ] as Vec3Tuple,
  },
  {
    id: 'ceiling',
    enabled: false,
    size: [
      physicsConfig.laneHalfWidth,
      physicsConfig.floorThickness / 2,
      physicsConfig.laneHalfDepth,
    ] as ColliderBoxTuple,
    position: [
      0,
      physicsConfig.sideWallHeight + physicsConfig.floorThickness / 2,
      laneMidZ,
    ] as Vec3Tuple,
  },
  {
    id: 'LeftFiller1',
    enabled: true,
    size: [0.34, 17, 0.8] as ColliderBoxTuple,
    position: [-4.9, 1, -6.55] as Vec3Tuple,
  },
  {
    id: 'LeftFiller2',
    enabled: true,
    size: [0.5, 4.59, 4.35] as ColliderBoxTuple,
    position: [-4.7, 1, -13] as Vec3Tuple,
  },
  {
    id: 'LeftBulb',
    enabled: true,
    size: [3, 0.15, 0.7] as ColliderBoxTuple,
    position: [-4.7, 6.6, -11] as Vec3Tuple,
  },
  {
    id: 'RightFiller1',
    enabled: true,
    size: [0.34, 17, 0.8] as ColliderBoxTuple,
    position: [4.9, 1, -6.55] as Vec3Tuple,
  },
  {
    id: 'rightTitledPlate1',
    enabled: true,
    size: [0.34, 4.3, 1.15] as ColliderBoxTuple,
    position: [3.58, 1.3, -0.7] as Vec3Tuple,
    rotation: [0, 0, -0.2] as Vec3Tuple,
  },
  {
    id: 'rightTitledPlate2',
    enabled: true,
    size: [0.34, 4.3, 1.40] as ColliderBoxTuple,
    position: [3.8, 1.3, -4.5] as Vec3Tuple,
    rotation: [0, 0, -0.25] as Vec3Tuple,
  },
  {
    id: 'rightTitledPlate3',
    enabled: true,
    size: [0.15, 4.3, 1.3] as ColliderBoxTuple,
    position: [3, 1.3, -7.5] as Vec3Tuple,
    rotation: [0, -1.1, -0.15] as Vec3Tuple,
  },
] as const satisfies readonly InvisibleWallConfig[]

export const sceneConfig = {
  world: {
    background: '#000000',
    fogColor: '#1b162e',
    fogNear: 12,
    fogFar: 64,
  },
  alleyway: alleywayConfig,
  camera: {
    position: [0.12, 3.1, 3.8] as Vec3Tuple,
    target: [0, 1.65, -4.7] as Vec3Tuple,
    fov: 40,
    lookSensitivity: 0.0022,
    lookDistance: 10,
    minYawOffset: -1000.05,
    maxYawOffset: 1000.05,
    minPitchOffset: -1.35,
    maxPitchOffset: 1.32,
  },
  physics: physicsConfig,
  invisibleWalls,
  lighting: {
    ambientIntensity: 0.12,
    hemisphereIntensity: 0.08,
    hemisphereSkyColor: '#a89f95',
    hemisphereGroundColor: '#14100d',
    directionalIntensity: 0.22,
    directionalColor: '#9fadc0',
    directionalPosition: [6, 10, 4] as Vec3Tuple,
    directionalShadowFar: 24,
    directionalShadowBounds: 8,
    spotIntensity: 30,
    spotAngle: 0.76,
    spotPenumbra: 1.9,
    spotPosition: [0, 9, -11] as Vec3Tuple,
    spotTarget: [0, 0, -11] as Vec3Tuple,
    spotDistance: 26,
    spotDecay: 1.4,
    spotShadowBias: -0.0118,
    spotColor: '#d8b27d',
  },
  throw: {
    origin: [0, 2.0, 2.8] as Vec3Tuple,
    sampleWindowMs: 150,
    minReleaseDistance: 18,
    minReleaseSpeed: 115,
    minForwardVelocity: 7.5,
    maxForwardVelocity: 70,
    forwardVelocityScale: 0.012,
    sideVelocityScale: 0.009,
    maxSideVelocity: 10,
    liftVelocityBias: 0.55,
    liftVelocityScale: 0.0022,
    minLiftVelocity: -0.35,
    maxLiftVelocity: 3.8,
    holdSideScale: 0.0023,
    holdForwardScale: 0.0018,
    holdLiftScale: 0.001,
    maxHoldSideOffset: 0.52,
    maxHoldForwardOffset: 0.42,
    maxHoldLiftOffset: 0.28,
    pitchTiltScale: 0.0032,
    yawTiltScale: 0.0025,
    rollTiltScale: 0.00075,
    maxTilt: 0.9,
    spinReversalScale: 0.0032,
    spinCurveScale: 0.0024,
    spinLateralScale: 0.0018,
    spinForwardScale: 0.0012,
    maxAngularVelocity: 9.5,
  },
  targetWall: targetWallConfig,
  brick: {
    visualScale: 0.95,
    collider: [0.29, 0.11, 0.12] as Vec3Tuple,
    despawnY: -100,
    thrownGravityScale: 0.86,
    thrownMass: 3,
    wallMass: 0.55,
    friction: 0.84,
    restitution: 0.14,
    thrownLinearDamping: 0.14,
    wallLinearDamping: 0.18,
    thrownAngularDamping: 0.2,
    wallAngularDamping: 0.24,
    spawnLimit: 10,
  },
  audio: {
    minImpactSpeed: 2,
    strongImpactSpeed: 5,
    minImpactForce: 14,
    maxImpactForce: 110,
    scratchMinSpeed: 0.45,
    scratchMaxSpeed: 3.6,
    scratchMaxVerticalSpeed: 0.8,
    scratchFloorDistance: 0.08,
    scratchAfterImpactDelayMs: 90,
    scratchBodyCooldownMs: 320,
    scratchGlobalCooldownMs: 140,
    globalCooldownMs: 45,
    bodyCooldownMs: 90,
    pairCooldownMs: 110,
    minVolume: 0.18,
    maxVolume: 0.92,
    minPitch: 0.93,
    maxPitch: 1.08,
  },
  debug: {
    showInvisibleWalls: false,
    invisibleWallColor: '#ff0000',
    invisibleWallOpacity: 0.5,
  },
  visuals: {
    aimColor: '#ff7f2a',
    floorTint: '#c8c0b6',
  },
} as const

const throwOriginVector = new Vector3(...sceneConfig.throw.origin)
const targetAnchorVector = new Vector3(...sceneConfig.targetWall.anchor)
const laneForwardVector = targetAnchorVector
  .clone()
  .sub(throwOriginVector)
  .setY(0)
  .normalize()
const laneRightVector = new Vector3()
  .crossVectors(laneForwardVector, new Vector3(0, 1, 0))
  .normalize()

export function getLaneBasis() {
  return {
    forward: laneForwardVector.clone(),
    right: laneRightVector.clone(),
  }
}

export function buildTargetWallLayout() {
  const [halfWidth, halfHeight] = sceneConfig.brick.collider
  const fullWidth = halfWidth * 2
  const fullHeight = halfHeight * 2
  const offsetX = fullWidth + sceneConfig.targetWall.gap
  const offsetY = fullHeight + sceneConfig.targetWall.gap

  return Array.from(
    { length: sceneConfig.targetWall.rows * sceneConfig.targetWall.columns },
    (_, index) => {
      const row = Math.floor(index / sceneConfig.targetWall.columns)
      const column = index % sceneConfig.targetWall.columns
      const centeredColumn = column - (sceneConfig.targetWall.columns - 1) / 2

      return [
        sceneConfig.targetWall.anchor[0] + centeredColumn * offsetX,
        sceneConfig.physics.floorY + halfHeight + row * offsetY,
        sceneConfig.targetWall.anchor[2],
      ] as Vec3Tuple
    },
  )
}
