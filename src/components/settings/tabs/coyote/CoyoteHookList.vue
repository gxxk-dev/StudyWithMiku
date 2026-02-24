<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useCoyote } from '../../../../composables/useCoyote.js'
import {
  CoyoteConnectionState,
  HookTrigger,
  HookActionType
} from '../../../../composables/coyote/constants.js'
import CoyoteHookEditor from './CoyoteHookEditor.vue'

const { hooks, connectionState, updateHook, removeHook, testFire, applyPreset, presets } =
  useCoyote()

const editingHookId = ref(null)
const isAddingNew = ref(false)
const showPresetMenu = ref(false)

const isBound = computed(() => connectionState.value === CoyoteConnectionState.BOUND)

const triggerLabels = {
  [HookTrigger.FOCUS_START]: '专注开始',
  [HookTrigger.FOCUS_PAUSE]: '专注暂停',
  [HookTrigger.FOCUS_RESUME]: '专注恢复',
  [HookTrigger.FOCUS_COMPLETED]: '专注完成',
  [HookTrigger.FOCUS_CANCELLED]: '专注取消',
  [HookTrigger.FOCUS_SKIPPED]: '专注跳过',
  [HookTrigger.BREAK_START]: '休息开始',
  [HookTrigger.BREAK_COMPLETED]: '休息完成',
  [HookTrigger.BREAK_CANCELLED]: '休息取消',
  [HookTrigger.BREAK_SKIPPED]: '休息跳过',
  [HookTrigger.FOCUS_TICK]: '专注定时',
  [HookTrigger.BREAK_TICK]: '休息定时'
}

const actionLabels = {
  [HookActionType.STRENGTH_SET]: '设置强度',
  [HookActionType.STRENGTH_INCREASE]: '增加强度',
  [HookActionType.STRENGTH_DECREASE]: '减少强度',
  [HookActionType.PULSE]: '脉冲',
  [HookActionType.CLEAR]: '清除'
}

const getHookSummary = (hook) => {
  const trigger = triggerLabels[hook.trigger] || hook.trigger
  const action = hook.action
  if (!action) return trigger

  const actionLabel = actionLabels[action.type] || action.type
  const channel = action.channel === 'both' ? '双通道' : `${action.channel}通道`

  if (action.type === HookActionType.PULSE) {
    const duration = action.durationMs ? `${(action.durationMs / 1000).toFixed(1)}s` : ''
    return `${trigger} → ${actionLabel} ${channel} ${duration}`
  }

  if (action.value !== undefined) {
    return `${trigger} → ${actionLabel} ${channel} ${action.value}`
  }

  return `${trigger} → ${actionLabel} ${channel}`
}

const handleToggle = (hook) => {
  updateHook(hook.id, { enabled: !hook.enabled })
}

const handleEdit = (hookId) => {
  isAddingNew.value = false
  editingHookId.value = editingHookId.value === hookId ? null : hookId
}

const handleDelete = (hookId) => {
  removeHook(hookId)
  if (editingHookId.value === hookId) {
    editingHookId.value = null
  }
}

const handleTest = (hook) => {
  testFire(hook)
}

const handleAddNew = () => {
  editingHookId.value = null
  isAddingNew.value = true
}

const handleSaved = () => {
  editingHookId.value = null
  isAddingNew.value = false
}

const handleCancelEdit = () => {
  editingHookId.value = null
  isAddingNew.value = false
}

const handleApplyPreset = (preset) => {
  applyPreset(preset)
  showPresetMenu.value = false
}
</script>

<template>
  <div class="settings-section">
    <h3 class="section-title">
      <Icon icon="lucide:webhook" width="18" height="18" />
      <span>钩子规则</span>
    </h3>

    <!-- 操作栏 -->
    <div class="hook-toolbar">
      <button class="action-btn primary" @click="handleAddNew">
        <Icon icon="lucide:plus" width="16" height="16" />
        添加钩子
      </button>
      <div class="preset-dropdown">
        <button class="action-btn" @click="showPresetMenu = !showPresetMenu">
          <Icon icon="lucide:clipboard-list" width="16" height="16" />
          导入预设
          <Icon icon="lucide:chevron-down" width="14" height="14" />
        </button>
        <div v-if="showPresetMenu" class="preset-menu">
          <button
            v-for="preset in presets"
            :key="preset.name"
            class="preset-item"
            @click="handleApplyPreset(preset)"
          >
            <span class="preset-name">{{ preset.name }}</span>
            <span class="preset-desc">{{ preset.description }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 新增编辑器 -->
    <CoyoteHookEditor
      v-if="isAddingNew"
      :hook="null"
      @save="handleSaved"
      @cancel="handleCancelEdit"
    />

    <!-- 钩子列表 -->
    <div v-if="hooks.length > 0" class="hook-list">
      <div v-for="hook in hooks" :key="hook.id" class="hook-card">
        <div class="hook-header">
          <span class="hook-name">{{ hook.name || '未命名钩子' }}</span>
          <label class="toggle">
            <input type="checkbox" :checked="hook.enabled" @change="handleToggle(hook)" />
            <span class="toggle-slider" />
          </label>
        </div>
        <p class="hook-summary">{{ getHookSummary(hook) }}</p>
        <div class="hook-actions">
          <button class="small-btn" @click="handleEdit(hook.id)">
            <Icon icon="lucide:pencil" width="14" height="14" />
            编辑
          </button>
          <button
            class="small-btn"
            :disabled="!isBound"
            :title="!isBound ? '请先连接设备' : ''"
            @click="handleTest(hook)"
          >
            <Icon icon="lucide:flask-conical" width="14" height="14" />
            测试
          </button>
          <button class="small-btn danger" @click="handleDelete(hook.id)">
            <Icon icon="lucide:trash-2" width="14" height="14" />
            删除
          </button>
        </div>

        <!-- 内联编辑器 -->
        <CoyoteHookEditor
          v-if="editingHookId === hook.id"
          :hook="hook"
          @save="handleSaved"
          @cancel="handleCancelEdit"
        />
      </div>
    </div>

    <!-- 空列表 -->
    <div v-else-if="!isAddingNew" class="empty-state">
      <Icon icon="lucide:webhook" width="32" height="32" />
      <p>暂无钩子，点击添加或导入预设</p>
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

.hook-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.preset-dropdown {
  position: relative;
}

.preset-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: rgba(30, 35, 40, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  min-width: 220px;
  z-index: 10;
  overflow: hidden;
}

.preset-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
}

.preset-item:hover {
  background: rgba(57, 197, 187, 0.15);
}

.preset-name {
  font-size: 0.85rem;
  font-weight: 500;
}

.preset-desc {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.hook-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hook-card {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.hook-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.hook-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.hook-summary {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 8px;
}

.hook-actions {
  display: flex;
  gap: 6px;
}

.small-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.small-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.small-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.small-btn.danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.85rem;
}

/* Toggle */
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

/* Action buttons */
.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.action-btn.primary {
  background: rgba(57, 197, 187, 0.15);
  border-color: rgba(57, 197, 187, 0.3);
  color: #39c5bb;
}

.action-btn.primary:hover {
  background: rgba(57, 197, 187, 0.25);
}
</style>
