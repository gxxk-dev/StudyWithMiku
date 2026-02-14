<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useFocus } from '../../../composables/useFocus.js'
import { usePlaylistManager } from '../../../composables/usePlaylistManager.js'
import { generateShareUrl } from '../../../composables/useUrlParams.js'

const { settings, updateSettings, requestNotificationPermission } = useFocus()

// 歌单管理
const { currentPlaylist } = usePlaylistManager()

// 分享选项
const includeDuration = ref(true)
const includePlaylist = ref(true)
const includeAutostart = ref(false)
const includeSave = ref(false)
const generatedUrl = ref('')
const copySuccess = ref(false)

// 当前歌单是否可序列化（仅 mode='playlist' 且有 source/sourceId）
const canIncludePlaylist = computed(() => {
  const p = currentPlaylist.value
  return p && p.mode === 'playlist' && p.source && p.sourceId
})

const handleGenerateUrl = () => {
  const playlistInfo =
    canIncludePlaylist.value && includePlaylist.value
      ? { platform: currentPlaylist.value.source, id: currentPlaylist.value.sourceId }
      : null

  generatedUrl.value = generateShareUrl({
    focusSettings: includeDuration.value ? settings.value : null,
    playlist: playlistInfo,
    autostart: includeAutostart.value,
    save: includeSave.value
  })
}

const handleCopyUrl = async () => {
  if (!generatedUrl.value) return
  try {
    await navigator.clipboard.writeText(generatedUrl.value)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch {
    // 复制失败时静默处理
  }
}

// 分钟 <-> 秒转换的 computed
const focusMinutes = computed(() => Math.round(settings.value.focusDuration / 60))
const shortBreakMinutes = computed(() => Math.round(settings.value.shortBreakDuration / 60))
const longBreakMinutes = computed(() => Math.round(settings.value.longBreakDuration / 60))

// 通知权限状态
const notificationSupported = computed(() => 'Notification' in window)
const notificationPermission = computed(() => {
  if (!notificationSupported.value) return 'unsupported'
  return Notification.permission
})

// Slider 填充百分比计算
const focusFillPercent = computed(() => ((focusMinutes.value - 1) / (120 - 1)) * 100)
const shortBreakFillPercent = computed(() => (shortBreakMinutes.value / 30) * 100)
const longBreakFillPercent = computed(() => (longBreakMinutes.value / 60) * 100)

// 通用 clamp
const clamp = (val, min, max) => Math.min(max, Math.max(min, val))

// Slider 事件（无极拖动，直接取整）
const handleSlider = (key, e) => {
  updateSettings({ [key]: Math.round(Number(e.target.value)) * 60 })
}

// 数字输入事件（blur / Enter 时提交，clamp 到合法范围）
const handleNumberInput = (key, min, max, e) => {
  const raw = parseInt(e.target.value, 10)
  const val = Number.isNaN(raw) ? min : clamp(raw, min, max)
  e.target.value = val // 回写 clamp 后的值
  updateSettings({ [key]: val * 60 })
}

const handleLongBreakInterval = (delta) => {
  const newValue = settings.value.longBreakInterval + delta
  if (newValue >= 2 && newValue <= 10) {
    updateSettings({ longBreakInterval: newValue })
  }
}

const handleAutoStartBreaks = (e) => {
  updateSettings({ autoStartBreaks: e.target.checked })
}

const handleAutoStartFocus = (e) => {
  updateSettings({ autoStartFocus: e.target.checked })
}

const handleNotificationEnabled = async (e) => {
  const enabled = e.target.checked
  if (enabled && notificationPermission.value === 'default') {
    const result = await requestNotificationPermission()
    if (!result.success) {
      e.target.checked = false
      return
    }
  }
  updateSettings({ notificationEnabled: enabled })
}

const handleNotificationSound = (e) => {
  updateSettings({ notificationSound: e.target.checked })
}
</script>

<template>
  <div class="tab-content">
    <!-- Section 1: 计时器时长 -->
    <div class="settings-section">
      <h3 class="section-title">
        <Icon icon="lucide:timer" width="18" height="18" />
        <span>计时器时长</span>
      </h3>

      <!-- 专注时长 -->
      <div class="setting-item">
        <div class="setting-header">
          <span class="setting-label">专注时长</span>
          <span class="setting-value">
            <input
              type="number"
              class="number-input"
              min="1"
              max="120"
              :value="focusMinutes"
              @change="handleNumberInput('focusDuration', 1, 120, $event)"
            />
            <span>分钟</span>
          </span>
        </div>
        <input
          type="range"
          class="slider"
          min="1"
          max="120"
          step="1"
          :value="focusMinutes"
          :style="{ '--fill': focusFillPercent + '%' }"
          @input="handleSlider('focusDuration', $event)"
        />
      </div>

      <!-- 短休息 -->
      <div class="setting-item">
        <div class="setting-header">
          <span class="setting-label">短休息</span>
          <span class="setting-value">
            <input
              type="number"
              class="number-input"
              min="0"
              max="30"
              :value="shortBreakMinutes"
              @change="handleNumberInput('shortBreakDuration', 0, 30, $event)"
            />
            <span v-if="shortBreakMinutes > 0">分钟</span>
            <span v-else class="disabled-hint">已禁用</span>
          </span>
        </div>
        <input
          type="range"
          class="slider"
          min="0"
          max="30"
          step="1"
          :value="shortBreakMinutes"
          :style="{ '--fill': shortBreakFillPercent + '%' }"
          @input="handleSlider('shortBreakDuration', $event)"
        />
      </div>

      <!-- 长休息 -->
      <div class="setting-item">
        <div class="setting-header">
          <span class="setting-label">长休息</span>
          <span class="setting-value">
            <input
              type="number"
              class="number-input"
              min="0"
              max="60"
              :value="longBreakMinutes"
              @change="handleNumberInput('longBreakDuration', 0, 60, $event)"
            />
            <span v-if="longBreakMinutes > 0">分钟</span>
            <span v-else class="disabled-hint">已禁用</span>
          </span>
        </div>
        <input
          type="range"
          class="slider"
          min="0"
          max="60"
          step="1"
          :value="longBreakMinutes"
          :style="{ '--fill': longBreakFillPercent + '%' }"
          @input="handleSlider('longBreakDuration', $event)"
        />
      </div>

      <!-- 长休息间隔 -->
      <div class="setting-item">
        <div class="setting-header">
          <span class="setting-label">长休息间隔</span>
          <span class="setting-hint">每完成几个专注后进入长休息</span>
        </div>
        <div class="stepper">
          <button
            class="stepper-btn"
            :disabled="settings.longBreakInterval <= 2"
            @click="handleLongBreakInterval(-1)"
          >
            <Icon icon="mdi:minus" width="16" height="16" />
          </button>
          <span class="stepper-value">{{ settings.longBreakInterval }}</span>
          <button
            class="stepper-btn"
            :disabled="settings.longBreakInterval >= 10"
            @click="handleLongBreakInterval(1)"
          >
            <Icon icon="mdi:plus" width="16" height="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- Section 2: 自动化 -->
    <div class="settings-section">
      <h3 class="section-title">
        <Icon icon="lucide:zap" width="18" height="18" />
        <span>自动化</span>
      </h3>

      <!-- 自动开始休息 -->
      <div class="setting-item row">
        <div class="setting-info">
          <span class="setting-label">自动开始休息</span>
          <span class="setting-hint">专注结束后自动进入休息</span>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="settings.autoStartBreaks"
            @change="handleAutoStartBreaks"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 自动开始专注 -->
      <div class="setting-item row">
        <div class="setting-info">
          <span class="setting-label">自动开始专注</span>
          <span class="setting-hint">休息结束后自动进入专注</span>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="settings.autoStartFocus"
            @change="handleAutoStartFocus"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <!-- Section 3: 通知 -->
    <div class="settings-section">
      <h3 class="section-title">
        <Icon icon="lucide:bell" width="18" height="18" />
        <span>通知</span>
      </h3>

      <!-- 权限警告横幅 -->
      <div v-if="notificationPermission === 'denied'" class="permission-banner warning">
        <Icon icon="lucide:alert-triangle" width="16" height="16" />
        <span>通知权限已被拒绝，请在浏览器设置中允许通知</span>
      </div>
      <div v-else-if="!notificationSupported" class="permission-banner info">
        <Icon icon="lucide:info" width="16" height="16" />
        <span>当前浏览器不支持桌面通知</span>
      </div>

      <!-- 桌面通知 -->
      <div class="setting-item row">
        <div class="setting-info">
          <span class="setting-label">桌面通知</span>
          <span class="setting-hint">计时结束时发送系统通知</span>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="settings.notificationEnabled"
            :disabled="notificationPermission === 'denied' || !notificationSupported"
            @change="handleNotificationEnabled"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 通知提示音 -->
      <div class="setting-item row">
        <div class="setting-info">
          <span class="setting-label">通知提示音</span>
          <span class="setting-hint">通知时播放提示音</span>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="settings.notificationSound"
            :disabled="!settings.notificationEnabled"
            @change="handleNotificationSound"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <!-- Section 4: 分享配置 -->
    <div class="settings-section">
      <h3 class="section-title">
        <Icon icon="lucide:share-2" width="18" height="18" />
        <span>分享配置</span>
      </h3>

      <!-- 包含时长 -->
      <div class="setting-item row">
        <div class="setting-info">
          <span class="setting-label">包含时长</span>
          <span class="setting-hint">分享专注/休息时长设置</span>
        </div>
        <label class="toggle">
          <input v-model="includeDuration" type="checkbox" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 包含歌单 -->
      <div v-if="canIncludePlaylist" class="setting-item row">
        <div class="setting-info">
          <span class="setting-label">包含歌单</span>
          <span class="setting-hint">将当前歌单一起分享</span>
        </div>
        <label class="toggle">
          <input v-model="includePlaylist" type="checkbox" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 本地歌单提示 -->
      <div v-else-if="currentPlaylist" class="permission-banner info">
        <Icon icon="lucide:info" width="16" height="16" />
        <span>本地歌单暂不支持通过链接分享</span>
      </div>

      <!-- 自动启动 -->
      <div class="setting-item row">
        <div class="setting-info">
          <span class="setting-label">自动启动</span>
          <span class="setting-hint">打开链接后自动开始专注</span>
        </div>
        <label class="toggle">
          <input v-model="includeAutostart" type="checkbox" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 覆写配置 -->
      <div class="setting-item row">
        <div class="setting-info">
          <span class="setting-label">覆写配置</span>
          <span class="setting-hint">将配置保存到使用者本地</span>
        </div>
        <label class="toggle">
          <input v-model="includeSave" type="checkbox" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 覆写提示 -->
      <div v-if="includeSave" class="share-disclaimer">对方可以选择是否保存到本地</div>

      <!-- 生成按钮 -->
      <button class="share-generate-btn" @click="handleGenerateUrl">
        <Icon icon="lucide:link" width="16" height="16" />
        <span>生成分享链接</span>
      </button>

      <!-- URL 展示 -->
      <div v-if="generatedUrl" class="share-url-display">
        <div class="share-url-text">{{ generatedUrl }}</div>
        <button class="share-copy-btn" :class="{ success: copySuccess }" @click="handleCopyUrl">
          <Icon :icon="copySuccess ? 'lucide:check' : 'lucide:copy'" width="16" height="16" />
          <span>{{ copySuccess ? '已复制' : '复制' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-content {
  padding: 24px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 16px 0;
}

.setting-item {
  margin-bottom: 16px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
}

.setting-value {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: #39c5bb;
  font-weight: 500;
}

/* Number Input 样式 */
.number-input {
  width: 42px;
  padding: 2px 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: #39c5bb;
  font-size: 0.85rem;
  font-weight: 500;
  text-align: center;
  outline: none;
  appearance: textfield;
  -moz-appearance: textfield;
}

.number-input::-webkit-inner-spin-button,
.number-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.number-input:focus {
  border-color: rgba(57, 197, 187, 0.5);
  background: rgba(57, 197, 187, 0.1);
}

.setting-hint {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.disabled-hint {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

/* Slider 样式 */
.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    #39c5bb 0%,
    #39c5bb var(--fill, 0%),
    rgba(255, 255, 255, 0.15) var(--fill, 0%),
    rgba(255, 255, 255, 0.15) 100%
  );
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: background 0.1s ease;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #39c5bb;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(57, 197, 187, 0.4);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(57, 197, 187, 0.6);
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: #39c5bb;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(57, 197, 187, 0.4);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(57, 197, 187, 0.6);
}

/* Stepper 样式 */
.stepper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.2s ease;
}

.stepper-btn:hover:not(:disabled) {
  background: rgba(57, 197, 187, 0.2);
  border-color: rgba(57, 197, 187, 0.4);
  color: #39c5bb;
}

.stepper-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stepper-value {
  min-width: 32px;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: #39c5bb;
}

/* Toggle Switch 样式 */
.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  transition: background 0.2s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.toggle input:checked + .toggle-slider {
  background: #39c5bb;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
  background: #fff;
}

.toggle input:disabled + .toggle-slider {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 权限横幅 */
.permission-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  margin-bottom: 12px;
}

.permission-banner.warning {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.permission-banner.info {
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #818cf8;
}

/* 分享提示 */
.share-disclaimer {
  padding: 8px 12px;
  margin-top: -8px;
  margin-bottom: 12px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

/* 生成按钮 */
.share-generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  margin-top: 12px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #39c5bb 0%, #2db5aa 100%);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.share-generate-btn:hover {
  background: linear-gradient(135deg, #4dd5cb 0%, #3dc5ba 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(57, 197, 187, 0.3);
}

/* URL 展示 */
.share-url-display {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.share-url-text {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 0.8rem;
  font-family: var(--font-mono);
  color: rgba(255, 255, 255, 0.7);
  word-break: break-all;
  max-height: 80px;
  overflow-y: auto;
}

.share-copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid rgba(57, 197, 187, 0.3);
  border-radius: 6px;
  background: rgba(57, 197, 187, 0.1);
  color: #39c5bb;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.share-copy-btn:hover {
  background: rgba(57, 197, 187, 0.2);
  border-color: rgba(57, 197, 187, 0.5);
}

.share-copy-btn.success {
  background: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.5);
  color: #4caf50;
}
</style>
