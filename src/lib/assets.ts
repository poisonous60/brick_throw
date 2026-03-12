import alleywayModelUrl from '../../assets/model/alleyway.glb?url'
import brickModelUrl from '../../assets/model/Brick.glb?url'
import impact1Url from '../../assets/sound/impact_1.mp3?url'
import impact2Url from '../../assets/sound/impact_2.mp3?url'
import impact3Url from '../../assets/sound/impact_3.mp3?url'
import scratch1Url from '../../assets/sound/scratch1.mp3?url'
import scratch2Url from '../../assets/sound/scratch2.mp3?url'
import scratch3Url from '../../assets/sound/scratch3.mp3?url'
import weakImpact1Url from '../../assets/sound/weak_impact1.mp3?url'

export const modelAssets = {
  alleyway: alleywayModelUrl,
  brick: brickModelUrl,
} as const

export const impactSoundAssets = {
  impact: {
    strong: [impact1Url, impact2Url, impact3Url],
    medium: [weakImpact1Url],
  },
  scratch: [scratch1Url, scratch2Url, scratch3Url],
} as const
