import alleywayModelUrl from '../../assets/model/alleyway.glb?url'
import brickModelUrl from '../../assets/model/Brick.glb?url'
import powerfulImpact1Url from '../../assets/sound/powerful_impact_1.mp3?url'
import powerfulImpact2Url from '../../assets/sound/powerful_impact_2.mp3?url'
import weakImpact1Url from '../../assets/sound/weak_impact_1.mp3?url'
import weakImpact2Url from '../../assets/sound/weak_impact_2.mp3?url'

export const modelAssets = {
  alleyway: alleywayModelUrl,
  brick: brickModelUrl,
} as const

export const impactSoundAssets = {
  strong: [powerfulImpact1Url, powerfulImpact2Url],
  weak: [weakImpact1Url, weakImpact2Url],
} as const
