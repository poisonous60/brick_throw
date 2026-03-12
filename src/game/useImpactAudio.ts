import { useCallback, useEffect, useRef } from 'react'
import { sceneConfig } from '../config/sceneConfig'
import { impactSoundAssets } from '../lib/assets'

type ImpactStrength = 'medium' | 'strong'
type ImpactMaterial = 'brick' | 'world'

type AudioBankState = {
  context: AudioContext | null
  masterGain: GainNode | null
  impactStrong: AudioBuffer[]
  impactMedium: AudioBuffer[]
  scratch: AudioBuffer[]
  impactStrongIndex: number
  impactMediumIndex: number
  scratchIndex: number
  loadPromise: Promise<void> | null
}

type ImpactPlayback = {
  clip: ImpactStrength
  intensity: number
  material: ImpactMaterial
}

type ScratchPlayback = {
  intensity: number
}

function getRandomInRange(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function useImpactAudio() {
  const audioStateRef = useRef<AudioBankState>({
    context: null,
    masterGain: null,
    impactStrong: [],
    impactMedium: [],
    scratch: [],
    impactStrongIndex: 0,
    impactMediumIndex: 0,
    scratchIndex: 0,
    loadPromise: null,
  })

  const ensureContext = useCallback(() => {
    if (audioStateRef.current.context && audioStateRef.current.masterGain) {
      return audioStateRef.current.context
    }

    const AudioContextCtor = window.AudioContext

    if (!AudioContextCtor) {
      return null
    }

    const context = new AudioContextCtor()
    const masterGain = context.createGain()
    masterGain.gain.value = 1
    masterGain.connect(context.destination)

    audioStateRef.current.context = context
    audioStateRef.current.masterGain = masterGain

    return context
  }, [])

  const ensureBuffersLoaded = useCallback(async () => {
    const context = ensureContext()

    if (!context) {
      return
    }

    if (
      audioStateRef.current.impactStrong.length &&
      audioStateRef.current.impactMedium.length &&
      audioStateRef.current.scratch.length
    ) {
      return
    }

    if (!audioStateRef.current.loadPromise) {
      audioStateRef.current.loadPromise = (async () => {
        const decodeBank = async (urls: readonly string[]) =>
          Promise.all(
            urls.map(async (url) => {
              const response = await fetch(url)
              const data = await response.arrayBuffer()
              return context.decodeAudioData(data.slice(0))
            }),
          )

        const [impactStrong, impactMedium, scratch] = await Promise.all([
          decodeBank(impactSoundAssets.impact.strong),
          decodeBank(impactSoundAssets.impact.medium),
          decodeBank(impactSoundAssets.scratch),
        ])

        audioStateRef.current.impactStrong = impactStrong
        audioStateRef.current.impactMedium = impactMedium
        audioStateRef.current.scratch = scratch
        audioStateRef.current.impactStrongIndex = 0
        audioStateRef.current.impactMediumIndex = 0
        audioStateRef.current.scratchIndex = 0
      })()
    }

    await audioStateRef.current.loadPromise
  }, [ensureContext])

  const closeAudio = useCallback(() => {
    const { context, masterGain } = audioStateRef.current

    if (masterGain) {
      masterGain.disconnect()
    }

    if (context) {
      void context.close().catch(() => {})
    }
  }, [])

  useEffect(() => {
    void ensureBuffersLoaded()

    const unlockAudio = () => {
      const context = ensureContext()

      if (!context) {
        return
      }

      void ensureBuffersLoaded()
      void context.resume().catch(() => {})
    }

    window.addEventListener('pointerdown', unlockAudio)
    window.addEventListener('keydown', unlockAudio)

    return () => {
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
      closeAudio()
    }
  }, [closeAudio, ensureBuffersLoaded, ensureContext])

  const playImpact = ({ clip, intensity, material }: ImpactPlayback) => {
    const context = ensureContext()

    if (!context || !audioStateRef.current.masterGain) {
      return
    }

    if (
      !audioStateRef.current.impactStrong.length ||
      !audioStateRef.current.impactMedium.length ||
      !audioStateRef.current.scratch.length
    ) {
      void ensureBuffersLoaded()
      return
    }

    if (context.state === 'suspended') {
      void context.resume().catch(() => {})
    }

    const shapedIntensity = Math.sqrt(clamp01(intensity))
    const bank =
      clip === 'strong'
        ? audioStateRef.current.impactStrong
        : audioStateRef.current.impactMedium

    if (!bank.length) {
      return
    }

    const nextIndexKey =
      clip === 'strong'
        ? 'impactStrongIndex'
        : 'impactMediumIndex'
    const bankIndex = audioStateRef.current[nextIndexKey] % bank.length
    const buffer =
      bank[
        (bankIndex + Math.floor(Math.random() * Math.min(3, bank.length))) %
          bank.length
      ]

    audioStateRef.current[nextIndexKey] += 1
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    source.playbackRate.value =
      getRandomInRange(sceneConfig.audio.minPitch, sceneConfig.audio.maxPitch) -
      (1 - shapedIntensity) * 0.03
    const materialGain = material === 'world' ? 0.88 : 1
    gain.gain.value =
      (sceneConfig.audio.minVolume +
        (sceneConfig.audio.maxVolume - sceneConfig.audio.minVolume) * shapedIntensity) *
      materialGain

    source.connect(gain)
    gain.connect(audioStateRef.current.masterGain)
    source.start(context.currentTime)
    source.onended = () => {
      source.disconnect()
      gain.disconnect()
    }
  }

  const playScratch = ({ intensity }: ScratchPlayback) => {
    const context = ensureContext()

    if (!context || !audioStateRef.current.masterGain) {
      return
    }

    if (!audioStateRef.current.scratch.length) {
      void ensureBuffersLoaded()
      return
    }

    if (context.state === 'suspended') {
      void context.resume().catch(() => {})
    }

    const shapedIntensity = clamp01(intensity)
    const bankIndex = audioStateRef.current.scratchIndex % audioStateRef.current.scratch.length
    const clip =
      audioStateRef.current.scratch[
        (bankIndex + Math.floor(Math.random() * Math.min(3, audioStateRef.current.scratch.length))) %
          audioStateRef.current.scratch.length
      ]

    audioStateRef.current.scratchIndex += 1
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = clip
    source.playbackRate.value = getRandomInRange(0.96, 1.03) - (1 - shapedIntensity) * 0.02
    gain.gain.value = 0.16 + 0.26 * shapedIntensity

    source.connect(gain)
    gain.connect(audioStateRef.current.masterGain)
    source.start(context.currentTime)
    source.onended = () => {
      source.disconnect()
      gain.disconnect()
    }
  }

  return {
    playImpact,
    playScratch,
  }
}
