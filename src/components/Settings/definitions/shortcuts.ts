import type { ShortcutsSettings } from '~/logic/storage'

export type ConfigurableShortcutId = keyof ShortcutsSettings

export interface ConfigurableShortcutDefinition {
  id: ConfigurableShortcutId
  nameKey: string
  descriptionKey: string
  defaultKey: string
}

export interface ConfigurableShortcutGroup {
  titleKey: string
  shortcuts: ConfigurableShortcutDefinition[]
}

export const configurableShortcutsGroups: ConfigurableShortcutGroup[] = [
  {
    titleKey: 'settings.shortcuts.group.homepage',
    shortcuts: [
      { id: 'homeRefresh', nameKey: 'settings.shortcuts.home_refresh', descriptionKey: 'settings.shortcuts.home_refresh_desc', defaultKey: 'R' },
    ],
  },
  {
    titleKey: 'settings.shortcuts.group.general',
    shortcuts: [
      { id: 'danmuStatus', nameKey: 'settings.shortcuts.danmu_status', descriptionKey: 'settings.shortcuts.danmu_status_desc', defaultKey: 'Shift+D' },
      { id: 'webFullscreen', nameKey: 'settings.shortcuts.web_fullscreen', descriptionKey: 'settings.shortcuts.web_fullscreen_desc', defaultKey: 'Shift+W' },
      { id: 'widescreen', nameKey: 'settings.shortcuts.widescreen', descriptionKey: 'settings.shortcuts.widescreen_desc', defaultKey: 'T' },
      { id: 'bewlyWidescreen', nameKey: 'settings.shortcuts.bewly_widescreen', descriptionKey: 'settings.shortcuts.bewly_widescreen_desc', defaultKey: 'Shift+T' },
      { id: 'shortStepBackward', nameKey: 'settings.shortcuts.short_step_backward', descriptionKey: 'settings.shortcuts.short_step_backward_desc', defaultKey: 'J' },
      { id: 'longStepBackward', nameKey: 'settings.shortcuts.long_step_backward', descriptionKey: 'settings.shortcuts.long_step_backward_desc', defaultKey: 'Shift+J' },
      { id: 'playPause', nameKey: 'settings.shortcuts.play_pause_ext', descriptionKey: 'settings.shortcuts.play_pause_ext_desc', defaultKey: 'K' },
      { id: 'shortStepForward', nameKey: 'settings.shortcuts.short_step_forward', descriptionKey: 'settings.shortcuts.short_step_forward_desc', defaultKey: 'L' },
      { id: 'longStepForward', nameKey: 'settings.shortcuts.long_step_forward', descriptionKey: 'settings.shortcuts.long_step_forward_desc', defaultKey: 'Shift+L' },
      { id: 'pip', nameKey: 'settings.shortcuts.pip', descriptionKey: 'settings.shortcuts.pip_desc', defaultKey: 'P' },
      { id: 'turnOffLight', nameKey: 'settings.shortcuts.turn_off_light', descriptionKey: 'settings.shortcuts.turn_off_light_desc', defaultKey: 'I' },
      { id: 'caption', nameKey: 'settings.shortcuts.caption', descriptionKey: 'settings.shortcuts.caption_desc', defaultKey: 'C' },
      { id: 'videoScreenshot', nameKey: 'settings.shortcuts.video_screenshot', descriptionKey: 'settings.shortcuts.video_screenshot_desc', defaultKey: 'Shift+S' },
      { id: 'listenVideo', nameKey: 'settings.shortcuts.listen_video', descriptionKey: 'settings.shortcuts.listen_video_desc', defaultKey: 'Shift+M' },
      { id: 'increasePlaybackRate', nameKey: 'settings.shortcuts.increase_playback_rate', descriptionKey: 'settings.shortcuts.increase_playback_rate_desc', defaultKey: '+' },
      { id: 'decreasePlaybackRate', nameKey: 'settings.shortcuts.decrease_playback_rate', descriptionKey: 'settings.shortcuts.decrease_playback_rate_desc', defaultKey: '-' },
      { id: 'resetPlaybackRate', nameKey: 'settings.shortcuts.reset_playback_rate', descriptionKey: 'settings.shortcuts.reset_playback_rate_desc', defaultKey: '0' },
      { id: 'previousFrame', nameKey: 'settings.shortcuts.previous_frame', descriptionKey: 'settings.shortcuts.previous_frame_desc', defaultKey: ',' },
      { id: 'nextFrame', nameKey: 'settings.shortcuts.next_frame', descriptionKey: 'settings.shortcuts.next_frame_desc', defaultKey: '.' },
      { id: 'replay', nameKey: 'settings.shortcuts.replay', descriptionKey: 'settings.shortcuts.replay_desc', defaultKey: 'Shift+Backspace' },
      { id: 'toggleFollow', nameKey: 'settings.shortcuts.toggle_follow', descriptionKey: 'settings.shortcuts.toggle_follow_desc', defaultKey: 'Shift+F' },
    ],
  },
  {
    titleKey: 'settings.shortcuts.group.fullscreen_mode',
    shortcuts: [
      { id: 'increaseVideoSize', nameKey: 'settings.shortcuts.increase_video_size', descriptionKey: 'settings.shortcuts.increase_video_size_desc', defaultKey: '' },
      { id: 'decreaseVideoSize', nameKey: 'settings.shortcuts.decrease_video_size', descriptionKey: 'settings.shortcuts.decrease_video_size_desc', defaultKey: '' },
      { id: 'resetVideoSize', nameKey: 'settings.shortcuts.reset_video_size', descriptionKey: 'settings.shortcuts.reset_video_size_desc', defaultKey: '' },
      { id: 'videoTitle', nameKey: 'settings.shortcuts.video_title', descriptionKey: 'settings.shortcuts.video_title_desc', defaultKey: 'B' },
      { id: 'videoTime', nameKey: 'settings.shortcuts.video_time', descriptionKey: 'settings.shortcuts.video_time_desc', defaultKey: 'G' },
      { id: 'clockTime', nameKey: 'settings.shortcuts.clock_time', descriptionKey: 'settings.shortcuts.clock_time_desc', defaultKey: 'H' },
    ],
  },
]
