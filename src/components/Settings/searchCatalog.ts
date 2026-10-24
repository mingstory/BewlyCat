import { ambilightFpsOptions, ambilightPresetOptions } from './definitions/ambilight'
import type { MomentTagOption } from './definitions/moments'
import { originalComponentOptions, pluginComponentOptions, pluginFilterOptions } from './definitions/moments'
import { configurableShortcutsGroups } from './definitions/shortcuts'
import { topBarComponentDefinitions } from './definitions/topbar'
import type { SettingsPageGroup } from './settingsPageRegistry'
import { BEWLY_COMPONENT_PAGES_GROUP, BEWLY_PAGES_GROUP, BILIBILI_FEATURE_PAGES_GROUP } from './settingsPageRegistry'
import { MenuType } from './types'

export interface SettingsSearchStorageValue {
  key: string
  value: string
}

const configurableShortcutDefinitions = configurableShortcutsGroups.flatMap(group => group.shortcuts)
const configurableShortcutTitleKeys = configurableShortcutDefinitions.map(shortcut => shortcut.nameKey)
const configurableShortcutKeywordKeys = Object.fromEntries(
  configurableShortcutDefinitions.map(shortcut => [shortcut.nameKey, [shortcut.descriptionKey]]),
)
const ambilightOptionKeywordKeys = [...ambilightPresetOptions, ...ambilightFpsOptions]
  .map(option => option.labelKey)
const topBarSearchComponents = topBarComponentDefinitions
  .filter(component => component.key !== 'topBarSwitcher')
  .sort((a, b) => a.searchOrder - b.searchOrder)
const topBarComponentKeywordKeys = Object.fromEntries(
  topBarSearchComponents.map(component => [
    component.i18nKey,
    component.supportsBadge
      ? ['settings.visibility', 'settings.badge_type', 'settings.top_bar_icon_badges_opt']
      : ['settings.visibility'],
  ]),
)

function getMomentOptionTitleKeys(options: MomentTagOption[]) {
  return options.filter(option => option.searchable !== false).map(option => option.labelKey)
}

export interface SettingsSearchEntry {
  titleKey?: string
  title?: string
  menu: MenuType
  targetTitleKey?: string
  targetTitle?: string
  fallbackTargetKey?: string
  secondaryTitleKey?: string
  storageValues?: SettingsSearchStorageValue[]
  keywordKeys?: string[]
  keywords?: string[]
}

interface SearchRoute {
  menu: MenuType
  secondaryPage?: string
  secondaryTitleKey?: string
  storageKey?: string
}

function createPageRoute<Value extends string>(
  menu: MenuType,
  group: SettingsPageGroup<Value>,
  pageValue: Value,
): SearchRoute {
  const page = group.pages.find(page => page.value === pageValue)
  if (!page)
    throw new Error(`Unknown settings page: ${pageValue}`)

  return {
    menu,
    secondaryPage: page.value,
    secondaryTitleKey: page.titleKey,
    storageKey: group.storageKey,
  }
}

// 分类菜单只用于结果定位，不应作为独立搜索项参与匹配。
const nonSettingTitleKeyPatterns = [
  /^settings\.menu_/,
  /^settings\.group_/,
  /^settings\.plugin\./,
  /^settings\.bilibili_features\./,
  /^settings\.shortcuts\.group\./,
  /^settings\.maintenance\.(title|backup_title|reset_title)$/,
  /^settings\.topbar_(display_settings|logo_and_channels|switchers|actions|user_menu)$/,
]

export function isSettingTitleKey(titleKey: string) {
  return !nonSettingTitleKeyPatterns.some(pattern => pattern.test(titleKey))
}

interface CreateEntriesOptions extends Omit<SettingsSearchEntry, 'titleKey' | 'menu' | 'secondaryTitleKey' | 'storageValues' | 'fallbackTargetKey'> {
  storageValues?: SettingsSearchStorageValue[]
  keywordKeysByTitleKey?: Record<string, string[]>
  fallbackTargetKeysByTitleKey?: Record<string, string>
}

function createEntries(
  route: SearchRoute,
  titleKeys: string[],
  options: CreateEntriesOptions = {},
): SettingsSearchEntry[] {
  const { fallbackTargetKeysByTitleKey, keywordKeysByTitleKey, ...entryOptions } = options
  const routeStorageValues = route.secondaryPage && route.storageKey
    ? [{ key: route.storageKey, value: route.secondaryPage }]
    : []

  return titleKeys.filter(isSettingTitleKey).map((titleKey) => {
    const keywordKeys = [
      ...(entryOptions.keywordKeys ?? []),
      ...(keywordKeysByTitleKey?.[titleKey] ?? []),
    ]
    const fallbackTargetKey = fallbackTargetKeysByTitleKey?.[titleKey]

    return {
      titleKey,
      menu: route.menu,
      secondaryTitleKey: route.secondaryTitleKey,
      ...entryOptions,
      ...(keywordKeys.length ? { keywordKeys } : {}),
      ...(fallbackTargetKey ? { fallbackTargetKey } : {}),
      storageValues: [...routeStorageValues, ...(entryOptions.storageValues ?? [])],
    }
  })
}

const generalRoute: SearchRoute = { menu: MenuType.General }
const homeRoute = createPageRoute(MenuType.BewlyPages, BEWLY_PAGES_GROUP, 'home')
const momentsRoute = createPageRoute(MenuType.BewlyPages, BEWLY_PAGES_GROUP, 'moments')
const videoCardRoute = createPageRoute(MenuType.BewlyComponents, BEWLY_COMPONENT_PAGES_GROUP, 'video-card')
const topBarRoute = createPageRoute(MenuType.BewlyComponents, BEWLY_COMPONENT_PAGES_GROUP, 'topbar')
const dockRoute = createPageRoute(MenuType.BewlyComponents, BEWLY_COMPONENT_PAGES_GROUP, 'dock')
const favoritesRoute = createPageRoute(MenuType.BewlyPages, BEWLY_PAGES_GROUP, 'favorites')
const searchPageRoute = createPageRoute(MenuType.BewlyPages, BEWLY_PAGES_GROUP, 'search')
const playerRoute = createPageRoute(MenuType.Bilibili, BILIBILI_FEATURE_PAGES_GROUP, 'player')
const listenVideoRoute = createPageRoute(MenuType.Bilibili, BILIBILI_FEATURE_PAGES_GROUP, 'listen-video')
const volumeBalanceRoute = createPageRoute(MenuType.Bilibili, BILIBILI_FEATURE_PAGES_GROUP, 'volume-balance')
const ambilightRoute = createPageRoute(MenuType.Bilibili, BILIBILI_FEATURE_PAGES_GROUP, 'ambilight')
const autoPlayRoute = createPageRoute(MenuType.Bilibili, BILIBILI_FEATURE_PAGES_GROUP, 'auto-play')
const appearanceRoute: SearchRoute = { menu: MenuType.Appearance }
const commentsRoute = createPageRoute(MenuType.Bilibili, BILIBILI_FEATURE_PAGES_GROUP, 'comments')
const vipFeaturesRoute = createPageRoute(MenuType.Bilibili, BILIBILI_FEATURE_PAGES_GROUP, 'vip-features')
const compatibilityRoute = createPageRoute(MenuType.Bilibili, BILIBILI_FEATURE_PAGES_GROUP, 'compatibility')
const shortcutsRoute: SearchRoute = { menu: MenuType.Shortcuts }
const aboutRoute: SearchRoute = { menu: MenuType.About }

const wallpaperTitleKeys = [
  'settings.group_wallpaper',
  'settings.wallpaper_mode',
  'settings.wallpaper_cache_time',
  'settings.choose_ur_wallpaper',
  'settings.image_url',
  'settings.enable_wallpaper_masking',
  'settings.wallpaper_mask_opacity',
  'settings.wallpaper_blur_intensity',
]

const linkOpeningOptionKeys = [
  'settings.link_opening_behavior_opt.current_tab',
  'settings.link_opening_behavior_opt.current_tab_if_not_homepage',
  'settings.link_opening_behavior_opt.current_tab_if_homepage',
  'settings.link_opening_behavior_opt.background',
  'settings.link_opening_behavior_opt.new_tab',
]
const videoCardLinkOpeningOptionKeys = [
  'settings.link_opening_behavior_opt.current_tab',
  'settings.link_opening_behavior_opt.drawer',
  'settings.link_opening_behavior_opt.dialog',
  'settings.link_opening_behavior_opt.background',
  'settings.link_opening_behavior_opt.new_tab',
]
const playerModeOptionKeys = [
  'settings.video_player_mode.default',
  'settings.video_player_mode.web_fullscreen',
  'settings.video_player_mode.widescreen',
  'settings.video_player_mode.bewly_widescreen',
]
const autoPlayModeOptionKeys = [
  'settings.auto_play_mode_auto_play',
  'settings.auto_play_mode_auto_play_with_recommend',
  'settings.auto_play_mode_pause_at_end',
  'settings.auto_play_mode_loop',
]
const topBarGlobalTitleKeys = [
  'settings.group_topbar',
  'settings.topbar_display_settings',
  'settings.topbar_style_settings',
  'settings.topbar_visibility',
  'settings.topbar_visibility_desc',
  'settings.other_page_top_bar_config',
  'settings.video_page_top_bar_config',
  'settings.top_bar_style',
  'settings.top_bar_style_desc',
  'settings.top_bar_style_opt.default',
  'settings.top_bar_style_opt.frosted_glass',
  'settings.top_bar_style_opt.transparent',
  'settings.top_bar_style_opt.exp_default',
  'settings.top_bar_style_opt.exp_frosted_glass',
  'settings.top_bar_style_opt.exp_transparent',
  'settings.show_top_bar_theme_color_gradient',
  'settings.open_top_bar_items_in_bewly',
  'settings.open_notifications_page_as_drawer',
  'settings.notification_badge_types',
  'settings.notification_badge_types_desc',
  'settings.notification_followed_private_messages',
  'settings.notification_unfollowed_private_messages',
  'settings.filter_articles_in_moments',
]

export const settingsSearchEntries: SettingsSearchEntry[] = [
  ...createEntries(generalRoute, [
    'settings.menu_general',
    'settings.group_language',
    'settings.select_language',
    'settings.group_interaction_layout',
    'settings.touch_screen_optimization',
    'settings.enable_grid_layout_switcher',
    'settings.enable_horizontal_scrolling',
    'settings.group_drawer_behavior',
    'settings.close_drawer_without_pressing_esc_again',
  ]),
  ...createEntries(generalRoute, [
    'settings.group_link_opening_behavior',
    'settings.top_bar_link_opening_behavior',
    'settings.search_bar_link_opening_behavior',
  ], { keywordKeys: linkOpeningOptionKeys }),
  ...createEntries(generalRoute, [
    'settings.video_card_link_opening_behavior',
  ], { keywordKeys: videoCardLinkOpeningOptionKeys }),
  ...createEntries(homeRoute, [
    'settings.menu_bewly_pages',
  ], { targetTitleKey: 'settings.plugin.home' }),
  ...createEntries(videoCardRoute, [
    'settings.menu_bewly_components',
  ], { targetTitleKey: 'settings.plugin.video_card' }),

  ...createEntries(homeRoute, ['settings.following_sort'], {
    keywordKeys: ['settings.following_sort_updated', 'settings.following_sort_group'],
  }),
  ...createEntries(homeRoute, [
    'settings.plugin.home',
    'settings.group_recommendation_mode',
    'settings.show_recommendation_mode_switcher',
    'settings.recommendation_mode_switcher_options',
    'settings.group_immersive_mode',
    'settings.show_immersive_mode_entry',
    'settings.immersive_wheel_switch',
    'settings.immersive_keyboard_switch',
    'settings.immersive_auto_play',
    'settings.immersive_auto_next',
    'settings.immersive_preload_next',
    'settings.remember_no_cookie_recommendation_state',
    'settings.authorize_app',
    'settings.auto_switch_recommendation_mode',
    'settings.preserve_for_you_state',
    'settings.group_recommendation_filters',
    'settings.show_recommendation_filter_risk_warning',
    'settings.disable_filters_for_followed_users',
    'settings.filter_out_vertical_videos',
    'settings.filter_by_view_count',
    'settings.filter_by_like_count',
    'settings.filter_by_duration',
    'settings.filter_by_publish_time',
    'settings.filter_by_title',
    'settings.filter_by_user',
    'settings.group_following',
    'settings.use_following_new_layout',
    'settings.following_tab_show_livestreaming_videos',
    'settings.following_filter_charging_videos',
    'settings.following_filter_dynamic_videos',
    'settings.group_home_tabs',
    'settings.home_tabs_adjustment',
    'settings.home_tabs_position',
    'settings.fixed_home_tabs_on_home_page',
    'settings.group_search_page_mode',
    'settings.use_search_page_mode',
    'settings.settings_shared_with_the_search_page',
    'settings.search_page_mode_wallpaper_fixed',
  ], {
    fallbackTargetKeysByTitleKey: {
      'settings.settings_shared_with_the_search_page': 'settings.use_search_page_mode',
      'settings.search_page_mode_wallpaper_fixed': 'settings.use_search_page_mode',
    },
  }),
  ...createEntries(homeRoute, [
    'settings.recommendation_mode',
  ], {
    keywordKeys: [
      'settings.recommendation_mode_web_no_cookie',
      'settings.recommendation_mode_app_single',
      'settings.recommendation_mode_app_double',
    ],
    // 保留旧名称「无 Cookie」的检索
    keywords: ['Web', 'App', 'Cookie'],
  }),
  ...createEntries(momentsRoute, [
    'settings.plugin.moments',
    'settings.group_original_moments_page',
    ...getMomentOptionTitleKeys(originalComponentOptions),
    'settings.group_new_moments_page',
    'settings.moments_visible_components',
    'settings.moments_filtered_types',
    ...getMomentOptionTitleKeys(pluginComponentOptions),
    'settings.moments_tabs_position',
    'settings.moments_start_from_last_seen',
    'settings.moments_enable_live_preview',
    'settings.moments_enable_video_preview',
    'settings.enable_video_ctrl_bar_on_video_card',
    'settings.video_preview_swipe_seek',
    'settings.hover_video_card_delayed',
    'settings.only_cover_video_preview',
    'settings.moments_card_open_mode',
    'settings.moments_video_card_open_mode',
    'settings.group_moments_filters',
    ...getMomentOptionTitleKeys(pluginFilterOptions),
    'settings.moments_keyword_filter',
    'settings.original_moments_use_bewly_filters',
    'settings.group_moments_wanted_users',
    'settings.moments_enable_wanted_filter',
    'settings.moments_wanted_users',
    'settings.group_moments_pinned_users',
    'settings.moments_pinned_users',
    'settings.moments_grid_columns',
  ], {
    keywordKeysByTitleKey: {
      'settings.moments_filter_charge_dynamic': [
        'settings.moments_hide_charge_exclusive',
        'settings.moments_hide_charge_exclusive_desc',
      ],
      'settings.moments_tabs_position': [
        'common.position.left',
        'common.position.center',
      ],
    },
    fallbackTargetKeysByTitleKey: {
      'settings.enable_video_ctrl_bar_on_video_card': 'settings.moments_enable_video_preview',
      'settings.video_preview_swipe_seek': 'settings.moments_enable_video_preview',
      'settings.hover_video_card_delayed': 'settings.moments_enable_video_preview',
      'settings.only_cover_video_preview': 'settings.moments_enable_video_preview',
    },
  }),
  ...createEntries(momentsRoute, [
    'settings.moments_filter_up_recommendation',
  ], { targetTitleKey: 'settings.moments_filter_up_recommendation_short' }),
  ...createEntries(favoritesRoute, [
    'settings.plugin.favorites',
    'settings.group_favorite_organizer',
    'settings.favorite_organizer.sync_after_triple',
    'settings.favorite_organizer.batch_title',
    'settings.favorite_organizer.rules_title',
  ]),
  ...createEntries(videoCardRoute, [
    'settings.plugin.video_card',
    'settings.group_video_card_grid',
    'settings.auto_switch_list_layout',
    'settings.auto_switch_list_layout_breakpoint',
    'settings.video_card_cover_ratio',
    'settings.video_card_cover_ratio_one_column',
    'settings.video_card_cover_ratio_two_columns',
    'settings.grid_breakpoints',
    'settings.group_video_card_display',
    'settings.video_card_layout',
    'settings.enable_video_preview',
    'settings.enable_video_ctrl_bar_on_video_card',
    'settings.video_preview_swipe_seek',
    'settings.video_preview_swipe_seek_desc',
    'settings.resume_from_video_preview',
    'settings.resume_from_video_preview_desc',
    'settings.hover_video_card_delayed',
    'settings.only_cover_video_preview',
    'settings.group_video_card_content',
    'settings.show_video_card_author_avatar',
    'settings.show_video_card_author_name',
    'settings.show_video_card_category',
    'settings.show_video_card_video_tag',
    'settings.show_video_card_recommend_tag',
    'settings.show_video_card_publish_time',
    'settings.show_video_card_view_count',
    'settings.show_video_card_danmaku_count',
    'settings.show_video_card_like_count',
    'settings.show_video_card_duration',
    'settings.show_video_watched_badge',
    'settings.show_video_card_watch_later',
    'settings.show_video_card_more_button',
    'settings.group_video_card_context_menu',
    'settings.video_card_context_menu_follow_user',
    'video_card.operation.not_interested',
    'video_card.operation.not_interested_uploader',
    'video_card.operation.open_in_new_tab',
    'video_card.operation.open_in_background',
    'video_card.operation.open_in_new_window',
    'video_card.operation.open_in_current_tab',
    'video_card.operation.open_in_drawer',
    'video_card.operation.open_in_dialog',
    'video_card.operation.favorite',
    'video_card.operation.copy_video_link',
    'video_card.operation.copy_clean_video_link',
    'video_card.operation.copy_bv_number',
    'video_card.operation.copy_av_number',
    'video_card.operation.view_the_original_cover',
    'video_card.operation.block_user',
    'settings.video_card_shadow_curve',
    'settings.video_card_shadow_height',
  ], {
    keywordKeysByTitleKey: {
      'settings.grid_breakpoints': ['settings.grid_columns_unit'],
      'settings.video_card_layout': ['settings.video_card_shadow_reset'],
    },
    fallbackTargetKeysByTitleKey: {
      'settings.video_card_shadow_curve': 'settings.video_card_layout',
      'settings.video_card_shadow_height': 'settings.video_card_layout',
      'settings.enable_video_ctrl_bar_on_video_card': 'settings.enable_video_preview',
      'settings.video_preview_swipe_seek': 'settings.enable_video_preview',
      'settings.video_preview_swipe_seek_desc': 'settings.enable_video_preview',
      'settings.resume_from_video_preview': 'settings.enable_video_preview',
      'settings.resume_from_video_preview_desc': 'settings.enable_video_preview',
      'settings.hover_video_card_delayed': 'settings.enable_video_preview',
      'settings.only_cover_video_preview': 'settings.enable_video_preview',
    },
  }),
  ...createEntries(videoCardRoute, [
    'settings.video_card_title_font_size',
    'settings.video_card_author_font_size',
    'settings.video_card_meta_font_size',
  ], { keywordKeys: ['settings.font_size_option'] }),

  ...createEntries(topBarRoute, [
    'settings.plugin.topbar',
    ...topBarGlobalTitleKeys,
  ], {
    keywordKeysByTitleKey: {
      'settings.notification_badge_types': [
        'topbar.noti_dropdown.replys',
        'topbar.noti_dropdown.mentions',
        'topbar.noti_dropdown.likes',
        'topbar.noti_dropdown.messages',
      ],
    },
    fallbackTargetKeysByTitleKey: {
      'settings.open_top_bar_items_in_bewly': 'settings.topbar_visibility',
    },
  }),
  ...createEntries(topBarRoute, [
    'settings.topbar_logo_and_channels',
    'settings.top_bar_logo_style',
    'settings.show_home_button_in_touch_mode',
  ], {
    fallbackTargetKeysByTitleKey: {
      'settings.show_home_button_in_touch_mode': 'settings.top_bar_logo_style',
    },
  }),
  ...createEntries(topBarRoute, [
    'settings.group_topbar_pinned_channels',
    'settings.topbar_pinned_channels_title',
  ], { keywordKeys: ['settings.pinned_manager.add', 'settings.pinned_manager.search', 'settings.pinned_manager.undo', 'settings.pinned_manager.categories', 'settings.topbar_pinned_channels_hint'] }),
  ...createEntries(topBarRoute, [
    'settings.topbar_switchers',
    'settings.show_bewly_or_bili_page_switcher',
    'settings.show_bewly_or_bili_page_switcher_on_more_pages',
  ]),
  ...createEntries(topBarRoute, [
    'settings.group_search_bar',
    'settings.show_hot_search_in_top_bar',
    'settings.show_search_recommendation',
  ]),
  ...createEntries(topBarRoute, [
    'settings.topbar_actions',
  ], {
    keywordKeys: ['settings.visibility', 'settings.badge_type', 'settings.top_bar_icon_badges_opt'],
  }),
  ...createEntries(topBarRoute, [
    'settings.topbar_user_menu',
    'settings.hide_lv6_last_login_location_in_top_bar_user_pop',
  ]),
  ...createEntries(topBarRoute, topBarSearchComponents.map(component => component.i18nKey), {
    keywordKeysByTitleKey: topBarComponentKeywordKeys,
  }),
  ...createEntries(topBarRoute, [
    'topbar.top_bar_switcher',
  ], {
    keywordKeys: [
      'settings.visibility',
      'settings.top_bar_mode',
      'settings.top_bar_mode_opt',
      'settings.use_original_bilibili_topbar',
      'settings.use_original_bilibili_topbar_desc',
    ],
  }),

  ...createEntries(dockRoute, [
    'settings.plugin.dock_and_sidebar',
    'settings.group_dock',
    'settings.show_layout_edit_button',
    'settings.always_use_dock',
    'settings.auto_hide_dock',
    'settings.always_show_dock_actions_when_auto_hide',
    'settings.half_hide_dock',
    'settings.dock_content_adjustment',
    'settings.disable_dock_glowing_effect',
    'settings.disable_light_dark_mode_switcher',
    'settings.disable_back_to_top_button_on_dock',
    'settings.back_to_top_and_refresh_buttons_are_separated',
    'settings.enable_undo_refresh_button',
    'settings.group_sidebar',
    'settings.auto_hide_sidebar',
  ], {
    keywordKeysByTitleKey: {
      'settings.dock_content_adjustment': [
        'settings.dock_item_open_in_new_tab',
        'settings.dock_item_use_original_bili_web_page',
      ],
    },
  }),
  ...createEntries(dockRoute, [
    'settings.dock_position',
  ], { keywordKeys: ['common.position.left', 'common.position.right', 'common.position.bottom'] }),
  ...createEntries(dockRoute, [
    'settings.sidebar_position',
  ], { keywordKeys: ['common.position.left', 'common.position.right'] }),

  ...createEntries(searchPageRoute, [
    'settings.plugin.search',
    'settings.group_logo',
    'settings.logo_color',
    'settings.enable_logo_glowing_effect',
    'settings.logo_visibility',
    'settings.group_search_bar',
    'settings.show_search_recommendation',
    'settings.enable_search_history',
    'settings.bg_darkens_when_the_search_bar_is_focused',
    'settings.bg_blurs_when_the_search_bar_is_focused',
    'settings.choose_search_bar_focused_character',
    'settings.group_hot_search',
    'settings.show_hot_search_in_search_page',
    'settings.group_search_results',
    'settings.use_plugin_search_results_page',
    'settings.depersonalize_search_results',
    'settings.show_search_identity_switcher',
    'settings.search_results_pagination_mode',
    'settings.individually_set_search_page_wallpaper',
    ...wallpaperTitleKeys,
  ]),

  ...createEntries(volumeBalanceRoute, [
    'settings.local_loudness.title',
    'settings.local_loudness.enable',
    'settings.local_loudness.target',
    'settings.local_loudness.strength',
    'settings.local_loudness.show_button',
  ]),
  ...createEntries(ambilightRoute, [
    'settings.ambilight.title',
    'settings.ambilight.enable',
    'settings.ambilight.enable_fullscreen',
    'settings.ambilight.preset',
    'settings.ambilight.strength',
    'settings.ambilight.spread',
    'settings.ambilight.smoothing',
    'settings.ambilight.blur',
    'settings.ambilight.saturation',
    'settings.ambilight.fps',
  ], {
    keywordKeysByTitleKey: {
      'settings.ambilight.title': ambilightOptionKeywordKeys,
    },
    fallbackTargetKeysByTitleKey: {
      'settings.ambilight.preset': 'settings.ambilight.title',
      'settings.ambilight.fps': 'settings.ambilight.title',
    },
  }),
  ...createEntries(playerRoute, [
    'settings.bilibili_features.video_playback',
    'settings.group_player_display_mode',
    'settings.video_player_scroll',
    'settings.auto_exit_fullscreen_on_end',
    'settings.video_player_mode.enable_overrides',
    'settings.video_player_mode.overrides',
    'settings.group_bewly_widescreen',
    'settings.show_bewly_widescreen_button',
    'settings.video_player_mode.bewly_widescreen_sidebar_position',
    'settings.video_player_mode.bewly_widescreen_auto_collapse_sidebar',
    'settings.video_player_mode.bewly_widescreen_video_alignment',
    'settings.video_player_mode.enable_bewly_widescreen_sidebar_resize',
    'settings.group_player_components',
    'settings.skip_concise_danmaku',
    'settings.group_playback_memory',
    'settings.custom_playback_rate',
    'settings.playback_rate_step',
    'settings.remember_playback_rate',
    'settings.remember_video_aspect_ratio',
    'settings.group_video_page_actions',
    'settings.enlarge_favorite_dialog',
    'settings.external_watch_later_button',
    'settings.show_vertical_video_zoom_button',
    'settings.show_video_screenshot_button',
  ]),
  ...createEntries(listenVideoRoute, [
    'settings.enable_listen_video',
    'settings.show_listen_video_button',
  ]),
  ...createEntries(listenVideoRoute, [
    'settings.listen_video_cover_shape',
  ], {
    keywordKeys: [
      'settings.listen_video_cover_shape_circle',
      'settings.listen_video_cover_shape_square',
      'settings.listen_video_cover_shape_rectangle',
    ],
  }),
  ...createEntries(listenVideoRoute, [
    'settings.listen_video_glow',
  ], {
    keywordKeys: [
      'settings.listen_video_glow_static',
      'settings.listen_video_glow_breathe',
    ],
  }),
  ...createEntries(listenVideoRoute, [
    'settings.listen_video_glow_color',
  ], {
    keywordKeys: [
      'settings.listen_video_glow_color_theme',
      'settings.listen_video_glow_color_cover',
    ],
  }),
  ...createEntries(listenVideoRoute, [
    'settings.listen_video_background',
  ], {
    keywordKeys: [
      'settings.listen_video_background_solid',
      'settings.listen_video_background_blur',
    ],
  }),
  ...createEntries(playerRoute, [
    'settings.video_player_scroll_mode.title',
  ], {
    keywordKeys: [
      'settings.video_player_scroll_mode.sending_bar',
      'settings.video_player_scroll_mode.player_center',
    ],
  }),
  ...createEntries(playerRoute, [
    'settings.video_default_player_mode',
  ], { keywordKeys: playerModeOptionKeys }),
  ...createEntries(playerRoute, [
    'settings.video_player_mode.context_multipart',
    'settings.video_player_mode.context_collection',
    'settings.video_player_mode.context_bangumi',
    'settings.video_player_mode.context_watch_later',
    'settings.video_player_mode.context_playlist',
    'settings.video_player_mode.context_moments_dialog',
  ], { keywordKeys: [...playerModeOptionKeys, 'settings.video_player_mode.inherit'] }),
  ...createEntries(playerRoute, [
    'settings.video_danmaku_default_state',
    'settings.video_caption_default_state',
  ], { keywordKeys: ['settings.video_default_state_opt'] }),

  ...createEntries(autoPlayRoute, [
    'settings.bilibili_features.auto_play',
    'settings.group_random_play',
    'settings.enable_random_play',
    'settings.enable_custom_play_order_overrides',
    'settings.custom_play_order_overrides',
    'settings.group_random_play_settings',
    'settings.min_videos_for_random',
    'settings.group_playback_end_behavior',
    'settings.auto_remove_watch_later_on_end',
    'settings.use_bilibili_default_auto_play',
    'settings.group_video_type_end_behavior',
    'settings.group_playlist_start_behavior',
  ]),
  ...createEntries(autoPlayRoute, [
    'settings.auto_play_multipart',
    'settings.auto_play_collection',
    'settings.auto_play_watch_later',
    'settings.auto_play_playlist',
  ], {
    keywordKeys: [
      ...autoPlayModeOptionKeys,
      'settings.custom_play_order_inherit',
      'settings.random_play_order_sequential',
      'settings.random_play_order_reverse',
      'settings.random_play_order_random',
    ],
  }),
  ...createEntries(autoPlayRoute, [
    'settings.auto_play_recommend',
  ], { keywordKeys: autoPlayModeOptionKeys }),
  ...createEntries(autoPlayRoute, [
    'settings.default_custom_play_order',
  ], {
    keywordKeys: [
      'settings.random_play_order_sequential',
      'settings.random_play_order_reverse',
      'settings.random_play_order_random',
    ],
  }),
  ...createEntries(autoPlayRoute, [
    'settings.random_play_mode',
  ], {
    keywordKeys: ['settings.random_play_mode_manual', 'settings.random_play_mode_auto'],
  }),
  ...createEntries(autoPlayRoute, [
    'settings.collected_season_play_all_mode',
  ], {
    keywordKeys: [
      'settings.collected_season_play_all_mode_beginning',
      'settings.collected_season_play_all_mode_latest',
      'settings.collected_season_play_all_mode_last_watched',
    ],
  }),

  ...createEntries(appearanceRoute, [
    'settings.menu_appearance',
    'settings.group_visual_effects',
    'settings.sidebar_cover_blur',
    'settings.enable_frosted_glass',
    'settings.frosted_glass_blur_intensity',
    'settings.enable_liquid_segment_indicator',
    'settings.disable_shadow',
    'settings.group_page_style',
    'settings.adapt_to_other_page_styles',
    'settings.disable_background',
    'settings.group_color',
    'settings.theme',
    'settings.theme_schedule',
    'settings.video_page_dark_mode',
    'settings.theme_color',
    'settings.dark_mode_base_color',
    'settings.gradient_theme_color_background',
    'settings.follow_bilibili_evolved_color',
    'settings.group_fonts',
    'settings.customize_font',
    'settings.remove_the_indent_from_chinese_punctuation',
    'settings.cjk_latin_autospace',
    'settings.override_danmaku_font',
    'settings.customize_css',
    ...wallpaperTitleKeys,
  ]),

  ...createEntries(playerRoute, [
    'settings.menu_bilibili',
  ], { targetTitleKey: 'settings.bilibili_features.video_playback' }),
  ...createEntries(commentsRoute, [
    'settings.bilibili_features.comments',
    'settings.group_comments',
    'settings.show_ip_location',
    'settings.show_sex',
    'settings.show_comment_host_tag',
    'settings.enable_comment_reply_tree_display',
    'settings.enable_comment_reply_tree_container',
    'settings.comment_reply_tree_container_height',
    'settings.comment_reply_tree_mode.title',
    'settings.comment_reply_tree_mode.line_collapse_main',
    'settings.comment_reply_tree_mode.line_keep_main',
    'settings.comment_reply_tree_mode.indent_only',
    'settings.adjust_comment_image_height',
    'settings.hide_comment_image_scrollbar',
  ], {
    keywordKeysByTitleKey: {
      'settings.enable_comment_reply_tree_display': [
        'settings.comment_reply_pagination_mode.title',
        'settings.comment_reply_pagination_mode.desc',
        'settings.comment_reply_pagination_mode.load_more',
        'settings.comment_reply_pagination_mode.pagination',
      ],
    },
    fallbackTargetKeysByTitleKey: {
      'settings.enable_comment_reply_tree_container': 'settings.enable_comment_reply_tree_display',
      'settings.comment_reply_tree_container_height': 'settings.enable_comment_reply_tree_display',
      'settings.comment_reply_tree_mode.title': 'settings.enable_comment_reply_tree_display',
    },
  }),
  ...createEntries(vipFeaturesRoute, [
    'settings.bilibili_features.vip_features',
    'settings.show_bcoin_receive_reminder',
    'settings.auto_receive_bcoin_coupon',
    'settings.auto_receive_vip_exp',
  ]),
  ...createEntries(compatibilityRoute, [
    'settings.menu_compatibility',
    'settings.group_common',
    'settings.use_original_bilibili_homepage',
    'settings.prevent_mobile_redirect',
    'settings.group_ad_blocking',
    'settings.block_ads',
    'settings.block_top_search_page_ads',
    'settings.clean_url_argument',
    'settings.group_clean_share_link',
    'settings.enable_clean_share_link',
    'settings.clean_share_link_include_title',
    'settings.clean_share_link_remove_tracking_params',
  ]),

  ...createEntries(shortcutsRoute, [
    'settings.shortcuts.title',
    'settings.shortcuts.enable_all_shortcuts_toggle',
  ]),
  ...createEntries(shortcutsRoute, configurableShortcutTitleKeys, {
    keywordKeysByTitleKey: configurableShortcutKeywordKeys,
  }),
  ...createEntries(shortcutsRoute, [
    'settings.shortcuts.reset_all_ext_shortcuts',
    'settings.shortcuts.group.official_bilibili',
  ]),

  ...createEntries(aboutRoute, [
    'settings.menu_about',
    'settings.group_settings_sync',
    'settings.enable_settings_sync',
    'settings.group_version_reminder',
    'settings.enable_version_reminder',
    'settings.maintenance.title',
    'settings.maintenance.backup_title',
    'settings.import_settings',
    'settings.export_settings',
    'settings.maintenance.reset_title',
    'settings.reset_settings',
    'settings.open_source_license',
    'settings.third_party_licenses',
  ]),
]
