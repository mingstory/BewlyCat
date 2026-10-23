import type { AmbilightPreset } from '~/logic/storage'

export interface AmbilightPresetOption {
  labelKey: string
  value: AmbilightPreset
}

export interface AmbilightFpsOption {
  labelKey: string
  value: number
}

export const ambilightPresetOptions: AmbilightPresetOption[] = [
  { labelKey: 'settings.ambilight.preset_soft', value: 'soft' },
  { labelKey: 'settings.ambilight.preset_cinema', value: 'cinema' },
  { labelKey: 'settings.ambilight.preset_vivid', value: 'vivid' },
]

export const ambilightFpsOptions: AmbilightFpsOption[] = [
  { labelKey: 'settings.ambilight.fps_15', value: 15 },
  { labelKey: 'settings.ambilight.fps_24', value: 24 },
  { labelKey: 'settings.ambilight.fps_30', value: 30 },
]
