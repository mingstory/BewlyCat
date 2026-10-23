export type MomentToggleSetting
  = | 'originalMomentsShowUserCard'
    | 'originalMomentsShowLiveList'
    | 'originalMomentsShowCommunityCenter'
    | 'originalMomentsShowHotSearch'
    | 'originalMomentsShowUpList'
    | 'momentsSidebarShowUserCard'
    | 'momentsSidebarShowPublish'
    | 'momentsSidebarShowLive'
    | 'momentsSidebarShowHotSearch'
    | 'momentsShowUpList'
    | 'momentsFilterUpRecommendation'
    | 'momentsHideChargeExclusive'
    | 'momentsHideVideoReservation'
    | 'momentsHideLiveReservation'
    | 'momentsHideLiveDynamics'
    | 'momentsHideVideoDynamics'
    | 'momentsHideDrawDynamics'
    | 'momentsHideUgcSeasonDynamics'
    | 'momentsHideForwardDynamics'
    | 'momentsHidePgcDynamics'
    | 'momentsHideArticleDynamics'

export interface MomentTagOption {
  setting: MomentToggleSetting
  labelKey: string
  icon: string
  searchable?: boolean
}

export const originalComponentOptions: MomentTagOption[] = [
  { setting: 'originalMomentsShowUserCard', labelKey: 'settings.original_moments_show_user_card', icon: 'i-tabler-user-square-rounded' },
  { setting: 'originalMomentsShowLiveList', labelKey: 'settings.original_moments_show_live_list', icon: 'i-tabler-live-photo' },
  { setting: 'originalMomentsShowCommunityCenter', labelKey: 'settings.original_moments_show_community_center', icon: 'i-tabler-layout-dashboard' },
  { setting: 'originalMomentsShowHotSearch', labelKey: 'settings.original_moments_show_hot_search', icon: 'i-tabler-flame' },
  { setting: 'originalMomentsShowUpList', labelKey: 'settings.original_moments_show_up_list', icon: 'i-tabler-users' },
]

export const pluginComponentOptions: MomentTagOption[] = [
  { setting: 'momentsSidebarShowUserCard', labelKey: 'settings.moments_show_user_card', icon: 'i-tabler-user-square-rounded' },
  { setting: 'momentsSidebarShowPublish', labelKey: 'settings.moments_show_publish', icon: 'i-tabler-edit' },
  { setting: 'momentsSidebarShowLive', labelKey: 'settings.moments_show_live', icon: 'i-tabler-live-photo' },
  { setting: 'momentsSidebarShowHotSearch', labelKey: 'settings.moments_show_hot_search', icon: 'i-tabler-flame' },
  { setting: 'momentsShowUpList', labelKey: 'settings.moments_show_up_list', icon: 'i-tabler-users' },
]

export const pluginFilterOptions: MomentTagOption[] = [
  { setting: 'momentsHideVideoDynamics', labelKey: 'settings.moments_filter_video_dynamic', icon: 'i-tabler-player-play' },
  { setting: 'momentsHideDrawDynamics', labelKey: 'settings.moments_filter_draw_dynamic', icon: 'i-tabler-photo' },
  { setting: 'momentsHideUgcSeasonDynamics', labelKey: 'settings.moments_filter_ugc_season_dynamic', icon: 'i-tabler-stack' },
  { setting: 'momentsHideForwardDynamics', labelKey: 'settings.moments_filter_forward_dynamic', icon: 'i-tabler-repeat' },
  { setting: 'momentsHidePgcDynamics', labelKey: 'settings.moments_filter_pgc_dynamic', icon: 'i-tabler-device-tv' },
  { setting: 'momentsHideArticleDynamics', labelKey: 'settings.moments_filter_article_dynamic', icon: 'i-tabler-news' },
  // 该选项没有同名搜索条目，由 settings.moments_filter_up_recommendation 条目定位。
  { setting: 'momentsFilterUpRecommendation', labelKey: 'settings.moments_filter_up_recommendation_short', icon: 'i-tabler-sparkles', searchable: false },
  { setting: 'momentsHideChargeExclusive', labelKey: 'settings.moments_filter_charge_dynamic', icon: 'i-tabler-battery-charging' },
  { setting: 'momentsHideVideoReservation', labelKey: 'settings.moments_filter_video_reservation', icon: 'i-tabler-calendar-time' },
  { setting: 'momentsHideLiveReservation', labelKey: 'settings.moments_filter_live_reservation', icon: 'i-tabler-calendar-event' },
  { setting: 'momentsHideLiveDynamics', labelKey: 'settings.moments_filter_live_dynamic', icon: 'i-tabler-broadcast' },
]
