import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { MathUtils, Vector2, Vector3, type Camera } from 'three'
import { sceneConfig, type Vec3Tuple } from '../config/sceneConfig'

export type AimState = {
  drag: [number, number]
  heldPosition: Vec3Tuple
  heldRotation: Vec3Tuple
  velocity: Vec3Tuple
  angularVelocity: Vec3Tuple
}

export type ThrowLaunch = {
  position: Vec3Tuple
  rotation: Vec3Tuple
  velocity: Vec3Tuple
  angularVelocity: Vec3Tuple
}

type UseThrowInputOptions = {
  onAimStateChange: (aimState: AimState | null) => void
  onThrow: (launch: ThrowLaunch) => void
}

type GestureSample = {
  x: number
  y: number
  time: number
}

const cameraForwardAxis = new Vector3(0, 0, -1)
const cameraRightAxis = new Vector3(1, 0, 0)
const cameraUpAxis = new Vector3(0, 1, 0)

function roundTuple(values: [number, number, number]): Vec3Tuple {
  return values.map((value) => Number(value.toFixed(3))) as Vec3Tuple
}

function buildCameraBasis(camera: Camera) {
  const forward = cameraForwardAxis
    .clone()
    .applyQuaternion(camera.quaternion)
    .normalize()
  const right = cameraRightAxis
    .clone()
    .applyQuaternion(camera.quaternion)
    .normalize()
  const up = cameraUpAxis
    .clone()
    .applyQuaternion(camera.quaternion)
    .normalize()

  return {
    forward,
    right,
    up,
  }
}

function getReferenceSample(samples: GestureSample[], currentTime: number) {
  const cutoff = currentTime - sceneConfig.throw.sampleWindowMs

  for (let index = samples.length - 1; index >= 0; index -= 1) {
    if (samples[index].time <= cutoff) {
      return samples[index]
    }
  }

  return samples[0]
}

function buildAimState(
  camera: Camera,
  origin: Vec3Tuple,
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  samples: GestureSample[],
) {
  const now = performance.now()
  const dragX = currentX - startX
  const dragY = currentY - startY
  const currentSample: GestureSample = { x: currentX, y: currentY, time: now }
  const recentReference = getReferenceSample(samples, now)
  const dt = Math.max(16, currentSample.time - recentReference.time)
  const recentDx = currentSample.x - recentReference.x
  const recentDy = currentSample.y - recentReference.y
  const vx = recentDx / (dt / 1000)
  const vy = recentDy / (dt / 1000)
  const overall = new Vector2(dragX, dragY)
  const recent = new Vector2(recentDx, recentDy)
  const overallDirection = overall.lengthSq() > 1 ? overall.clone().normalize() : new Vector2()
  const recentDirection = recent.lengthSq() > 1 ? recent.clone().normalize() : new Vector2()
  const reversal = Math.max(0, -overallDirection.dot(recentDirection))
  const curve =
    overallDirection.x * recentDirection.y - overallDirection.y * recentDirection.x
  const recentSpeed = Math.hypot(vx, vy)
  const { forward, right, up } = buildCameraBasis(camera)
  const forwardVelocity = MathUtils.clamp(
    -vy * sceneConfig.throw.forwardVelocityScale,
    sceneConfig.throw.minForwardVelocity,
    sceneConfig.throw.maxForwardVelocity,
  )
  const sideVelocity = MathUtils.clamp(
    vx * sceneConfig.throw.sideVelocityScale,
    -sceneConfig.throw.maxSideVelocity,
    sceneConfig.throw.maxSideVelocity,
  )
  const liftVelocity = MathUtils.clamp(
    sceneConfig.throw.liftVelocityBias - vy * sceneConfig.throw.liftVelocityScale,
    sceneConfig.throw.minLiftVelocity,
    sceneConfig.throw.maxLiftVelocity,
  )
  const velocity = forward
    .clone()
    .multiplyScalar(forwardVelocity)
    .add(right.clone().multiplyScalar(sideVelocity))
    .add(up.clone().multiplyScalar(liftVelocity))
  const heldPosition = new Vector3(...origin)
    .add(
      forward
        .clone()
        .multiplyScalar(
          MathUtils.clamp(
            -dragY * sceneConfig.throw.holdForwardScale,
            -sceneConfig.throw.maxHoldForwardOffset,
            sceneConfig.throw.maxHoldForwardOffset,
          ),
        ),
    )
    .add(
      right
        .clone()
        .multiplyScalar(
          MathUtils.clamp(
            dragX * sceneConfig.throw.holdSideScale,
            -sceneConfig.throw.maxHoldSideOffset,
            sceneConfig.throw.maxHoldSideOffset,
          ),
        ),
    )
    .add(
      up
        .clone()
        .multiplyScalar(
          MathUtils.clamp(
            Math.max(0, -dragY) * sceneConfig.throw.holdLiftScale,
            0,
            sceneConfig.throw.maxHoldLiftOffset,
          ),
        ),
    )

  const heldRotation: Vec3Tuple = [
    MathUtils.clamp(
      -dragY * sceneConfig.throw.pitchTiltScale,
      -sceneConfig.throw.maxTilt,
      sceneConfig.throw.maxTilt,
    ),
    MathUtils.clamp(
      -dragX * sceneConfig.throw.yawTiltScale,
      -sceneConfig.throw.maxTilt,
      sceneConfig.throw.maxTilt,
    ),
    MathUtils.clamp(
      vx * sceneConfig.throw.rollTiltScale,
      -sceneConfig.throw.maxTilt,
      sceneConfig.throw.maxTilt,
    ),
  ]

  const spinAroundRight = MathUtils.clamp(
    reversal * recentSpeed * sceneConfig.throw.spinReversalScale,
    -sceneConfig.throw.maxAngularVelocity,
    sceneConfig.throw.maxAngularVelocity,
  )
  const spinAroundUp = MathUtils.clamp(
    vx * sceneConfig.throw.spinLateralScale,
    -sceneConfig.throw.maxAngularVelocity,
    sceneConfig.throw.maxAngularVelocity,
  )
  const spinAroundForward = MathUtils.clamp(
    curve * recentSpeed * sceneConfig.throw.spinCurveScale -
      vy * sceneConfig.throw.spinForwardScale,
    -sceneConfig.throw.maxAngularVelocity,
    sceneConfig.throw.maxAngularVelocity,
  )
  const angularVelocity = right
    .clone()
    .multiplyScalar(spinAroundRight)
    .add(up.clone().multiplyScalar(spinAroundUp))
    .add(forward.clone().multiplyScalar(spinAroundForward))

  return {
    drag: [dragX, dragY] as [number, number],
    heldPosition: roundTuple(heldPosition.toArray() as [number, number, number]),
    heldRotation,
    velocity: roundTuple(velocity.toArray() as [number, number, number]),
    angularVelocity: roundTuple(
      angularVelocity.toArray() as [number, number, number],
    ),
  } satisfies AimState
}

export function useThrowInput({
  onAimStateChange,
  onThrow,
}: UseThrowInputOptions) {
  const { camera, gl } = useThree()
  const dragStateRef = useRef({
    isAiming: false,
    startX: 0,
    startY: 0,
    latestAimState: null as AimState | null,
    samples: [] as GestureSample[],
  })
  const aimStateChangeRef = useRef(onAimStateChange)
  const throwRef = useRef(onThrow)

  useEffect(() => {
    aimStateChangeRef.current = onAimStateChange
  }, [onAimStateChange])

  useEffect(() => {
    throwRef.current = onThrow
  }, [onThrow])

  useEffect(() => {
    const canvas = gl.domElement
    const ownerDocument = canvas.ownerDocument

    const updateAim = (event: MouseEvent) => {
      const nextSample = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
      }

      dragStateRef.current.samples.push(nextSample)
      dragStateRef.current.samples = dragStateRef.current.samples.slice(-12)
      dragStateRef.current.latestAimState = buildAimState(
        camera,
        sceneConfig.throw.origin,
        dragStateRef.current.startX,
        dragStateRef.current.startY,
        event.clientX,
        event.clientY,
        dragStateRef.current.samples,
      )
      aimStateChangeRef.current(dragStateRef.current.latestAimState)
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 2) {
        event.preventDefault()
        return
      }

      if (event.button !== 0) {
        return
      }

      const initialSample = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
      }

      dragStateRef.current.isAiming = true
      dragStateRef.current.startX = event.clientX
      dragStateRef.current.startY = event.clientY
      dragStateRef.current.samples = [initialSample]
      dragStateRef.current.latestAimState = buildAimState(
        camera,
        sceneConfig.throw.origin,
        event.clientX,
        event.clientY,
        event.clientX,
        event.clientY,
        dragStateRef.current.samples,
      )
      aimStateChangeRef.current(dragStateRef.current.latestAimState)
      event.preventDefault()
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStateRef.current.isAiming) {
        return
      }

      updateAim(event)
      event.preventDefault()
    }

    const finishThrow = () => {
      dragStateRef.current.isAiming = false

      if (dragStateRef.current.latestAimState) {
        const { drag, velocity, angularVelocity, heldPosition, heldRotation } =
          dragStateRef.current.latestAimState
        const recentSample =
          dragStateRef.current.samples[dragStateRef.current.samples.length - 1]
        const referenceSample = getReferenceSample(
          dragStateRef.current.samples,
          recentSample?.time ?? performance.now(),
        )
        const dt = Math.max(
          16,
          (recentSample?.time ?? performance.now()) - referenceSample.time,
        )
        const recentSpeed = recentSample
          ? Math.hypot(
              recentSample.x - referenceSample.x,
              recentSample.y - referenceSample.y,
            ) /
            (dt / 1000)
          : 0
        const dragDistance = Math.hypot(drag[0], drag[1])

        if (
          dragDistance >= sceneConfig.throw.minReleaseDistance ||
          recentSpeed >= sceneConfig.throw.minReleaseSpeed
        ) {
          throwRef.current({
            position: heldPosition,
            rotation: heldRotation,
            velocity,
            angularVelocity,
          })
        }
      }

      dragStateRef.current.latestAimState = null
      dragStateRef.current.samples = []
      aimStateChangeRef.current(null)
    }

    const handleMouseUp = (event: MouseEvent) => {
      if (!dragStateRef.current.isAiming || event.button !== 0) {
        return
      }

      finishThrow()
    }

    const handleWindowBlur = () => {
      if (!dragStateRef.current.isAiming) {
        return
      }

      finishThrow()
    }

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    ownerDocument.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('blur', handleWindowBlur)
    canvas.addEventListener('contextmenu', handleContextMenu)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      ownerDocument.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('blur', handleWindowBlur)
      canvas.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [camera, gl])
}
