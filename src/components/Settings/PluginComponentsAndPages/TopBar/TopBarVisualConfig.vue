<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import draggable from 'vuedraggable'

import bilibiliBrandLogoUrl from '~/assets/branding/bilibili-brand-logo.png'
import Button from '~/components/Button.vue'
import Dialog from '~/components/Dialog.vue'
import Radio from '~/components/Radio.vue'
import Select from '~/components/Select.vue'
import { VideoPageTopBarConfig } from '~/enums/appEnums'
import { settings } from '~/logic'
import type { TopBarStyle } from '~/logic/storage'

import { allChannelConfigs } from '../../../TopBar/constants/channels'
import SettingsItem from '../../components/SettingsItem.vue'
import SettingsItemGroup from '../../components/SettingsItemGroup.vue'

const { t } = useI18n()

type BadgeType = 'number' | 'dot' | 'none'
type BadgeSelectValue = BadgeType | 'numberWithLikes'

interface TopBarComponent {
  key: string
  i18nKey: string
  icon: string
  supportsBadge: boolean
}

const topBarComponents = computed<TopBarComponent[]>(() => [
  {
    key: 'moments',
    i18nKey: 'topbar.moments',
    icon: 'i-tabler:windmill',
    supportsBadge: true,
  },
  {
    key: 'favorites',
    i18nKey: 'topbar.favorites',
    icon: 'i-mingcute:star-line',
    supportsBadge: false,
  },
  {
    key: 'history',
    i18nKey: 'topbar.history',
    icon: 'i-mingcute:time-line',
    supportsBadge: false,
  },
  {
    key: 'watchLater',
    i18nKey: 'topbar.watch_later',
    icon: 'i-mingcute:carplay-line',
    supportsBadge: true,
  },
  {
    key: 'creatorCenter',
    i18nKey: 'topbar.creative_center',
    icon: 'i-mingcute:bulb-line',
    supportsBadge: false,
  },
  {
    key: 'upload',
    i18nKey: 'topbar.upload',
    icon: 'i-mingcute:upload-line',
    supportsBadge: false,
  },
  {
    key: 'notifications',
    i18nKey: 'topbar.notifications',
    icon: 'i-tabler:bell',
    supportsBadge: true,
  },
  {
    key: 'topBarSwitcher',
    i18nKey: 'topbar.top_bar_switcher',
    icon: 'i-mingcute:refresh-2-line',
    supportsBadge: false,
  },
])

const badgeOptions = computed(() => [
  { label: t('settings.top_bar_icon_badges_opt.number'), value: 'number' },
  { label: t('settings.top_bar_icon_badges_opt.dot'), value: 'dot' },
  { label: t('settings.top_bar_icon_badges_opt.none'), value: 'none' },
])

const notificationBadgeOptions = computed(() => [
  { label: t('settings.top_bar_icon_badges_opt.number'), value: 'number' },
  { label: t('settings.top_bar_icon_badges_opt.number_with_likes'), value: 'numberWithLikes' },
  { label: t('settings.top_bar_icon_badges_opt.dot'), value: 'dot' },
  { label: t('settings.top_bar_icon_badges_opt.none'), value: 'none' },
])

const videoPageTopBarConfigOptions = computed(() => [
  { label: t('settings.video_page_top_bar_config_opt.alwaysShow'), value: VideoPageTopBarConfig.AlwaysShow },
  { label: t('settings.video_page_top_bar_config_opt.alwaysHide'), value: VideoPageTopBarConfig.AlwaysHide },
  { label: t('settings.video_page_top_bar_config_opt.showOnMouse'), value: VideoPageTopBarConfig.ShowOnMouse },
  { label: t('settings.video_page_top_bar_config_opt.showOnScroll'), value: VideoPageTopBarConfig.ShowOnScroll },
])

const topBarStyleOptions = computed<{ label: string, value: TopBarStyle }[]>(() => [
  { label: t('settings.top_bar_style_opt.default'), value: 'default' },
  { label: t('settings.top_bar_style_opt.frosted_glass'), value: 'frostedGlass' },
  { label: t('settings.top_bar_style_opt.transparent'), value: 'transparent' },
  { label: t('settings.top_bar_style_opt.exp_default'), value: 'expDefault' },
  { label: t('settings.top_bar_style_opt.exp_frosted_glass'), value: 'expFrostedGlass' },
  { label: t('settings.top_bar_style_opt.exp_transparent'), value: 'expTransparent' },
])

const topBarModeOptions = computed(() => [
  { label: t('settings.top_bar_mode_opt.original'), value: true },
  { label: t('settings.top_bar_mode_opt.bewly'), value: false },
])

function createDefaultComponentConfig(component: TopBarComponent) {
  return {
    key: component.key,
    visible: true,
    badgeType: (component.supportsBadge ? 'number' : 'none') as BadgeType,
  }
}

function getComponentConfig(componentKey: string) {
  return settings.value.topBarComponentsConfig?.find(component => component.key === componentKey)
}

function resetTopBarComponents() {
  settings.value.topBarComponentsConfig = topBarComponents.value.map(createDefaultComponentConfig)
  settings.value.showLikeNotificationReminder = false
}

function ensureTopBarComponentsConfig() {
  const currentConfig = settings.value.topBarComponentsConfig
  if (!Array.isArray(currentConfig)) {
    resetTopBarComponents()
    return
  }

  const missingConfig = topBarComponents.value
    .filter(component => !currentConfig.some(config => config.key === component.key))
    .map(createDefaultComponentConfig)

  if (missingConfig.length)
    settings.value.topBarComponentsConfig = [...currentConfig, ...missingConfig]
}

function setComponentVisibility(componentKey: string, visible: boolean) {
  const config = getComponentConfig(componentKey)
  if (config)
    config.visible = visible
}

function getComponentBadgeValue(componentKey: string): BadgeSelectValue {
  const badgeType = getComponentConfig(componentKey)?.badgeType ?? 'number'
  if (componentKey === 'notifications' && badgeType === 'number' && settings.value.showLikeNotificationReminder)
    return 'numberWithLikes'
  return badgeType
}

function getBadgeOptions(componentKey: string) {
  return componentKey === 'notifications' ? notificationBadgeOptions.value : badgeOptions.value
}

function setComponentBadgeType(componentKey: string, badgeValue: BadgeSelectValue) {
  const config = getComponentConfig(componentKey)
  if (!config)
    return

  if (componentKey === 'notifications') {
    settings.value.showLikeNotificationReminder = badgeValue === 'numberWithLikes'
    config.badgeType = badgeValue === 'numberWithLikes' ? 'number' : badgeValue
    return
  }

  config.badgeType = badgeValue as BadgeType
}

ensureTopBarComponentsConfig()
watch(topBarComponents, ensureTopBarComponentsConfig, { immediate: true })

interface ChannelOption {
  value: string
  label: string
  icon: string
  color?: string
}

const channelOptions = computed<ChannelOption[]>(() => {
  return allChannelConfigs.map((config) => {
    return {
      value: config.key,
      label: t(config.nameKey),
      icon: config.icon,
      color: config.color,
    }
  })
})

const channelOptionMap = computed(() => {
  const map = new Map<string, ChannelOption>()
  channelOptions.value.forEach(opt => map.set(opt.value, opt))
  return map
})

function sanitizePinnedChannels() {
  const raw = settings.value.topBarPinnedChannels || []
  const sanitized = raw.filter(key => channelOptionMap.value.has(key))
  if (sanitized.length !== raw.length)
    settings.value.topBarPinnedChannels = sanitized
}

onMounted(sanitizePinnedChannels)

const validPinnedItems = computed(() => {
  return (settings.value.topBarPinnedChannels || [])
    .map(key => channelOptionMap.value.get(key))
    .filter((item): item is ChannelOption => item !== undefined)
})

const draggablePinnedList = computed({
  get: () => validPinnedItems.value,
  set: (newItems: ChannelOption[]) => {
    settings.value.topBarPinnedChannels = newItems.map(item => item.value)
  },
})

function toggleChannel(value: string) {
  const current = settings.value.topBarPinnedChannels || []
  if (current.includes(value))
    settings.value.topBarPinnedChannels = current.filter(key => key !== value)
  else
    settings.value.topBarPinnedChannels = [...current, value]
}

function removePinnedChannel(value: string) {
  settings.value.topBarPinnedChannels = (settings.value.topBarPinnedChannels || []).filter(key => key !== value)
}

function resetPinnedChannels() {
  settings.value.topBarPinnedChannels = []
}

// Dialog Picker 控制状态
const showChannelPicker = ref(false)
</script>

<template>
  <div class="topbar-settings-groups" :data-settings-title="$t('settings.group_topbar')">
    <SettingsItemGroup
      :title="$t('settings.topbar_style_settings')"
      :desc="$t('settings.topbar_style_settings_desc')"
    >
      <SettingsItem
        :title="$t('settings.top_bar_style')"
        :desc="$t('settings.top_bar_style_desc')"
        right-width="auto"
      >
        <Select v-model="settings.topBarStyle" :options="topBarStyleOptions" w="220px" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.show_top_bar_theme_color_gradient')" right-width="auto">
        <Radio v-model="settings.showTopBarThemeColorGradient" />
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup
      :title="$t('settings.topbar_display_settings')"
      :desc="$t('settings.topbar_display_settings_desc')"
    >
      <SettingsItem :title="$t('settings.topbar_visibility')" :desc="$t('settings.topbar_visibility_desc')" right-width="auto">
        <Radio v-model="settings.enableTopBar" :label="settings.enableTopBar ? $t('settings.chk_box.show') : $t('settings.chk_box.hidden')" />
      </SettingsItem>
      <SettingsItem
        v-if="!settings.touchScreenOptimization"
        :title="$t('settings.open_top_bar_items_in_bewly')"
        :desc="$t('settings.open_top_bar_items_in_bewly_desc')"
        right-width="auto"
      >
        <Radio v-model="settings.openTopBarItemsInBewly" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.auto_hide_top_bar')" right-width="auto">
        <Radio v-model="settings.autoHideTopBar" />
      </SettingsItem>
      <SettingsItem
        :title="$t('settings.video_page_top_bar_config')"
        :desc="$t('settings.video_page_top_bar_config_desc')"
        right-width="auto"
      >
        <Select v-model="settings.videoPageTopBarConfig" :options="videoPageTopBarConfigOptions" w="160px" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.open_notifications_page_as_drawer')" right-width="auto">
        <Radio v-model="settings.openNotificationsPageAsDrawer" />
      </SettingsItem>
      <SettingsItem
        :title="$t('settings.filter_articles_in_moments')"
        :desc="$t('settings.filter_articles_in_moments_desc')"
        right-width="auto"
      >
        <Radio v-model="settings.filterArticlesInMoments" />
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup
      :title="$t('settings.topbar_logo_and_channels')"
      :desc="$t('settings.topbar_logo_and_channels_desc')"
    >
      <SettingsItem
        :title="$t('settings.top_bar_logo_style')"
        :desc="$t('settings.top_bar_logo_style_desc')"
        right-width="auto"
      >
        <div
          class="logo-style-picker bew-segment-control bew-segment-control--surface bew-segment-control--static"
          role="radiogroup"
          :aria-label="$t('settings.top_bar_logo_style')"
        >
          <button
            type="button"
            class="bew-segment-control__item bew-segment-control__item--icon"
            :data-active="settings.topBarLogoStyle === 'icon'"
            role="radio"
            :aria-checked="settings.topBarLogoStyle === 'icon'"
            :title="$t('settings.top_bar_logo_style_opt.icon')"
            @click="settings.topBarLogoStyle = 'icon'"
          >
            <span
              class="logo-style-picker__icon bew-segment-control__icon i-tabler:brand-bilibili"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            class="logo-style-picker__brand-option bew-segment-control__item"
            :data-active="settings.topBarLogoStyle === 'brand'"
            role="radio"
            :aria-checked="settings.topBarLogoStyle === 'brand'"
            :title="$t('settings.top_bar_logo_style_opt.brand')"
            @click="settings.topBarLogoStyle = 'brand'"
          >
            <span
              class="logo-style-picker__brand"
              :style="{
                maskImage: `url(${bilibiliBrandLogoUrl})`,
                WebkitMaskImage: `url(${bilibiliBrandLogoUrl})`,
              }"
              aria-hidden="true"
            />
          </button>
        </div>
      </SettingsItem>

      <SettingsItem
        v-if="settings.touchScreenOptimization"
        :title="$t('settings.show_home_button_in_touch_mode')"
        :desc="$t('settings.show_home_button_in_touch_mode_desc')"
        right-width="auto"
      >
        <Radio v-model="settings.showHomeButtonInTouchMode" />
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup
      :title="$t('settings.topbar_switchers')"
      :desc="$t('settings.topbar_switchers_desc')"
    >
      <SettingsItem
        :title="$t('settings.show_bewly_or_bili_page_switcher')"
        :desc="$t('settings.show_bewly_or_bili_page_switcher_desc')"
        right-width="auto"
      >
        <Radio v-model="settings.showBewlyOrBiliPageSwitcher" />
      </SettingsItem>
      <SettingsItem
        :title="$t('settings.show_bewly_or_bili_page_switcher_on_more_pages')"
        :desc="$t('settings.show_bewly_or_bili_page_switcher_on_more_pages_desc')"
        right-width="auto"
      >
        <Radio v-model="settings.showBewlyOrBiliPageSwitcherOnMorePages" />
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup :title="$t('settings.group_search_bar')">
      <SettingsItem
        :title="$t('settings.show_hot_search_in_top_bar')"
        :desc="$t('settings.show_hot_search_in_top_bar_desc')"
        right-width="auto"
      >
        <Radio v-model="settings.showHotSearchInTopBar" />
      </SettingsItem>
      <SettingsItem
        :title="$t('settings.show_search_recommendation')"
        :desc="$t('settings.show_search_recommendation_desc')"
        right-width="auto"
      >
        <Radio v-model="settings.showSearchRecommendation" />
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup
      :title="$t('settings.topbar_actions')"
      :desc="$t('settings.topbar_actions_desc')"
    >
      <SettingsItem
        v-for="component in topBarComponents"
        :key="component.key"
        :title="$t(component.i18nKey)"
        right-width="auto"
      >
        <template #title>
          <span class="topbar-component-title">
            <span class="topbar-component-icon" :class="component.icon" aria-hidden="true" />
            <span>{{ $t(component.i18nKey) }}</span>
          </span>
        </template>
        <div class="topbar-component-controls">
          <div v-if="component.key === 'topBarSwitcher'" class="topbar-component-control topbar-component-control--mode">
            <span class="topbar-component-control__label">{{ $t('settings.top_bar_mode') }}</span>
            <Select
              v-model="settings.useOriginalBilibiliTopBar"
              :options="topBarModeOptions"
              :disabled="!settings.enableTopBar"
              w="160px"
            />
          </div>
          <div v-else-if="component.supportsBadge" class="topbar-component-control topbar-component-control--badge">
            <span class="topbar-component-control__label">{{ $t('settings.badge_type') }}</span>
            <Select
              :model-value="getComponentBadgeValue(component.key)"
              :options="getBadgeOptions(component.key)"
              :disabled="!getComponentConfig(component.key)?.visible"
              w="160px"
              @update:model-value="setComponentBadgeType(component.key, $event as BadgeSelectValue)"
            />
          </div>
          <div class="topbar-component-control topbar-component-control--visibility">
            <Radio
              :model-value="getComponentConfig(component.key)?.visible ?? true"
              :label="$t('settings.visibility')"
              @update:model-value="setComponentVisibility(component.key, $event)"
            />
          </div>
        </div>
      </SettingsItem>

      <div class="topbar-section-actions">
        <Button size="small" type="secondary" @click="resetTopBarComponents">
          <template #left>
            <div i-mingcute:back-line />
          </template>
          {{ $t('common.operation.reset') }}
        </Button>
      </div>
    </SettingsItemGroup>

    <SettingsItemGroup :title="$t('settings.topbar_user_menu')">
      <SettingsItem
        :title="$t('settings.hide_lv6_last_login_location_in_top_bar_user_pop')"
        :desc="$t('settings.hide_lv6_last_login_location_in_top_bar_user_pop_desc')"
        right-width="auto"
      >
        <Radio v-model="settings.hideTopBarUserPanelLv6LastLoginLocation" />
      </SettingsItem>
    </SettingsItemGroup>

    <!-- 顶栏常驻分区（已选胶囊拖拽栏 + 弹窗选择库） -->
    <SettingsItemGroup
      :title="$t('settings.group_topbar_pinned_channels')"
      :desc="$t('settings.topbar_pinned_channels_desc')"
      icon="i-tabler:pin-filled"
    >
      <SettingsItem :title="$t('settings.topbar_pinned_channels_title')">
        <template #title>
          <div class="topbar-item-title-with-action">
            <span>{{ $t('settings.topbar_pinned_channels_title') }}</span>
            <span v-if="validPinnedItems.length" class="pinned-count-badge">
              {{ $t('settings.topbar_pinned_channels_count_hint', { count: validPinnedItems.length }) }}
            </span>
            <Button
              v-if="validPinnedItems.length"
              size="small"
              type="secondary"
              @click="resetPinnedChannels"
            >
              <template #left>
                <div i-mingcute:back-line />
              </template>
              {{ $t('common.operation.reset') }}
            </Button>
          </div>
        </template>

        <template #bottom>
          <div class="pinned-channels-panel">
            <draggable
              v-if="validPinnedItems.length"
              v-model="draggablePinnedList"
              item-key="value"
              :animation="200"
              class="pinned-chips"
              ghost-class="pinned-chip--ghost"
              handle=".pinned-chip__handle"
            >
              <template #item="{ element }">
                <div class="pinned-chip">
                  <span class="pinned-chip__handle" :title="$t('settings.topbar_pinned_channels_order_tip')">
                    <div i-mingcute:dots-vertical-line aria-hidden="true" />
                  </span>
                  <div v-if="element.icon.startsWith('#')" class="pinned-chip__icon">
                    <svg aria-hidden="true">
                      <use :xlink:href="element.icon" />
                    </svg>
                  </div>
                  <div v-else class="pinned-chip__icon">
                    <i
                      :class="element.icon"
                      :style="{ color: element.color ?? '' }"
                    />
                  </div>
                  <span class="pinned-chip__label">{{ element.label }}</span>
                  <button
                    type="button"
                    class="pinned-chip__remove"
                    :title="$t('settings.topbar_pinned_channels_remove')"
                    :aria-label="`${$t('settings.topbar_pinned_channels_remove')} ${element.label}`"
                    @click.stop="removePinnedChannel(element.value)"
                  >
                    <div i-mingcute:close-line aria-hidden="true" />
                  </button>
                </div>
              </template>
            </draggable>

            <div v-else class="pinned-empty-tip">
              <div i-mingcute:information-line text-base />
              <span>{{ $t('settings.topbar_pinned_channels_empty') }}</span>
            </div>

            <div class="pinned-actions-row">
              <Button
                size="small"
                type="secondary"
                class="pinned-add-button"
                @click="showChannelPicker = true"
              >
                <template #left>
                  <div i-mingcute:add-line />
                </template>
                {{ $t('settings.topbar_pinned_channels_add') }}
              </Button>
              <span class="pinned-bar-tip">
                {{ $t('settings.topbar_pinned_channels_order_tip') }}
              </span>
            </div>
          </div>
        </template>
      </SettingsItem>
    </SettingsItemGroup>

    <!-- 常驻分区选择弹窗 -->
    <Dialog
      v-if="showChannelPicker"
      :title="$t('settings.topbar_pinned_channels_dialog_title')"
      :desc="$t('settings.topbar_pinned_channels_dialog_desc')"
      width="680px"
      :show-footer="true"
      @close="showChannelPicker = false"
      @confirm="showChannelPicker = false"
    >
      <div class="picker-container">
        <div class="picker-grid">
          <button
            v-for="option in channelOptions"
            :key="option.value"
            type="button"
            class="picker-item"
            :class="{ 'is-selected': settings.topBarPinnedChannels?.includes(option.value) }"
            @click="toggleChannel(option.value)"
          >
            <div v-if="option.icon.startsWith('#')" class="picker-item__icon">
              <svg aria-hidden="true">
                <use :xlink:href="option.icon" />
              </svg>
            </div>
            <div v-else class="picker-item__icon">
              <i :class="option.icon" :style="{ color: option.color ?? '' }" />
            </div>
            <span class="picker-item__label">{{ option.label }}</span>
            <div
              v-if="settings.topBarPinnedChannels?.includes(option.value)"
              class="picker-item__check"
            >
              <div i-mingcute:check-fill aria-hidden="true" />
            </div>
          </button>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style lang="scss" scoped>
.topbar-settings-groups {
  min-width: 0;
}

.topbar-item-title-with-action {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--bew-space-3);
}

.topbar-component-title {
  display: inline-flex;
  align-items: center;
  gap: var(--bew-space-2);
}

.topbar-component-icon {
  flex: 0 0 auto;
  color: var(--bew-theme-color);
  font-size: var(--bew-icon-size-md);
}

.topbar-component-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--bew-space-4);
}

.topbar-component-control {
  display: flex;
  align-items: center;
  gap: var(--bew-space-2);
  min-height: var(--bew-control-height);
}

.topbar-component-control--visibility {
  margin-left: auto;
}

.topbar-component-control__label {
  color: var(--bew-text-2);
  font-size: var(--bew-font-size-control);
  line-height: var(--bew-line-height-control);
  white-space: nowrap;
}

.topbar-section-actions {
  display: flex;
  justify-content: flex-end;
  padding: var(--bew-space-3) 0 var(--bew-space-4);
}

.logo-style-picker {
  --bew-segment-item-active-bg: var(--bew-theme-color-20);
  --bew-segment-item-active-color: var(--bew-theme-color);
  --bew-segment-item-active-shadow: inset 0 0 0 1px var(--bew-theme-color-30);

  &__brand-option {
    padding-inline: var(--bew-space-3);
  }

  &__icon {
    width: var(--bew-icon-size-md);
    height: var(--bew-icon-size-md);
    font-size: var(--bew-icon-size-md);
  }

  &__brand {
    display: block;
    width: calc(var(--bew-control-icon-size) * 4);
    height: var(--bew-control-icon-size);
    flex: none;
    background: currentColor;
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: contain;
    -webkit-mask-position: center;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-size: contain;
  }
}

.pinned-count-badge {
  padding: var(--bew-space-1) var(--bew-space-2);
  border-radius: var(--bew-badge-radius);
  background: var(--bew-fill-2);
  color: var(--bew-text-2);
  font-size: var(--bew-font-size-caption);
  line-height: var(--bew-line-height-caption);
}

.pinned-channels-panel {
  display: flex;
  flex-direction: column;
  gap: var(--bew-space-3);
  width: 100%;
}

.pinned-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--bew-space-2);
}

.pinned-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--bew-space-2);
  min-height: var(--bew-control-height);
  padding: var(--bew-control-padding) var(--bew-control-item-padding-x);
  border: 1px solid color-mix(in oklab, var(--bew-theme-color-30), transparent 30%);
  border-radius: var(--bew-badge-radius);
  background: color-mix(in oklab, var(--bew-theme-color-20), transparent 35%);
  color: var(--bew-text-1);
  font-size: var(--bew-font-size-control);
  font-weight: var(--bew-font-weight-medium);
  line-height: var(--bew-line-height-control);
  user-select: none;
  cursor: default;
  transition:
    background-color var(--bew-duration-fast) var(--bew-ease-standard),
    border-color var(--bew-duration-fast) var(--bew-ease-standard),
    transform var(--bew-duration-fast) var(--bew-ease-standard);

  &:hover {
    background: color-mix(in oklab, var(--bew-theme-color-20), transparent 15%);
    border-color: var(--bew-theme-color);
  }

  &--ghost {
    opacity: 0.4;
    transform: scale(0.96);
  }

  &__handle {
    display: grid;
    place-items: center;
    cursor: grab;
    color: var(--bew-text-3);
    font-size: var(--bew-icon-size-sm);

    &:active {
      cursor: grabbing;
    }
  }

  &__icon {
    display: grid;
    place-items: center;
    width: var(--bew-control-icon-size);
    height: var(--bew-control-icon-size);
    flex: 0 0 auto;

    svg {
      width: var(--bew-control-icon-size);
      height: var(--bew-control-icon-size);
      fill: currentColor;
    }

    i {
      font-size: var(--bew-control-icon-size);
    }
  }

  &__label {
    white-space: nowrap;
  }

  &__remove {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding: 0;
    margin-left: var(--bew-space-0-5);
    margin-right: calc(-1 * var(--bew-space-1));
    border: none;
    border-radius: var(--bew-radius-full);
    background: transparent;
    color: var(--bew-text-3);
    cursor: pointer;
    font-size: var(--bew-icon-size-sm);
    transition:
      background-color var(--bew-duration-fast) var(--bew-ease-standard),
      color var(--bew-duration-fast) var(--bew-ease-standard);

    &:hover {
      background: color-mix(in oklab, var(--bew-theme-color), transparent 75%);
      color: var(--bew-theme-color);
    }
  }
}

.pinned-empty-tip {
  display: inline-flex;
  align-items: center;
  gap: var(--bew-space-1);
  padding: var(--bew-space-2) 0;
  color: var(--bew-text-3);
  font-size: var(--bew-font-size-control);
  line-height: var(--bew-line-height-control);
}

.pinned-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--bew-space-3);
  padding-top: var(--bew-space-1);
}

.pinned-bar-tip {
  color: var(--bew-text-3);
  font-size: var(--bew-font-size-control);
  line-height: var(--bew-line-height-control);
}

.picker-container {
  padding: var(--bew-space-2) 0;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: var(--bew-space-2);
  max-height: 420px;
  overflow-y: auto;
  padding: var(--bew-space-1);
  overscroll-behavior: contain;
}

.picker-item {
  display: inline-flex;
  align-items: center;
  gap: var(--bew-space-2);
  min-height: var(--bew-control-height);
  padding: var(--bew-control-padding) var(--bew-control-item-padding-x);
  border: 1px solid color-mix(in oklab, var(--bew-border-color), transparent 32%);
  border-radius: var(--bew-badge-radius);
  color: var(--bew-text-2);
  background: var(--bew-fill-1);
  font-size: var(--bew-font-size-control);
  font-weight: var(--bew-font-weight-medium);
  line-height: var(--bew-line-height-control);
  cursor: pointer;
  text-align: left;
  transition:
    color var(--bew-duration-fast) var(--bew-ease-standard),
    border-color var(--bew-duration-fast) var(--bew-ease-standard),
    background-color var(--bew-duration-fast) var(--bew-ease-standard);

  &:hover {
    color: var(--bew-text-1);
    background: var(--bew-fill-2);
  }

  &.is-selected {
    border-color: var(--bew-theme-color-30);
    color: var(--bew-theme-color);
    background: color-mix(in oklab, var(--bew-theme-color-20), transparent 28%);

    &:hover {
      border-color: var(--bew-theme-color);
      background: color-mix(in oklab, var(--bew-theme-color-20), transparent 10%);
    }
  }

  &__icon {
    display: grid;
    place-items: center;
    width: var(--bew-control-icon-size);
    height: var(--bew-control-icon-size);
    flex: 0 0 auto;

    svg {
      width: var(--bew-control-icon-size);
      height: var(--bew-control-icon-size);
      fill: currentColor;
    }

    i {
      font-size: var(--bew-control-icon-size);
    }
  }

  &__label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__check {
    display: grid;
    place-items: center;
    font-size: var(--bew-control-icon-size);
    color: var(--bew-theme-color);
  }
}

@media (max-width: 640px) {
  .topbar-component-controls {
    justify-content: flex-start;
  }

  .picker-grid {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  }
}
</style>
