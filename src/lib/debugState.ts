import { sceneConfig, type Vec3Tuple } from '../config/sceneConfig'

type DebugBrick = {
  id: string
  position: Vec3Tuple
  velocity: Vec3Tuple
  angularVelocity: Vec3Tuple
  sleeping: boolean
}

type DebugInvisibleWall = {
  id: string
  position: Vec3Tuple
  size: Vec3Tuple
}

export type DebugSnapshot = {
  coordinateSystem: string
  mode: 'ready' | 'aiming'
  thrownBrickCap: number
  throwOrigin: Vec3Tuple
  camera: {
    position: Vec3Tuple
    target: Vec3Tuple
  }
  aim:
    | null
    | {
        dragPixels: [number, number]
        velocity: Vec3Tuple
        angularVelocity: Vec3Tuple
        heldPosition: Vec3Tuple
        heldRotation: Vec3Tuple
      }
  thrownBricks: DebugBrick[]
  wallBricks: DebugBrick[]
  invisibleWalls: DebugInvisibleWall[]
  lastImpact: 'weak' | 'strong' | null
}

let currentSnapshot: DebugSnapshot = {
  coordinateSystem:
    'x increases to the right, y increases upward, negative z travels down the alley toward the target wall.',
  mode: 'ready',
  thrownBrickCap: sceneConfig.brick.spawnLimit,
  throwOrigin: sceneConfig.throw.origin,
  camera: {
    position: sceneConfig.camera.position,
    target: sceneConfig.camera.target,
  },
  aim: null,
  thrownBricks: [],
  wallBricks: [],
  invisibleWalls: sceneConfig.invisibleWalls
    .filter((wall) => wall.enabled)
    .map((wall) => ({
      id: wall.id,
      position: wall.position,
      size: wall.size,
    })),
  lastImpact: null,
}

export function setDebugSnapshot(snapshot: DebugSnapshot) {
  currentSnapshot = snapshot
}

export function getDebugSnapshot() {
  return currentSnapshot
}

export function roundTuple(values: [number, number, number]): Vec3Tuple {
  return values.map((value) => Number(value.toFixed(2))) as Vec3Tuple
}
