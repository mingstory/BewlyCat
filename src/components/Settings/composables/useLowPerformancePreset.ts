import { computed, ref, watch } from 'vue'
import browser from 'webextension-polyfill'

import { useStorageLocal } from '~/composables/useStorageLocal'
import type { Settings } from '~/logic'
import { settings, settingsReady } from '~/logic'

type BooleanSettingKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never
}[keyof Settings]

interface LowPerformancePresetOption {
  key: BooleanSettingKey
  labelKey: string
}

const lowPerformancePresetOptions = [
  { key: 'ambilightEnabled', labelKey: 'settings.ambilight.title' },
  { key: 'enableFrostedGlass', labelKey: 'settings.low_performance_preset_effect_frosted_glass' },
  { key: 'enableLiquidSegmentIndicator', labelKey: 'settings.low_performance_preset_effect_liquid_indicator' },
  { key: 'immersivePreloadNext', labelKey: 'settings.low_performance_preset_effect_immersive_preload' },
  { key: 'enableVideoPreview', labelKey: 'settings.low_performance_preset_effect_video_preview' },
  { key: 'enableSidebarCoverBlur', labelKey: 'settings.low_performance_preset_effect_sidebar_cover_blur' },
] as const satisfies readonly LowPerformancePresetOption[]

type LowPerformancePresetBackup = Partial<Record<BooleanSettingKey, boolean>>

const LOW_PERFORMANCE_PRESET_BACKUP_KEY = 'lowPerformancePresetBackup'

export async function clearLowPerformancePresetBackup() {
  try {
    await browser.storage.local.remove(LOW_PERFORMANCE_PRESET_BACKUP_KEY)
  }
  catch (error) {
    console.error(error)
  }
}

export function useLowPerformancePreset() {
  const backup = useStorageLocal<LowPerformancePresetBackup | null>(
    LOW_PERFORMANCE_PRESET_BACKUP_KEY,
    {},
    { mergeDefaults: true, writeDefaults: false },
  )

  const backupFields = computed<LowPerformancePresetBackup>(() => {
    const stored = backup.value
    if (!stored || typeof stored !== 'object')
      return {}

    const fields: LowPerformancePresetBackup = {}
    for (const option of lowPerformancePresetOptions) {
      const value = stored[option.key]
      if (typeof value === 'boolean')
        fields[option.key] = value
    }
    return fields
  })

  const enabledOptions = computed(() =>
    lowPerformancePresetOptions.filter(option => settings.value[option.key]),
  )

  const restorableOptions = computed(() =>
    lowPerformancePresetOptions.filter(option =>
      backupFields.value[option.key] !== undefined && settings.value[option.key] === false,
    ),
  )

  const canUndo = computed(() => restorableOptions.value.length > 0)

  const settingsAreReady = ref(false)
  void settingsReady.then(() => {
    settingsAreReady.value = true
  })

  // 用户手动改回相关设置后，上一次应用的备份已经没有可恢复项，及时失效。
  watch([settingsAreReady, restorableOptions], ([ready, options]) => {
    if (ready && !options.length && Object.keys(backupFields.value).length > 0)
      backup.value = null
  })

  function applyLowPerformancePreset(options: readonly LowPerformancePresetOption[]): boolean {
    const previousFields: LowPerformancePresetBackup = {}
    let applied = false

    for (const option of options) {
      if (!settings.value[option.key])
        continue

      previousFields[option.key] = settings.value[option.key]
      settings.value[option.key] = false
      applied = true
    }

    if (applied)
      backup.value = previousFields

    return applied
  }

  function undoLowPerformancePreset(): number {
    let restoredCount = 0

    for (const option of restorableOptions.value) {
      const previousValue = backupFields.value[option.key]
      if (previousValue !== undefined) {
        settings.value[option.key] = previousValue
        restoredCount++
      }
    }

    backup.value = null
    return restoredCount
  }

  return { enabledOptions, canUndo, applyLowPerformancePreset, undoLowPerformancePreset }
}
