/**
 * Focus Session 状态机管理
 * 管理番茄钟会话的状态转换和中断恢复
 */

import { ref, computed, readonly, onUnmounted, getCurrentInstance } from 'vue'
import {
  safeLocalStorageGetJSON,
  safeLocalStorageSetJSON,
  safeLocalStorageRemove
} from '../../utils/storage.js'
import {
  FocusState,
  FocusMode,
  CompletionType,
  DEFAULT_SETTINGS,
  FOCUS_STORAGE_KEYS
} from './constants.js'
import { createTimer } from './useTimer.js'
import { useRecords } from './useRecords.js'
import { useAuth } from '../useAuth.js'
import { useDataSync } from '../useDataSync.js'
import { AUTH_CONFIG } from '../../config/constants.js'

// 模块级单例状态
const state = ref(FocusState.IDLE)
const mode = ref(FocusMode.FOCUS)
const settings = ref({ ...DEFAULT_SETTINGS })
const sessionCount = ref(0)
const currentSessionStart = ref(null)

let initialized = false
let timer = null

/**
 * 初始化设置
 */
const initializeSettings = async () => {
  const savedSettings = safeLocalStorageGetJSON(FOCUS_STORAGE_KEYS.SETTINGS, null)
  if (savedSettings) {
    settings.value = { ...DEFAULT_SETTINGS, ...savedSettings }
  }

  // 如果用户已登录，下载并合并服务器设置
  const { isAuthenticated } = useAuth()
  const { downloadData } = useDataSync()

  if (isAuthenticated.value) {
    try {
      const serverSettings = await downloadData(AUTH_CONFIG.DATA_TYPES.FOCUS_SETTINGS)
      if (serverSettings && typeof serverSettings === 'object') {
        // 合并服务器设置（服务器优先）
        settings.value = { ...DEFAULT_SETTINGS, ...settings.value, ...serverSettings }
        persistSettings()
      }
    } catch (error) {
      console.error('下载 Focus 设置失败:', error)
      // 不影响初始化流程，继续使用本地设置
    }
  }
}

/**
 * 保存设置
 */
const persistSettings = () => {
  safeLocalStorageSetJSON(FOCUS_STORAGE_KEYS.SETTINGS, settings.value)

  // 如果用户已登录，自动上传到服务器
  const { isAuthenticated } = useAuth()
  const { uploadData } = useDataSync()

  if (isAuthenticated.value) {
    uploadData(AUTH_CONFIG.DATA_TYPES.FOCUS_SETTINGS, settings.value).catch((error) => {
      console.error('上传 Focus 设置失败:', error)
      // 不影响本地保存，错误会被加入离线队列
    })
  }
}

/**
 * 保存当前运行状态
 */
const persistCurrentState = () => {
  if (state.value === FocusState.IDLE) {
    safeLocalStorageRemove(FOCUS_STORAGE_KEYS.CURRENT)
    return
  }

  const snapshot = timer?.getSnapshot() || {}
  const currentState = {
    mode: mode.value,
    state: state.value,
    duration: snapshot.duration || 0,
    elapsed: snapshot.elapsed || 0,
    startTime: currentSessionStart.value,
    startTimestamp: snapshot.startTimestamp,
    pausedElapsed: snapshot.pausedElapsed || 0,
    sessionCount: sessionCount.value,
    savedAt: Date.now()
  }

  safeLocalStorageSetJSON(FOCUS_STORAGE_KEYS.CURRENT, currentState)
}

/**
 * 清除当前运行状态
 */
const clearCurrentState = () => {
  safeLocalStorageRemove(FOCUS_STORAGE_KEYS.CURRENT)
}

/**
 * 检测并处理中断的会话
 * @returns {Object|null} 中断的会话信息
 */
const detectInterruptedSession = () => {
  const savedState = safeLocalStorageGetJSON(FOCUS_STORAGE_KEYS.CURRENT, null)

  if (!savedState) {
    return null
  }

  // 如果保存的状态是 IDLE，清除并返回
  if (savedState.state === FocusState.IDLE) {
    clearCurrentState()
    return null
  }

  return savedState
}

/**
 * 记录中断的会话
 * @param {Object} interruptedState - 中断的状态
 */
const recordInterruptedSession = (interruptedState) => {
  const { addRecord } = useRecords()

  const record = {
    mode: interruptedState.mode,
    startTime: interruptedState.startTime,
    endTime: interruptedState.savedAt || Date.now(),
    duration: interruptedState.duration,
    elapsed: interruptedState.elapsed,
    completionType: CompletionType.INTERRUPTED
  }

  addRecord(record)
  clearCurrentState()
}

/**
 * 获取当前模式的时长
 */
const getCurrentDuration = () => {
  switch (mode.value) {
    case FocusMode.FOCUS:
      return settings.value.focusDuration
    case FocusMode.SHORT_BREAK:
      return settings.value.shortBreakDuration
    case FocusMode.LONG_BREAK:
      return settings.value.longBreakDuration
    default:
      return settings.value.focusDuration
  }
}

/**
 * 计算下一个模式
 */
const getNextMode = () => {
  if (mode.value === FocusMode.FOCUS) {
    // 检查是否需要长休息
    if (sessionCount.value > 0 && sessionCount.value % settings.value.longBreakInterval === 0) {
      return FocusMode.LONG_BREAK
    }
    return FocusMode.SHORT_BREAK
  }
  return FocusMode.FOCUS
}

/**
 * 切换到下一个模式
 */
const switchToNextMode = () => {
  mode.value = getNextMode()
}

/**
 * 处理计时完成
 */
const handleComplete = () => {
  const { addRecord } = useRecords()

  // 记录完成的会话
  const record = {
    mode: mode.value,
    startTime: currentSessionStart.value,
    endTime: Date.now(),
    duration: getCurrentDuration(),
    elapsed: getCurrentDuration(),
    completionType: CompletionType.COMPLETED
  }

  addRecord(record)

  // 如果是专注模式，增加会话计数
  if (mode.value === FocusMode.FOCUS) {
    sessionCount.value++
  }

  // 重置状态
  state.value = FocusState.IDLE
  currentSessionStart.value = null
  clearCurrentState()

  // 切换到下一个模式
  switchToNextMode()

  // 检查新模式是否被禁用（时长为 0）
  // 仅对休息模式生效，防止无限循环
  while (getCurrentDuration() === 0 && mode.value !== FocusMode.FOCUS) {
    // 记录被禁用跳过的休息
    const now = Date.now()
    const disabledRecord = {
      mode: mode.value,
      startTime: now,
      endTime: now,
      duration: 0,
      elapsed: 0,
      completionType: CompletionType.DISABLED
    }
    addRecord(disabledRecord)

    // 继续切换到下一模式
    switchToNextMode()
  }

  // 发送通知
  sendNotification()

  // 自动开始下一个阶段
  if (mode.value === FocusMode.FOCUS && settings.value.autoStartFocus) {
    startSession()
  } else if (mode.value !== FocusMode.FOCUS && settings.value.autoStartBreaks) {
    startSession()
  }
}

/**
 * 发送通知
 */
const sendNotification = () => {
  if (!settings.value.notificationEnabled) {
    return
  }

  if (!('Notification' in window)) {
    return
  }

  if (Notification.permission !== 'granted') {
    return
  }

  const title = mode.value === FocusMode.FOCUS ? 'Focus session completed!' : 'Break time is over!'

  const body =
    mode.value === FocusMode.FOCUS ? 'Great job! Time for a break.' : 'Ready to focus again?'

  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'focus-notification'
    })
  } catch {
    // 忽略通知错误
  }
}

/**
 * 处理 tick
 */
const handleTick = () => {
  persistCurrentState()
}

/**
 * 创建并初始化计时器
 */
const ensureTimer = () => {
  if (!timer) {
    timer = createTimer({
      onTick: handleTick,
      onComplete: handleComplete
    })
  }
  return timer
}

/**
 * 模块级启动会话（供 handleComplete 调用）
 */
const startSession = () => {
  if (state.value !== FocusState.IDLE) {
    return { success: false, error: 'Session already in progress' }
  }

  const timerInstance = ensureTimer()
  const duration = getCurrentDuration()
  currentSessionStart.value = Date.now()
  state.value = FocusState.RUNNING

  timerInstance.start(duration)
  persistCurrentState()

  return { success: true }
}

/**
 * Vue Composable
 */
export const useSession = () => {
  // 初始化
  if (!initialized) {
    initializeSettings()
    initialized = true
  }

  const timerInstance = ensureTimer()

  // 计算属性
  const isRunning = computed(() => state.value === FocusState.RUNNING)
  const isPaused = computed(() => state.value === FocusState.PAUSED)
  const isIdle = computed(() => state.value === FocusState.IDLE)

  /**
   * 开始会话
   * @returns {Object} { success: boolean, error?: string }
   */
  const start = () => {
    return startSession()
  }

  /**
   * 暂停会话
   * @returns {Object} { success: boolean, error?: string }
   */
  const pause = () => {
    if (state.value !== FocusState.RUNNING) {
      return { success: false, error: 'Session not running' }
    }

    timerInstance.pause()
    state.value = FocusState.PAUSED
    persistCurrentState()

    return { success: true }
  }

  /**
   * 恢复会话
   * @returns {Object} { success: boolean, error?: string }
   */
  const resume = () => {
    if (state.value !== FocusState.PAUSED) {
      return { success: false, error: 'Session not paused' }
    }

    timerInstance.resume()
    state.value = FocusState.RUNNING
    persistCurrentState()

    return { success: true }
  }

  /**
   * 取消会话
   * @returns {Object} { success: boolean, error?: string }
   */
  const cancel = () => {
    if (state.value === FocusState.IDLE) {
      return { success: false, error: 'No session to cancel' }
    }

    const { addRecord } = useRecords()
    const snapshot = timerInstance.getSnapshot()

    // 记录取消的会话
    const record = {
      mode: mode.value,
      startTime: currentSessionStart.value,
      endTime: Date.now(),
      duration: getCurrentDuration(),
      elapsed: snapshot.elapsed || 0,
      completionType: CompletionType.CANCELLED
    }

    addRecord(record)

    // 重置状态
    timerInstance.reset()
    state.value = FocusState.IDLE
    currentSessionStart.value = null
    clearCurrentState()

    return { success: true }
  }

  /**
   * 跳过当前阶段
   * @returns {Object} { success: boolean, error?: string }
   */
  const skip = () => {
    if (state.value === FocusState.IDLE) {
      return { success: false, error: 'No session to skip' }
    }

    const { addRecord } = useRecords()
    const snapshot = timerInstance.getSnapshot()

    // 记录跳过的会话
    const record = {
      mode: mode.value,
      startTime: currentSessionStart.value,
      endTime: Date.now(),
      duration: getCurrentDuration(),
      elapsed: snapshot.elapsed || 0,
      completionType: CompletionType.SKIPPED
    }

    addRecord(record)

    // 如果是专注模式，增加会话计数
    if (mode.value === FocusMode.FOCUS) {
      sessionCount.value++
    }

    // 重置并切换模式
    timerInstance.reset()
    state.value = FocusState.IDLE
    currentSessionStart.value = null
    clearCurrentState()
    switchToNextMode()

    return { success: true }
  }

  /**
   * 设置模式
   * @param {string} newMode - 新模式
   * @returns {Object} { success: boolean, error?: string }
   */
  const setMode = (newMode) => {
    if (state.value !== FocusState.IDLE) {
      return { success: false, error: 'Cannot change mode while session is active' }
    }

    if (!Object.values(FocusMode).includes(newMode)) {
      return { success: false, error: 'Invalid mode' }
    }

    mode.value = newMode
    return { success: true }
  }

  /**
   * 更新设置
   * @param {Object} newSettings - 新设置
   * @returns {Object} { success: boolean }
   */
  const updateSettings = (newSettings) => {
    settings.value = { ...settings.value, ...newSettings }
    persistSettings()
    return { success: true }
  }

  /**
   * 重置会话计数
   */
  const resetSessionCount = () => {
    sessionCount.value = 0
  }

  /**
   * 检查并恢复中断的会话
   * @returns {Object} { hasInterrupted: boolean, interruptedState?: Object }
   */
  const checkInterruptedSession = () => {
    const interruptedState = detectInterruptedSession()

    if (!interruptedState) {
      return { hasInterrupted: false }
    }

    return { hasInterrupted: true, interruptedState }
  }

  /**
   * 恢复中断的会话（继续运行）
   * @param {Object} interruptedState - 中断的状态
   * @returns {Object} { success: boolean, error?: string }
   */
  const resumeInterruptedSession = (interruptedState) => {
    if (!interruptedState) {
      return { success: false, error: 'No interrupted state provided' }
    }

    mode.value = interruptedState.mode
    sessionCount.value = interruptedState.sessionCount || 0
    currentSessionStart.value = interruptedState.startTime

    const snapshot = {
      isRunning: true,
      isPaused: interruptedState.state === FocusState.PAUSED,
      elapsed: interruptedState.elapsed,
      duration: interruptedState.duration,
      startTimestamp: interruptedState.startTimestamp,
      pausedElapsed: interruptedState.pausedElapsed
    }

    const result = timerInstance.restoreFromSnapshot(snapshot)

    if (result === 'overtime') {
      // 会话已超时，记录为中断
      recordInterruptedSession(interruptedState)
      return { success: false, error: 'Session has expired' }
    }

    if (result) {
      state.value = snapshot.isPaused ? FocusState.PAUSED : FocusState.RUNNING
      return { success: true }
    }

    return { success: false, error: 'Failed to restore session' }
  }

  /**
   * 放弃中断的会话
   * @param {Object} interruptedState - 中断的状态
   * @returns {Object} { success: boolean }
   */
  const discardInterruptedSession = (interruptedState) => {
    if (interruptedState) {
      recordInterruptedSession(interruptedState)
    }
    return { success: true }
  }

  /**
   * 请求通知权限
   */
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      return { success: false, error: 'Notifications not supported' }
    }

    if (Notification.permission === 'granted') {
      return { success: true, permission: 'granted' }
    }

    if (Notification.permission === 'denied') {
      return { success: false, permission: 'denied', error: 'Notifications denied' }
    }

    const permission = await Notification.requestPermission()
    return { success: permission === 'granted', permission }
  }

  // 清理（仅在组件上下文中注册）
  if (getCurrentInstance()) {
    onUnmounted(() => {
      timerInstance.cleanup()
    })
  }

  return {
    // 状态
    state: readonly(state),
    mode: readonly(mode),
    settings: readonly(settings),
    sessionCount: readonly(sessionCount),

    // 计时器状态
    elapsed: timerInstance.elapsed,
    remaining: timerInstance.remaining,
    progress: timerInstance.progress,
    duration: timerInstance.duration,

    // 计算属性
    isRunning,
    isPaused,
    isIdle,

    // 操作方法
    start,
    pause,
    resume,
    cancel,
    skip,
    setMode,

    // 设置
    updateSettings,
    resetSessionCount,

    // 中断恢复
    checkInterruptedSession,
    resumeInterruptedSession,
    discardInterruptedSession,

    // 通知
    requestNotificationPermission
  }
}

// 导出内部函数供测试使用
export const _internal = {
  initializeSettings,
  persistSettings,
  persistCurrentState,
  clearCurrentState,
  detectInterruptedSession,
  recordInterruptedSession,
  getCurrentDuration,
  getNextMode,
  resetForTesting: () => {
    state.value = FocusState.IDLE
    mode.value = FocusMode.FOCUS
    settings.value = { ...DEFAULT_SETTINGS }
    sessionCount.value = 0
    currentSessionStart.value = null
    initialized = false
    if (timer) {
      timer.cleanup()
      timer = null
    }
  }
}
