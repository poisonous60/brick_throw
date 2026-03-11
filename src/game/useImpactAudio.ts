import { useEffect, useRef } from 'react'
import { sceneConfig } from '../config/sceneConfig'
import { impactSoundAssets } from '../lib/assets'

type ImpactStrength = 'weak' | 'strong'

type AudioBankState = {
  strong: HTMLAudioElement[]
  weak: HTMLAudioElement[]
  strongIndex: number
  weakIndex: number
}

function createBank(urls: readonly string[]) {
  return urls.flatMap((url) =>
    Array.from({ length: 3 }, () => {
      const audio = new Audio(url)
      audio.preload = 'auto'
      return audio
    }),
  )
}

function getRandomInRange(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export function useImpactAudio() {
  const audioStateRef = useRef<AudioBankState>({
    strong: [],
    weak: [],
    strongIndex: 0,
    weakIndex: 0,
  })

  useEffect(() => {
    const strong = createBank(impactSoundAssets.strong)
    const weak = createBank(impactSoundAssets.weak)

    audioStateRef.current = {
      strong,
      weak,
      strongIndex: 0,
      weakIndex: 0,
    }

    return () => {
      for (const clip of [...strong, ...weak]) {
        clip.pause()
        clip.src = ''
      }
    }
  }, [])

  const playImpact = (strength: ImpactStrength) => {
    const bank =
      strength === 'strong'
        ? audioStateRef.current.strong
        : audioStateRef.current.weak

    if (!bank.length) {
      return
    }

    const nextIndexKey = strength === 'strong' ? 'strongIndex' : 'weakIndex'
    const bankIndex = audioStateRef.current[nextIndexKey] % bank.length
    const clip = bank[(bankIndex + Math.floor(Math.random() * 2)) % bank.length]

    audioStateRef.current[nextIndexKey] += 1
    clip.currentTime = 0
    clip.volume = getRandomInRange(
      sceneConfig.audio.minVolume,
      sceneConfig.audio.maxVolume,
    )
    clip.playbackRate = getRandomInRange(
      sceneConfig.audio.minPitch,
      sceneConfig.audio.maxPitch,
    )

    void clip.play().catch(() => {})
  }

  return {
    playImpact,
  }
}
