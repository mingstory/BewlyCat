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
  titleKey: string
}

const lowPerformancePresetOptions = [
  { key: 'ambilightEnabled', titleKey: 'settings.ambilight.title' },
  { key: 'enableFrostedGlass', titleKey: 'settings.enable_frosted_glass' },
  { key: 'enableLiquidSegmentIndicator', titleKey: 'settings.enable_liquid_segment_indicator' },
  { key: 'immersivePreloadNext', titleKey: 'settings.immersive_preload_next' },
  { key: 'enableVideoPreview', titleKey: 'settings.enable_video_preview' },
  { key: 'enableSidebarCoverBlur', titleKey: 'settings.sidebar_cover_blur' },
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
  const backup = useStorageLocal<LowPerformancePresetBackup>(
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
      backup.value = {}
  })

  function applyLowPerformancePreset(options: readonly LowPerformancePresetOption[]) {
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
  }

  function undoLowPerformancePreset() {
    for (const option of restorableOptions.value) {
      const previousValue = backupFields.value[option.key]
      if (previousValue !== undefined)
        settings.value[option.key] = previousValue
    }

    backup.value = {}
  }

  return { enabledOptions, canUndo, applyLowPerformancePreset, undoLowPerformancePreset }
}
