<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useCoyote } from '../../../../composables/useCoyote.js'
import { CoyoteConnectionState } from '../../../../composables/coyote/constants.js'

const { connectionState, strengthA, strengthB, strengthLimitA, strengthLimitB, settings, service } =
  useCoyote()

const isBound = computed(() => connectionState.value === CoyoteConnectionState.BOUND)

const strengthAPercent = computed(() =>
  strengthLimitA.value > 0 ? (strengthA.value / strengthLimitA.value) * 100 : 0
)
const strengthBPercent = computed(() =>
  strengthLimitB.value > 0 ? (strengthB.value / strengthLimitB.value) * 100 : 0
)

const getBarColor = (value) => {
  if (value <= 60) return '#4caf50'
  if (value <= 120) return '#f59e0b'
  return '#ef4444'
}

const adjustStrength = (channel, delta) => {
  const max = settings.value.maxStrength
  if (delta > 0) {
    service.increaseStrength(channel, Math.abs(delta), max)
  } else {
    service.decreaseStrength(channel, Math.abs(delta), max)
  }
}

const sendTestPulse = (channel) => {
  // 发送 10 条默认脉冲（1 秒）: freq=100, int=50
  const testPatterns = Array(10).fill('6464646432323232')
  service.sendPulse(channel, testPatterns)
}
</script>

<template>
  <div v-if="isBound" class="settings-section">
    <h3 class="section-title">
      <Icon icon="lucide:activity" width="18" height="18" />
      <span>实时状态</span>
    </h3>

    <!-- 通道 A -->
    <div class="channel-row">
      <span class="channel-label">通道 A</span>
      <div class="strength-bar-container">
        <div
          class="strength-bar"
          :style="{
            width: strengthAPercent + '%',
            background: getBarColor(strengthA)
          }"
        />
      </div>
      <span class="strength-value">{{ strengthA }}/{{ strengthLimitA }}</span>
    </div>
    <div class="adjust-buttons">
      <button class="adj-btn" @click="adjustStrength('A', -10)">-10</button>
      <button class="adj-btn" @click="adjustStrength('A', -1)">-1</button>
      <button class="adj-btn" @click="adjustStrength('A', 1)">+1</button>
      <button class="adj-btn" @click="adjustStrength('A', 10)">+10</button>
    </div>

    <!-- 通道 B -->
    <div class="channel-row" style="margin-top: 16px">
      <span class="channel-label">通道 B</span>
      <div class="strength-bar-container">
        <div
          class="strength-bar"
          :style="{
            width: strengthBPercent + '%',
            background: getBarColor(strengthB)
          }"
        />
      </div>
      <span class="strength-value">{{ strengthB }}/{{ strengthLimitB }}</span>
    </div>
    <div class="adjust-buttons">
      <button class="adj-btn" @click="adjustStrength('B', -10)">-10</button>
      <button class="adj-btn" @click="adjustStrength('B', -1)">-1</button>
      <button class="adj-btn" @click="adjustStrength('B', 1)">+1</button>
      <button class="adj-btn" @click="adjustStrength('B', 10)">+10</button>
    </div>

    <!-- 测试脉冲 -->
    <div class="test-row">
      <button class="action-btn" @click="sendTestPulse('A')">
        <Icon icon="lucide:zap" width="14" height="14" />
        测试脉冲 A
      </button>
      <button class="action-btn" @click="sendTestPulse('B')">
        <Icon icon="lucide:zap" width="14" height="14" />
        测试脉冲 B
      </button>
    </div>
  </div>
</template>

<style scoped>
.settings-section {
  margin-bottom: 24px;
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

.channel-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.channel-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  min-width: 52px;
}

.strength-bar-container {
  flex: 1;
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  overflow: hidden;
}

.strength-bar {
  height: 100%;
  border-radius: 5px;
  transition:
    width 0.3s ease,
    background 0.3s ease;
}

.strength-value {
  font-size: 0.8rem;
  font-family: var(--font-mono);
  color: rgba(255, 255, 255, 0.6);
  min-width: 52px;
  text-align: right;
}

.adjust-buttons {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  padding-left: 62px;
}

.adj-btn {
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  font-family: var(--font-mono);
  cursor: pointer;
  transition: all 0.2s ease;
}

.adj-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.test-row {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}
</style>
