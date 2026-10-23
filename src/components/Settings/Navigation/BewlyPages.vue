<script setup lang="ts">
import type { Component } from 'vue'

import SettingsCategoryLayout from '../components/SettingsCategoryLayout.vue'
import type { BewlyPageValue } from '../settingsPageRegistry'
import { BEWLY_PAGES_GROUP } from '../settingsPageRegistry'

const storageKey = BEWLY_PAGES_GROUP.storageKey
const legacyStorageKey = 'bewly-settings-navigation-page'
const pageValues: string[] = BEWLY_PAGES_GROUP.pages.map(page => page.value)
const legacyPage = sessionStorage.getItem(legacyStorageKey)

if (!sessionStorage.getItem(storageKey) && legacyPage && pageValues.includes(legacyPage))
  sessionStorage.setItem(storageKey, legacyPage)
if (!pageValues.includes(sessionStorage.getItem(storageKey) ?? ''))
  sessionStorage.setItem(storageKey, pageValues[0])

const pageUi: Record<BewlyPageValue, { icon: string, iconActivated: string, component: Component }> = {
  home: {
    icon: 'i-mingcute:home-5-line',
    iconActivated: 'i-mingcute:home-5-fill',
    component: defineAsyncComponent(() => import('../PluginComponentsAndPages/Home/Home.vue')),
  },
  moments: {
    icon: 'i-mingcute:moment-line',
    iconActivated: 'i-mingcute:moment-fill',
    component: defineAsyncComponent(() => import('../PluginComponentsAndPages/Moments/Moments.vue')),
  },
  favorites: {
    icon: 'i-mingcute:star-line',
    iconActivated: 'i-mingcute:star-fill',
    component: defineAsyncComponent(() => import('../PluginComponentsAndPages/Favorites/Favorites.vue')),
  },
  search: {
    icon: 'i-mingcute:search-2-line',
    iconActivated: 'i-mingcute:search-2-fill',
    component: defineAsyncComponent(() => import('../PluginComponentsAndPages/SearchPage/SearchPage.vue')),
  },
}

const pages = BEWLY_PAGES_GROUP.pages.map(page => ({ ...page, ...pageUi[page.value] }))
</script>

<template>
  <SettingsCategoryLayout :pages="pages" :storage-key="storageKey" />
</template>
