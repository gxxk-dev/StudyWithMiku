<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useHooks } from '../../../../composables/hooks/useHooks.js'
import { TRIGGER_GROUPS } from '../../../../composables/hooks/constants.js'
import { GENERAL_PRESETS, ESTIM_PRESETS } from '../../../../composables/hooks/presets.js'
import { providerRegistry } from '../../../../composables/hooks/providerRegistry.js'
import HookEditor from './HookEditor.vue'

const { hooks, addHook, updateHook, removeHook, applyPreset } = useHooks()

const showEditor = ref(false)
const editingHook = ref(null)
const showPresets = ref(false)

// 触发器名称映射
const triggerNameMap = {}
TRIGGER_GROUPS.forEach((group) => {
  group.triggers.forEach((t) => {
    triggerNameMap[t.value] = t.label
  })
})

// Provider 名称映射
const providerNameMap = computed(() => {
  const map = {}
  providerRegistry.getAll().forEach((p) => {
    map[p.id] = p.name
  })
  return map
})

// 可用预设（根据已注册的 providers）
const availablePresets = computed(() => {
  const presets = [...GENERAL_PRESETS]
  if (providerRegistry.has('estim')) {
    presets.push(...ESTIM_PRESETS)
  }
  return presets
})

const handleToggle = (hook) => {
  updateHook(hook.id, { enabled: !hook.enabled })
}

const handleEdit = (hook) => {
  editingHook.value = hook
  showEditor.value = true
}

const handleNewHook = () => {
  editingHook.value = null
  showEditor.value = true
}

const handleSave = (hookData) => {
  if (editingHook.value) {
    updateHook(editingHook.value.id, hookData)
  } else {
    addHook(hookData)
  }
  showEditor.value = false
  editingHook.value = null
}

const handleCancel = () => {
  showEditor.value = false
  editingHook.value = null
}

const handleDelete = (hook) => {
  if (hook.builtIn) return
  removeHook(hook.id)
}

const handleApplyPreset = (preset) => {
  applyPreset(preset)
  showPresets.value = false
}

const getTriggerName = (trigger) => triggerNameMap[trigger] || trigger
const getProviderName = (providerId) => providerNameMap.value[providerId] || providerId
</script>

<template>
  <div class="hook-list-section">
    <!-- 编辑器 -->
    <HookEditor
      v-if="showEditor"
      :hook="editingHook"
      :is-edit="!!editingHook"
      @save="handleSave"
      @cancel="handleCancel"
    />

    <!-- 钩子列表 -->
    <div v-if="hooks.length > 0" class="hooks-list">
      <div
        v-for="hook in hooks"
        :key="hook.id"
        class="hook-card"
        :class="{ disabled: !hook.enabled }"
      >
        <div class="hook-main">
          <label class="toggle mini">
            <input type="checkbox" :checked="hook.enabled" @change="handleToggle(hook)" />
            <span class="toggle-slider" />
          </label>
          <div class="hook-info">
            <span class="hook-name">{{ hook.name }}</span>
            <span class="hook-summary">
              <span class="badge provider">{{ getProviderName(hook.provider) }}</span>
              <span class="badge trigger">{{ getTriggerName(hook.trigger) }}</span>
              <span v-if="hook.tickInterval > 0" class="badge interval">
                每 {{ hook.tickInterval }}s
              </span>
            </span>
          </div>
          <div class="hook-actions">
            <button class="icon-btn" title="编辑" @click="handleEdit(hook)">
              <Icon icon="lucide:pencil" width="14" height="14" />
            </button>
            <button
              v-if="!hook.builtIn"
              class="icon-btn danger"
              title="删除"
              @click="handleDelete(hook)"
            >
              <Icon icon="lucide:trash-2" width="14" height="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <Icon icon="lucide:webhook" width="32" height="32" />
      <p>暂无钩子</p>
    </div>

    <!-- 操作按钮 -->
    <div v-if="!showEditor" class="list-actions">
      <button class="action-btn primary" @click="handleNewHook">
        <Icon icon="lucide:plus" width="16" height="16" />
        <span>添加钩子</span>
      </button>
      <button class="action-btn" @click="showPresets = !showPresets">
        <Icon icon="lucide:package" width="16" height="16" />
        <span>预设</span>
      </button>
    </div>

    <!-- 预设面板 -->
    <div v-if="showPresets" class="presets-panel">
      <div
        v-for="preset in availablePresets"
        :key="preset.name"
        class="preset-card"
        @click="handleApplyPreset(preset)"
      >
        <span class="preset-name">{{ preset.name }}</span>
        <span class="preset-desc">{{ preset.description }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hook-list-section {
  margin-top: 4px;
}

.hooks-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.hook-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.hook-card.disabled {
  opacity: 0.5;
}

.hook-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hook-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.hook-name {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hook-summary {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.badge {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.badge.provider {
  background: rgba(57, 197, 187, 0.15);
  color: #39c5bb;
}

.badge.trigger {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.badge.interval {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.hook-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
}

.icon-btn.danger:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* Toggle mini */
.toggle.mini {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.toggle.mini input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle.mini .toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  transition: background 0.2s ease;
}

.toggle.mini .toggle-slider::before {
  content: '';
  position: absolute;
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.toggle.mini input:checked + .toggle-slider {
  background: #39c5bb;
}

.toggle.mini input:checked + .toggle-slider::before {
  transform: translateX(16px);
  background: #fff;
}

/* Actions */
.list-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
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

.action-btn.primary {
  background: rgba(57, 197, 187, 0.15);
  border-color: rgba(57, 197, 187, 0.3);
  color: #39c5bb;
}

.action-btn.primary:hover {
  background: rgba(57, 197, 187, 0.25);
}

/* Empty */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.85rem;
}

/* Presets */
.presets-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.preset-card:hover {
  background: rgba(57, 197, 187, 0.1);
}

.preset-name {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
}

.preset-desc {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}
</style>
