export interface SettingsPageMetadata<Value extends string = string> {
  value: Value
  titleKey: string
  descriptionKey: string
}

export interface SettingsPageGroup<Value extends string = string> {
  storageKey: string
  pages: readonly SettingsPageMetadata<Value>[]
}

export const BEWLY_PAGES_GROUP = {
  storageKey: 'bewly-settings-bewly-pages-page',
  pages: [
    { value: 'home', titleKey: 'settings.plugin.home', descriptionKey: 'settings.category_browsing_home_desc' },
    { value: 'moments', titleKey: 'settings.plugin.moments', descriptionKey: 'settings.category_navigation_moments_desc' },
    { value: 'favorites', titleKey: 'settings.plugin.favorites', descriptionKey: 'settings.category_browsing_favorites_desc' },
    { value: 'search', titleKey: 'settings.plugin.search', descriptionKey: 'settings.category_navigation_search_desc' },
  ],
} as const satisfies SettingsPageGroup

export const BEWLY_COMPONENT_PAGES_GROUP = {
  storageKey: 'bewly-settings-bewly-components-page',
  pages: [
    { value: 'video-card', titleKey: 'settings.plugin.video_card', descriptionKey: 'settings.category_browsing_video_card_desc' },
    { value: 'topbar', titleKey: 'settings.plugin.topbar', descriptionKey: 'settings.category_navigation_topbar_desc' },
    { value: 'dock', titleKey: 'settings.plugin.dock_and_sidebar', descriptionKey: 'settings.category_navigation_dock_desc' },
  ],
} as const satisfies SettingsPageGroup

export const BILIBILI_FEATURE_PAGES_GROUP = {
  storageKey: 'bewly-settings-bilibili-page',
  pages: [
    { value: 'player', titleKey: 'settings.bilibili_features.video_playback', descriptionKey: 'settings.category_playback_player_desc' },
    { value: 'listen-video', titleKey: 'settings.bilibili_features.listen_video', descriptionKey: 'settings.category_bilibili_listen_video_desc' },
    { value: 'volume-balance', titleKey: 'settings.bilibili_features.volume_balance', descriptionKey: 'settings.category_bilibili_volume_balance_desc' },
    { value: 'ambilight', titleKey: 'settings.bilibili_features.ambilight', descriptionKey: 'settings.category_bilibili_ambilight_desc' },
    { value: 'auto-play', titleKey: 'settings.bilibili_features.auto_play', descriptionKey: 'settings.category_playback_autoplay_desc' },
    { value: 'comments', titleKey: 'settings.bilibili_features.comments', descriptionKey: 'settings.category_bilibili_comments_desc' },
    { value: 'vip-features', titleKey: 'settings.bilibili_features.vip_features', descriptionKey: 'settings.category_bilibili_vip_desc' },
    { value: 'compatibility', titleKey: 'settings.menu_compatibility', descriptionKey: 'settings.category_advanced_compatibility_desc' },
  ],
} as const satisfies SettingsPageGroup

export type BewlyPageValue = (typeof BEWLY_PAGES_GROUP.pages)[number]['value']
export type BewlyComponentPageValue = (typeof BEWLY_COMPONENT_PAGES_GROUP.pages)[number]['value']
export type BilibiliFeaturePageValue = (typeof BILIBILI_FEATURE_PAGES_GROUP.pages)[number]['value']

export const SETTINGS_PAGE_STORAGE_KEYS = {
  bewlyPages: BEWLY_PAGES_GROUP.storageKey,
  bewlyComponents: BEWLY_COMPONENT_PAGES_GROUP.storageKey,
  bilibili: BILIBILI_FEATURE_PAGES_GROUP.storageKey,
} as const
