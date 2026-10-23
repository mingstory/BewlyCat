export interface TopBarComponentDefinition {
  key: string
  i18nKey: string
  icon: string
  supportsBadge: boolean
  // 页面展示顺序由数组决定；搜索目录沿用既有的结果顺序。
  searchOrder: number
}

export const topBarComponentDefinitions: TopBarComponentDefinition[] = [
  {
    key: 'moments',
    i18nKey: 'topbar.moments',
    icon: 'i-tabler:windmill',
    supportsBadge: true,
    searchOrder: 0,
  },
  {
    key: 'favorites',
    i18nKey: 'topbar.favorites',
    icon: 'i-mingcute:star-line',
    supportsBadge: false,
    searchOrder: 3,
  },
  {
    key: 'history',
    i18nKey: 'topbar.history',
    icon: 'i-mingcute:time-line',
    supportsBadge: false,
    searchOrder: 4,
  },
  {
    key: 'watchLater',
    i18nKey: 'topbar.watch_later',
    icon: 'i-mingcute:carplay-line',
    supportsBadge: true,
    searchOrder: 1,
  },
  {
    key: 'creatorCenter',
    i18nKey: 'topbar.creative_center',
    icon: 'i-mingcute:bulb-line',
    supportsBadge: false,
    searchOrder: 5,
  },
  {
    key: 'upload',
    i18nKey: 'topbar.upload',
    icon: 'i-mingcute:upload-line',
    supportsBadge: false,
    searchOrder: 6,
  },
  {
    key: 'notifications',
    i18nKey: 'topbar.notifications',
    icon: 'i-tabler:bell',
    supportsBadge: true,
    searchOrder: 2,
  },
  {
    key: 'topBarSwitcher',
    i18nKey: 'topbar.top_bar_switcher',
    icon: 'i-mingcute:refresh-2-line',
    supportsBadge: false,
    searchOrder: 7,
  },
]
