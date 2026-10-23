<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

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

async function handleApplyLowPerformancePreset() {
  const options = enabledPresetOptions.value
  if (!options.length)
    return

  const toggleFields = options.map(option => ({
    id: option.key,
    label: t(option.titleKey),
    value: true,
    enabledLabel: t('settings.low_performance_preset_include'),
    disabledLabel: t('settings.low_performance_preset_skip'),
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
  applyLowPerformancePreset(options.filter(option => selectedIds.has(option.key)))
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
        :title="$t('settings.low_performance_preset')"
        :desc="$t(presetDescriptionKey)"
        right-width="auto"
      >
        <Button
          type="primary"
          size="small"
          :disabled="!enabledPresetOptions.length"
          @click="handleApplyLowPerformancePreset"
        >
          {{ $t('settings.low_performance_preset_apply') }}
        </Button>
        <template v-if="canUndo" #bottom>
          <div flex="~ items-center justify-between gap-4">
            <span text="sm $bew-text-2">{{ $t('settings.low_performance_preset_undo_desc') }}</span>
            <Button type="secondary" size="small" @click="undoLowPerformancePreset">
              {{ $t('common.undo') }}
            </Button>
          </div>
        </template>
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
