<script setup lang="ts">
import type { Component } from 'vue'

import SettingsCategoryLayout from '../components/SettingsCategoryLayout.vue'
import type { BewlyComponentPageValue } from '../settingsPageRegistry'
import { BEWLY_COMPONENT_PAGES_GROUP } from '../settingsPageRegistry'

const storageKey = BEWLY_COMPONENT_PAGES_GROUP.storageKey
const legacyStorageKey = 'bewly-settings-navigation-page'
const pageValues: string[] = BEWLY_COMPONENT_PAGES_GROUP.pages.map(page => page.value)
const legacyPage = sessionStorage.getItem(legacyStorageKey)

if (!sessionStorage.getItem(storageKey) && legacyPage && pageValues.includes(legacyPage))
  sessionStorage.setItem(storageKey, legacyPage)

const pageUi: Record<BewlyComponentPageValue, { icon: string, iconActivated: string, component: Component }> = {
  'video-card': {
    icon: 'i-mingcute:video-camera-line',
    iconActivated: 'i-mingcute:video-camera-fill',
    component: defineAsyncComponent(() => import('../PluginComponentsAndPages/VideoCard/VideoCard.vue')),
  },
  'topbar': {
    icon: 'i-mingcute:layout-top-line',
    iconActivated: 'i-mingcute:layout-top-fill',
    component: defineAsyncComponent(() => import('../PluginComponentsAndPages/TopBar/TopBar.vue')),
  },
  'dock': {
    icon: 'i-mingcute:navigation-line',
    iconActivated: 'i-mingcute:navigation-fill',
    component: defineAsyncComponent(() => import('../PluginComponentsAndPages/DockAndSidebar/DockAndSidebar.vue')),
  },
}

const pages = BEWLY_COMPONENT_PAGES_GROUP.pages.map(page => ({ ...page, ...pageUi[page.value] }))
</script>

<template>
  <SettingsCategoryLayout :pages="pages" :storage-key="storageKey" />
</template>
