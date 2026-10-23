<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'

import Button from '~/components/Button.vue'
import Radio from '~/components/Radio.vue'
import Select from '~/components/Select.vue'
import { useLowPerformancePreset } from '~/components/Settings/composables/useLowPerformancePreset'
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import { settings } from '~/logic'

import SettingsItem from '../../components/SettingsItem.vue'
import SettingsItemGroup from '../../components/SettingsItemGroup.vue'
import SettingsSectionHeading from '../../components/SettingsSectionHeading.vue'
import LinkOpening from '../../Navigation/LinkOpening.vue'

const { t, locale } = useI18n()
const toast = useToast()
const { confirm: showConfirmDialog } = useConfirmDialog()
const {
  enabledOptions: enabledPresetOptions,
  canUndo,
  applyLowPerformancePreset,
  undoLowPerformancePreset,
} = useLowPerformancePreset()

const presetDescriptionKey = computed(() =>
  enabledPresetOptions.value.length
    ? 'settings.low_performance_preset_desc'
    : 'settings.low_performance_preset_none_enabled',
)
const presetApplyControlRef = ref<HTMLElement>()
const presetUndoControlRef = ref<HTMLElement>()

async function handleApplyLowPerformancePreset() {
  const options = enabledPresetOptions.value
  if (!options.length)
    return

  const toggleFields = options.map(option => ({
    id: option.key,
    label: t(option.labelKey),
    value: true,
  }))

  const confirmed = await showConfirmDialog(t('settings.low_performance_preset_confirm_desc'), {
    title: t('settings.low_performance_preset'),
    confirmLabel: t('settings.low_performance_preset_apply'),
    primaryAction: 'confirm',
    toggleFields,
  })
  if (!confirmed)
    return

  const selectedIds = new Set(
    toggleFields.filter(field => field.value).map(field => field.id),
  )
  const applied = applyLowPerformancePreset(options.filter(option => selectedIds.has(option.key)))
  if (applied) {
    toast.success(t('settings.low_performance_preset_applied'))
    nextTick(() => presetUndoControlRef.value?.querySelector('button')?.focus())
  }
}

function handleUndoLowPerformancePreset() {
  const restoredCount = undoLowPerformancePreset()
  if (restoredCount > 0)
    toast.success(t('settings.low_performance_preset_undone'))
  nextTick(() => presetApplyControlRef.value?.querySelector('button')?.focus())
}

const langOptions = computed(() => {
  return [
    {
      label: t('settings.select_language_opt.mandarin_cn'),
      value: 'cmn-CN',
    },
    {
      label: t('settings.select_language_opt.mandarin_tw'),
      value: 'cmn-TW',
    },
    {
      label: t('settings.select_language_opt.english'),
      value: 'en',
    },
    {
      label: t('settings.select_language_opt.jyut'),
      value: 'jyut',
    },
  ]
})

watch(() => settings.value.language, (newValue) => {
  locale.value = newValue
})
</script>

<template>
  <div>
    <SettingsSectionHeading
      :title="$t('settings.menu_general')"
      :desc="$t('settings.category_general_desc')"
      icon="i-mingcute:settings-3-fill"
    />

    <SettingsItemGroup :title="$t('settings.group_language')">
      <SettingsItem :title="$t('settings.select_language')" right-width="auto">
        <Select
          v-model="settings.language"
          :options="langOptions"
          w="160px"
        />
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup :title="$t('settings.group_performance_preset')">
      <SettingsItem
        :desc="$t(presetDescriptionKey)"
        data-settings-key="settings.low_performance_preset"
        right-width="auto"
      >
        <div flex="~ items-center gap-2">
          <div v-if="canUndo" ref="presetUndoControlRef">
            <Button
              type="secondary"
              size="small"
              :aria-label="$t('settings.low_performance_preset_undo_desc')"
              :title="$t('settings.low_performance_preset_undo_desc')"
              @click="handleUndoLowPerformancePreset"
            >
              {{ $t('common.undo') }}
            </Button>
          </div>
          <div ref="presetApplyControlRef">
            <Button
              type="primary"
              size="small"
              :disabled="!enabledPresetOptions.length"
              @click="handleApplyLowPerformancePreset"
            >
              {{ $t('settings.low_performance_preset_apply') }}
            </Button>
          </div>
        </div>
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup :title="$t('settings.group_interaction_layout')">
      <SettingsItem :title="$t('settings.touch_screen_optimization')" :desc="$t('settings.touch_screen_optimization_desc')" right-width="auto">
        <Radio v-model="settings.touchScreenOptimization" />
      </SettingsItem>

      <SettingsItem :title="$t('settings.enable_grid_layout_switcher')" right-width="auto">
        <Radio v-model="settings.enableGridLayoutSwitcher" />
      </SettingsItem>

      <SettingsItem :title="$t('settings.enable_horizontal_scrolling')" :desc="$t('settings.enable_horizontal_scrolling_desc')" right-width="auto">
        <Radio v-model="settings.enableHorizontalScrolling" />
      </SettingsItem>
    </SettingsItemGroup>

    <LinkOpening />

    <SettingsItemGroup :title="$t('settings.group_drawer_behavior')">
      <SettingsItem :title="$t('settings.close_drawer_without_pressing_esc_again')" right-width="auto">
        <template #title>
          <div v-html="$t('settings.close_drawer_without_pressing_esc_again')" />
        </template>
        <Radio v-model="settings.closeDrawerWithoutPressingEscAgain" />
      </SettingsItem>
    </SettingsItemGroup>
  </div>
</template>

<style lang="scss" scoped>
</style>
