<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import draggable from 'vuedraggable'

import Button from '~/components/Button.vue'
import Dialog from '~/components/Dialog.vue'
import SettingsItem from '~/components/Settings/components/SettingsItem.vue'
import SettingsItemGroup from '~/components/Settings/components/SettingsItemGroup.vue'
import type { TopBarChannelConfig } from '~/components/TopBar/constants/channels'
import { allChannelConfigs, normalizePinnedChannels } from '~/components/TopBar/constants/channels'
import { settings } from '~/logic'

const { t } = useI18n()

interface PinnedChannelOption {
  value: TopBarChannelConfig['key']
  label: string
  icon: TopBarChannelConfig['icon']
  color?: string
}

const channelOptions = computed<PinnedChannelOption[]>(() => {
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
  const map = new Map<string, PinnedChannelOption>()
  channelOptions.value.forEach(opt => map.set(opt.value, opt))
  return map
})

// 响应式数据清洗：确保无论通过何种途径变更，底层数据均保持幂等纯净
watch(
  () => settings.value.topBarPinnedChannels,
  (newVal) => {
    const normalized = normalizePinnedChannels(newVal)
    if (
      normalized.length !== newVal?.length
      || !normalized.every((v, i) => v === newVal[i])
    ) {
      settings.value.topBarPinnedChannels = normalized
    }
  },
  { deep: true, immediate: true },
)

const selectedKeySet = computed(() => new Set(settings.value.topBarPinnedChannels || []))

const validPinnedItems = computed<PinnedChannelOption[]>(() => {
  return (settings.value.topBarPinnedChannels || [])
    .map(key => channelOptionMap.value.get(key))
    .filter((item): item is PinnedChannelOption => item !== undefined)
})

const chipsContainerRef = ref<HTMLElement | null>(null)
const addButtonRef = ref<any>(null)

function toggleChannel(value: string) {
  const current = normalizePinnedChannels(settings.value.topBarPinnedChannels)
  if (current.includes(value))
    settings.value.topBarPinnedChannels = current.filter(key => key !== value)
  else
    settings.value.topBarPinnedChannels = [...current, value]
}

function removePinnedChannel(value: string, index?: number) {
  const current = normalizePinnedChannels(settings.value.topBarPinnedChannels)
  settings.value.topBarPinnedChannels = current.filter(key => key !== value)

  if (typeof index === 'number') {
    nextTick(() => {
      const remainingRemoves = chipsContainerRef.value?.querySelectorAll<HTMLElement>('.pinned-chip__remove')
      if (remainingRemoves && remainingRemoves.length > 0) {
        const focusIndex = Math.min(index, remainingRemoves.length - 1)
        remainingRemoves[focusIndex]?.focus()
      }
      else {
        const addBtnEl = addButtonRef.value?.$el ?? addButtonRef.value
        addBtnEl?.focus?.()
      }
    })
  }
}

function movePinnedChannel(index: number, direction: -1 | 1) {
  const current = [...(settings.value.topBarPinnedChannels || [])]
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= current.length)
    return
  const temp = current[index]
  current[index] = current[targetIndex]
  current[targetIndex] = temp
  settings.value.topBarPinnedChannels = current

  nextTick(() => {
    const handles = chipsContainerRef.value?.querySelectorAll<HTMLElement>('.pinned-chip__handle')
    handles?.[targetIndex]?.focus()
  })
}

function resetPinnedChannels() {
  settings.value.topBarPinnedChannels = []
}

// 弹窗选择器控制状态（即点即选模式，无需伪事务确认）
const showChannelPicker = ref(false)
</script>

<template>
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
          <div
            v-if="validPinnedItems.length"
            ref="chipsContainerRef"
            role="list"
            :aria-label="$t('settings.topbar_pinned_channels_title')"
          >
            <draggable
              v-model="settings.topBarPinnedChannels"
              :item-key="(key: string) => key"
              :animation="200"
              class="pinned-chips"
              ghost-class="pinned-chip--ghost"
              handle=".pinned-chip__handle"
            >
              <template #item="{ element: key, index }">
                <div
                  v-if="channelOptionMap.get(key)"
                  role="listitem"
                  class="pinned-chip"
                >
                  <button
                    type="button"
                    class="pinned-chip__handle"
                    :title="$t('settings.topbar_pinned_channels_order_tip')"
                    :aria-label="`${channelOptionMap.get(key)!.label} - ${$t('settings.topbar_pinned_channels_order_tip')}`"
                    @keydown.left.prevent="movePinnedChannel(index, -1)"
                    @keydown.up.prevent="movePinnedChannel(index, -1)"
                    @keydown.right.prevent="movePinnedChannel(index, 1)"
                    @keydown.down.prevent="movePinnedChannel(index, 1)"
                  >
                    <div i-mingcute:dots-vertical-line aria-hidden="true" />
                  </button>
                  <div v-if="channelOptionMap.get(key)!.icon.startsWith('#')" class="pinned-chip__icon">
                    <svg aria-hidden="true">
                      <use :xlink:href="channelOptionMap.get(key)!.icon" />
                    </svg>
                  </div>
                  <div v-else class="pinned-chip__icon">
                    <i
                      :class="channelOptionMap.get(key)!.icon"
                      :style="{ color: channelOptionMap.get(key)!.color ?? '' }"
                    />
                  </div>
                  <span class="pinned-chip__label">{{ channelOptionMap.get(key)!.label }}</span>
                  <button
                    type="button"
                    class="pinned-chip__remove"
                    :title="$t('settings.topbar_pinned_channels_remove')"
                    :aria-label="`${$t('settings.topbar_pinned_channels_remove')} ${channelOptionMap.get(key)!.label}`"
                    @click.stop="removePinnedChannel(key, index)"
                  >
                    <div i-mingcute:close-line aria-hidden="true" />
                  </button>
                </div>
              </template>
            </draggable>
          </div>

          <div v-else class="pinned-empty-tip">
            <div
              i-mingcute:information-line
              class="pinned-empty-tip__icon"
              aria-hidden="true"
            />
            <span>{{ $t('settings.topbar_pinned_channels_empty') }}</span>
          </div>

          <div class="pinned-actions-row">
            <Button
              ref="addButtonRef"
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

    <!-- 常驻分区选择弹窗（挂载至 Bewly Body，适配毛玻璃与视口自适应） -->
    <Dialog
      v-if="showChannelPicker"
      :title="$t('settings.topbar_pinned_channels_dialog_title')"
      :desc="$t('settings.topbar_pinned_channels_dialog_desc')"
      width="680px"
      max-width="min(680px, 90vw)"
      content-max-height="min(460px, 60vh)"
      append-to-bewly-body
      transition-name="moments-dialog"
      :show-footer="false"
      @close="showChannelPicker = false"
    >
      <div class="picker-container">
        <div class="picker-grid">
          <button
            v-for="option in channelOptions"
            :key="option.value"
            type="button"
            class="picker-item"
            :class="{ 'is-selected': selectedKeySet.has(option.value) }"
            :aria-pressed="selectedKeySet.has(option.value)"
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
              v-if="selectedKeySet.has(option.value)"
              class="picker-item__check"
            >
              <div i-mingcute:check-fill aria-hidden="true" />
            </div>
          </button>
        </div>
      </div>
    </Dialog>
  </SettingsItemGroup>
</template>

<style lang="scss" scoped>
.topbar-item-title-with-action {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--bew-space-3);
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
    padding: 0;
    margin: 0;
    border: none;
    background: transparent;
    cursor: grab;
    color: var(--bew-text-3);
    font-size: var(--bew-icon-size-sm);
    border-radius: var(--bew-radius-xs, 2px);
    transition: color var(--bew-duration-fast) var(--bew-ease-standard);

    &:active {
      cursor: grabbing;
    }

    &:hover {
      color: var(--bew-text-1);
    }

    &:focus-visible {
      color: var(--bew-theme-color);
      outline: 2px solid var(--bew-theme-color);
      outline-offset: 1px;
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

  &__icon {
    font-size: var(--bew-icon-size-md);
  }
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
  padding: var(--bew-space-1);
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
  .picker-grid {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  }
}
</style>
