<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'

import Button from '~/components/Button.vue' // Assuming Button component exists
import Radio from '~/components/Radio.vue'
import { originalSettings, settings } from '~/logic'
import type {
  BaseShortcutSetting,
  ShortcutsSettings,
} from '~/logic/storage'
import { formatShortcutKey, getShortcutKeyFromEvent, isSameShortcutKey } from '~/utils/shortcutKeys'
import { getEffectiveShortcutSetting, setupShortcutHandlers } from '~/utils/shortcuts'

import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'
import SettingsSectionHeading from '../components/SettingsSectionHeading.vue'
import type { ConfigurableShortcutDefinition, ConfigurableShortcutId } from '../definitions/shortcuts'
import { configurableShortcutsGroups } from '../definitions/shortcuts'
import ShortcutSection from './ShortcutSection.vue'

const { t } = useI18n()
const toast = useToast()

// --- 类型定义 ---
interface OfficialShortcut {
  key: string
  descriptionKey: string
}

// --- 快捷键数据 ---
const officialShortcuts: OfficialShortcut[] = [
  { key: 'Space', descriptionKey: 'settings.shortcuts.official.play_pause' },
  { key: '→', descriptionKey: 'settings.shortcuts.official.forward' },
  { key: '←', descriptionKey: 'settings.shortcuts.official.backward' },
  { key: '↑', descriptionKey: 'settings.shortcuts.official.volume_up' },
  { key: '↓', descriptionKey: 'settings.shortcuts.official.volume_down' },
  { key: 'Esc', descriptionKey: 'settings.shortcuts.official.exit_fullscreen' },
  { key: 'F', descriptionKey: 'settings.shortcuts.official.fullscreen' },
  { key: 'D', descriptionKey: 'settings.shortcuts.official.danmu_toggle' },
  { key: 'M', descriptionKey: 'settings.shortcuts.official.mute' },
  { key: 'Q', descriptionKey: 'settings.shortcuts.official.like' },
  { key: 'W', descriptionKey: 'settings.shortcuts.official.coin' },
  { key: 'E', descriptionKey: 'settings.shortcuts.official.favorite' },
  { key: '[', descriptionKey: 'settings.shortcuts.official.prev_video' },
  { key: ']', descriptionKey: 'settings.shortcuts.official.next_video' },
  { key: 'Shift + 1', descriptionKey: 'settings.shortcuts.official.speed_1' },
  { key: 'Shift + 2', descriptionKey: 'settings.shortcuts.official.speed_2' },
  { key: 'Enter', descriptionKey: 'settings.shortcuts.official.input_danmu' },
]

// --- Reactive State ---
const editingShortcutId = ref<ConfigurableShortcutId | null>(null)
const currentKeyCombo = ref('')

const vFocusShortcutEditor = {
  mounted(element: HTMLElement) {
    element.focus({ preventScroll: true })
  },
}

// --- Helper Functions ---
function getShortcutSetting(id: ConfigurableShortcutId): BaseShortcutSetting | undefined {
  return getEffectiveShortcutSetting(String(id))
}

function getDefaultShortcutSetting(id: ConfigurableShortcutId): BaseShortcutSetting | undefined {
  return originalSettings.shortcuts?.[id]
}

// --- Conflict Detection ---
// Only extension shortcuts block each other. Official Bilibili shortcuts are
// intentionally allowed so extension actions can override them at runtime.
function checkShortcutConflict(key: string, currentId: ConfigurableShortcutId): { hasConflict: boolean, conflictInfo: { id: string, name: string } | null } {
  if (!settings.value.shortcuts)
    return { hasConflict: false, conflictInfo: null }

  for (const group of configurableShortcutsGroups) {
    for (const shortcut of group.shortcuts) {
      if (shortcut.id === currentId)
        continue

      const shortcutSetting = getShortcutSetting(shortcut.id)
      if (shortcutSetting && typeof shortcutSetting === 'object' && shortcutSetting.key) {
        if (isSameShortcutKey(shortcutSetting.key, key)) {
          return {
            hasConflict: true,
            conflictInfo: {
              id: String(shortcut.id), // Convert to string to fix type issue
              name: t(shortcut.nameKey),
            },
          }
        }
      }
    }
  }

  return { hasConflict: false, conflictInfo: null }
}

// --- Edit Functions ---
function startEditShortcut(id: ConfigurableShortcutId) {
  editingShortcutId.value = id
  currentKeyCombo.value = '' // 重置当前按键组合
}

function saveShortcutKey(id: ConfigurableShortcutId, newKey: string) {
  // 确保settings.value.shortcuts存在
  if (!settings.value.shortcuts) {
    settings.value.shortcuts = {}
  }

  // 如果快捷键设置不存在，创建一个新的
  if (!settings.value.shortcuts[id]) {
    settings.value.shortcuts[id] = { key: newKey, enabled: true }
  }
  else {
    // 更新现有设置
    (settings.value.shortcuts[id] as BaseShortcutSetting).key = newKey
  }

  // Exit editing mode
  editingShortcutId.value = null
  currentKeyCombo.value = '' // 重置当前按键组合

  // Re-register shortcuts to ensure the new shortcut is immediately available
  try {
    setupShortcutHandlers()
  }
  catch (error) {
    console.error('Failed to re-register shortcuts:', error)
  }
}

function cancelEdit() {
  editingShortcutId.value = null
  currentKeyCombo.value = '' // 重置当前按键组合
}

function handleKeyDown(event: KeyboardEvent, id: ConfigurableShortcutId) {
  if (editingShortcutId.value !== id)
    return

  event.preventDefault()
  event.stopPropagation()

  // 单独的修饰键返回 null，保留已录到的组合
  const keyCombo = getShortcutKeyFromEvent(event)
  if (keyCombo)
    currentKeyCombo.value = keyCombo
}

function handleKeyUp(event: KeyboardEvent, id: ConfigurableShortcutId) {
  if (editingShortcutId.value !== id)
    return

  // 如果按下的是 Escape 键，取消编辑
  if (event.key === 'Escape') {
    cancelEdit()
    return
  }

  // 如果按下的是 Backspace 键，且没有其他按键，取消编辑
  if (event.key === 'Backspace' && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
    cancelEdit()
    return
  }

  // 如果所有按键都已释放，保存快捷键
  if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey && currentKeyCombo.value) {
    const keyCombo = currentKeyCombo.value
    const conflictResult = checkShortcutConflict(keyCombo, id)

    if (conflictResult.hasConflict && conflictResult.conflictInfo) {
      toast.warning(t('settings.shortcuts.conflict', { name: conflictResult.conflictInfo.name }))
      cancelEdit()
    }
    else {
      saveShortcutKey(id, keyCombo)
    }
  }
}

// --- Reset and Toggle Functions ---
function resetToDefault(shortcutDef: ConfigurableShortcutDefinition) {
  const defaultSetting = getDefaultShortcutSetting(shortcutDef.id)
  if (!defaultSetting)
    return

  const conflictResult = checkShortcutConflict(defaultSetting.key, shortcutDef.id)
  if (conflictResult.hasConflict && conflictResult.conflictInfo) {
    toast.warning(t('settings.shortcuts.conflict', { name: conflictResult.conflictInfo.name }))
    return
  }

  cancelEdit()
  if (!settings.value.shortcuts)
    settings.value.shortcuts = {}
  settings.value.shortcuts[shortcutDef.id] = { ...defaultSetting }
  setupShortcutHandlers()
}

// 只保存最近一次重置前的配置，撤销时整体恢复。
const shortcutResetSnapshot = ref<ShortcutsSettings>()

function resetAllShortcuts() {
  cancelEdit()
  shortcutResetSnapshot.value = JSON.parse(JSON.stringify(settings.value.shortcuts ?? {}))
  if (!settings.value.shortcuts)
    settings.value.shortcuts = {}

  configurableShortcutsGroups.forEach((group) => {
    group.shortcuts.forEach((shortcutDef) => {
      const defaultSetting = getDefaultShortcutSetting(shortcutDef.id)
      if (defaultSetting)
        settings.value.shortcuts[shortcutDef.id] = JSON.parse(JSON.stringify(defaultSetting))
    })
  })

  setupShortcutHandlers()
}

function undoResetAllShortcuts() {
  if (!shortcutResetSnapshot.value)
    return
  cancelEdit()
  settings.value.shortcuts = shortcutResetSnapshot.value
  shortcutResetSnapshot.value = undefined
  setupShortcutHandlers()
}
</script>

<template>
  <div>
    <SettingsSectionHeading
      :title="t('settings.shortcuts.title')"
      :desc="t('settings.category_shortcuts_desc')"
      icon="i-mingcute:keyboard-fill"
    />

    <!-- General Keyboard Toggle -->
    <SettingsItemGroup>
      <SettingsItem :title="t('settings.shortcuts.enable_all_shortcuts_toggle')" right-width="auto">
        <template #desc>
          <div v-html="t('settings.shortcuts.enable_all_shortcuts_toggle_desc')" />
        </template>
        <Radio v-model="settings.keyboard" @update:model-value="setupShortcutHandlers" />
      </SettingsItem>
      <SettingsItem :title="t('settings.shortcuts.reset_all_ext_shortcuts')" right-width="auto">
        <template #desc>
          <span v-if="shortcutResetSnapshot" role="status">{{ t('settings.shortcuts.reset_undo_hint') }}</span>
        </template>
        <div class="shortcut-reset-actions">
          <Button @click="resetAllShortcuts">
            {{ t('settings.shortcuts.reset_all_button') }}
          </Button>
          <Button v-if="shortcutResetSnapshot" @click="undoResetAllShortcuts">
            {{ t('settings.shortcuts.undo_reset') }}
          </Button>
        </div>
      </SettingsItem>
    </SettingsItemGroup>

    <!-- Configurable Extension Shortcuts -->
    <template v-for="group in configurableShortcutsGroups" :key="group.titleKey">
      <ShortcutSection
        :title="t(group.titleKey)"
        default-open
      >
        <template v-for="shortcutDef in group.shortcuts" :key="shortcutDef.id">
          <SettingsItem :title="t(shortcutDef.nameKey)" :desc="t(shortcutDef.descriptionKey)" right-width="auto">
            <div class="shortcut-item-config">
              <!-- Key Configuration with Enabled Toggle -->
              <div class="shortcut-config-row">
                <!-- Shortcut Key Display/Edit -->
                <div
                  v-if="editingShortcutId === shortcutDef.id"
                  v-focus-shortcut-editor
                  class="shortcut-edit-box border rounded px-3 py-1 text-center text-sm"
                  tabindex="0"
                  @keydown="handleKeyDown($event, shortcutDef.id)"
                  @keyup="handleKeyUp($event, shortcutDef.id)"
                  @blur="cancelEdit"
                >
                  {{ currentKeyCombo ? formatShortcutKey(currentKeyCombo) : t('settings.shortcuts.press_keys') }}
                </div>
                <div v-else class="shortcut-key border rounded px-3 py-1 text-sm">
                  {{ formatShortcutKey(getShortcutSetting(shortcutDef.id)?.key || shortcutDef.defaultKey) || t('settings.shortcuts.not_set') }}
                </div>

                <!-- Action Buttons -->
                <div class="shortcut-actions flex gap-1">
                  <button
                    v-if="editingShortcutId !== shortcutDef.id"
                    class="edit-btn p-1 rounded hover:bg-$bew-fill-2"
                    :title="t('settings.shortcuts.item.edit_key')"
                    @click="startEditShortcut(shortcutDef.id)"
                  >
                    <i i-mingcute:edit-line />
                  </button>
                  <button
                    v-if="editingShortcutId === shortcutDef.id"
                    class="cancel-btn p-1 rounded hover:bg-$bew-fill-2"
                    :title="t('settings.shortcuts.item.cancel_edit')"
                    @click="cancelEdit"
                  >
                    <i i-mingcute:close-line />
                  </button>
                  <button
                    class="reset-btn p-1 rounded hover:bg-$bew-fill-2"
                    :title="t('settings.shortcuts.item.reset_default')"
                    @click="resetToDefault(shortcutDef)"
                  >
                    <i i-mingcute:refresh-1-line />
                  </button>
                </div>
                <Radio
                  :model-value="getShortcutSetting(shortcutDef.id)?.enabled ?? false"
                  @update:model-value="(value) => {
                    if (!settings.shortcuts[shortcutDef.id]) {
                      settings.shortcuts[shortcutDef.id] = { key: shortcutDef.defaultKey, enabled: value }
                    }
                    else {
                      (settings.shortcuts[shortcutDef.id] ??= { key: shortcutDef.defaultKey, enabled: false }).enabled = value
                    }
                  }"
                />
              </div>
            </div>
          </SettingsItem>
        </template>
      </ShortcutSection>
    </template>

    <!-- Official Bilibili Shortcuts (Read-only) -->
    <ShortcutSection :title="t('settings.shortcuts.group.official_bilibili')">
      <SettingsItem
        v-for="shortcut in officialShortcuts"
        :key="shortcut.key"
        :title="shortcut.key"
        :desc="t(shortcut.descriptionKey)"
        right-width="auto"
      >
        <div class="shortcut-key-readonly border rounded px-3 py-1 text-sm">
          {{ shortcut.key }}
        </div>
      </SettingsItem>
    </ShortcutSection>
  </div>
</template>

<style lang="scss" scoped>
.shortcut-reset-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--bew-space-2);
}

.shortcut-key-readonly,
.shortcut-key {
  background-color: var(--bew-elevated-solid);
  min-width: 60px; /* Ensure a minimum width for better alignment */
  text-align: center;
}

.shortcut-config-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.shortcut-key,
.shortcut-edit-box {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-edit-box {
  min-width: 120px;
}

.shortcut-edit-box {
  background-color: var(--bew-elevated-solid);
  cursor: text;
  user-select: none;
  outline: none;
  &:focus {
    outline: 2px solid var(--bew-theme-color);
  }
  &:focus-visible {
    outline: 2px solid var(--bew-theme-color);
  }
}

// Ensure buttons in shortcut actions are vertically aligned
.shortcut-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.shortcut-actions,
.shortcut-config-row :deep(label) {
  flex-shrink: 0;
}

// Add some spacing to SettingsItem content for better readability
:deep(.settings-item .content) {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
</style>
