import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Euler, MathUtils, Vector3 } from 'three'
import { sceneConfig } from '../config/sceneConfig'

const lookEuler = new Euler(0, 0, 0, 'YXZ')

function getBaseAngles() {
  const direction = new Vector3(...sceneConfig.camera.target)
    .sub(new Vector3(...sceneConfig.camera.position))
    .normalize()

  return {
    yaw: Math.atan2(direction.x, -direction.z),
    pitch: Math.asin(direction.y),
  }
}

export function useLookDrag() {
  const { camera, gl } = useThree()
  const lookStateRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startYawOffset: 0,
    startPitchOffset: 0,
    yawOffset: 0,
    pitchOffset: 0,
    ...getBaseAngles(),
  })

  useEffect(() => {
    const baseAngles = getBaseAngles()
    lookStateRef.current.yaw = baseAngles.yaw
    lookStateRef.current.pitch = baseAngles.pitch
    lookStateRef.current.yawOffset = 0
    lookStateRef.current.pitchOffset = 0

    camera.position.set(...sceneConfig.camera.position)
    lookEuler.set(baseAngles.pitch, baseAngles.yaw, 0)
    camera.quaternion.setFromEuler(lookEuler)
    camera.updateMatrixWorld()
  }, [camera])

  useEffect(() => {
    const canvas = gl.domElement
    const ownerDocument = canvas.ownerDocument

    const applyLook = () => {
      const yaw = lookStateRef.current.yaw + lookStateRef.current.yawOffset
      const pitch = MathUtils.clamp(
        lookStateRef.current.pitch + lookStateRef.current.pitchOffset,
        lookStateRef.current.pitch + sceneConfig.camera.minPitchOffset,
        lookStateRef.current.pitch + sceneConfig.camera.maxPitchOffset,
      )

      lookEuler.set(pitch, yaw, 0)
      camera.quaternion.setFromEuler(lookEuler)
      camera.updateMatrixWorld()
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 2) {
        return
      }

      lookStateRef.current.dragging = true
      lookStateRef.current.startX = event.clientX
      lookStateRef.current.startY = event.clientY
      lookStateRef.current.startYawOffset = lookStateRef.current.yawOffset
      lookStateRef.current.startPitchOffset = lookStateRef.current.pitchOffset
      canvas.style.cursor = 'grabbing'
      event.preventDefault()
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!lookStateRef.current.dragging) {
        return
      }

      const deltaX = event.clientX - lookStateRef.current.startX
      const deltaY = event.clientY - lookStateRef.current.startY

      lookStateRef.current.yawOffset = MathUtils.clamp(
        lookStateRef.current.startYawOffset -
          deltaX * sceneConfig.camera.lookSensitivity,
        sceneConfig.camera.minYawOffset,
        sceneConfig.camera.maxYawOffset,
      )
      lookStateRef.current.pitchOffset = MathUtils.clamp(
        lookStateRef.current.startPitchOffset -
          deltaY * sceneConfig.camera.lookSensitivity,
        sceneConfig.camera.minPitchOffset,
        sceneConfig.camera.maxPitchOffset,
      )

      applyLook()
      event.preventDefault()
    }

    const stopDragging = () => {
      lookStateRef.current.dragging = false
      canvas.style.cursor = 'default'
    }

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button !== 2 || !lookStateRef.current.dragging) {
        return
      }

      stopDragging()
    }

    const handleWindowBlur = () => {
      if (!lookStateRef.current.dragging) {
        return
      }

      stopDragging()
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
      canvas.style.cursor = 'default'
    }
  }, [camera, gl])
}
