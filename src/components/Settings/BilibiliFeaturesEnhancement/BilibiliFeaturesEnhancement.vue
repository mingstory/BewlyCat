<script setup lang="ts">
import type { Component } from 'vue'

import SettingsCategoryLayout from '../components/SettingsCategoryLayout.vue'
import type { BilibiliFeaturePageValue } from '../settingsPageRegistry'
import { BILIBILI_FEATURE_PAGES_GROUP } from '../settingsPageRegistry'

const storageKey = BILIBILI_FEATURE_PAGES_GROUP.storageKey
const legacyStorageKey = 'bewly-settings-playback-page'
const bilibiliPageValues = ['player', 'auto-play']
const legacyPage = sessionStorage.getItem(legacyStorageKey)

if (!sessionStorage.getItem(storageKey) && legacyPage && bilibiliPageValues.includes(legacyPage))
  sessionStorage.setItem(storageKey, legacyPage)

const pageUi: Record<BilibiliFeaturePageValue, { icon: string, iconActivated: string, component: Component }> = {
  'player': {
    icon: 'i-mingcute:play-circle-line',
    iconActivated: 'i-mingcute:play-circle-fill',
    component: defineAsyncComponent(() => import('./VideoPlayback/VideoPlayback.vue')),
  },
  'listen-video': {
    icon: 'i-mingcute:headphone-line',
    iconActivated: 'i-mingcute:headphone-fill',
    component: defineAsyncComponent(() => import('./ListenVideo/ListenVideo.vue')),
  },
  'volume-balance': {
    icon: 'i-mingcute:volume-line',
    iconActivated: 'i-mingcute:volume-fill',
    component: defineAsyncComponent(() => import('./VolumeBalance/VolumeBalance.vue')),
  },
  'ambilight': {
    icon: 'i-mingcute:light-line',
    iconActivated: 'i-mingcute:light-fill',
    component: defineAsyncComponent(() => import('./Ambilight/Ambilight.vue')),
  },
  'auto-play': {
    icon: 'i-mingcute:list-check-line',
    iconActivated: 'i-mingcute:list-check-fill',
    component: defineAsyncComponent(() => import('./AutoPlay/AutoPlay.vue')),
  },
  'comments': {
    icon: 'i-mingcute:comment-line',
    iconActivated: 'i-mingcute:comment-fill',
    component: defineAsyncComponent(() => import('./Comments/Comments.vue')),
  },
  'vip-features': {
    icon: 'i-mingcute:vip-1-line',
    iconActivated: 'i-mingcute:vip-1-fill',
    component: defineAsyncComponent(() => import('./VipFeatures/VipFeatures.vue')),
  },
  'compatibility': {
    icon: 'i-mingcute:polygon-line',
    iconActivated: 'i-mingcute:polygon-fill',
    component: defineAsyncComponent(() => import('../Compatibility/Compatibility.vue')),
  },
}

const pages = BILIBILI_FEATURE_PAGES_GROUP.pages.map(page => ({ ...page, ...pageUi[page.value] }))
</script>

<template>
  <SettingsCategoryLayout :pages="pages" :storage-key="storageKey" />
</template>
