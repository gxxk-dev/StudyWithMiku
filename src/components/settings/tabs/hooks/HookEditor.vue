<script setup>
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { TRIGGER_GROUPS, HookTrigger } from '../../../../composables/hooks/constants.js'
import { providerRegistry } from '../../../../composables/hooks/providerRegistry.js'
import CoyoteWaveformUpload from '../coyote/CoyoteWaveformUpload.vue'

const props = defineProps({
  hook: { type: Object, default: null },
  isEdit: { type: Boolean, default: false }
})

const emit = defineEmits(['save', 'cancel'])

const name = ref(props.hook?.name || '')
const provider = ref(props.hook?.provider || 'notification')
const trigger = ref(props.hook?.trigger || HookTrigger.FOCUS_COMPLETED)
const tickInterval = ref(props.hook?.tickInterval || 300)
const actionType = ref(props.hook?.action?.type || '')
const actionParams = ref({ ...props.hook?.action } || {})

// 可用 providers
const availableProviders = computed(() => providerRegistry.getAll())

// 当前 provider 的 action 列表
const currentProviderActions = computed(() => {
  const p = providerRegistry.get(provider.value)
  return p?.actions || []
})

// 是否是 tick 类型触发器
const isTickTrigger = computed(
  () => trigger.value === HookTrigger.FOCUS_TICK || trigger.value === HookTrigger.BREAK_TICK
)

// 当前 action 的参数声明
const currentActionParams = computed(() => {
  const act = currentProviderActions.value.find((a) => a.type === actionType.value)
  return act?.params || []
})

// provider 变化时重置 action
watch(provider, () => {
  const actions = currentProviderActions.value
  actionType.value = actions.length > 0 ? actions[0].type : ''
  resetParams()
})

// action 变化时重置参数
watch(actionType, () => {
  resetParams()
})

const resetParams = () => {
  const params = {}
  currentActionParams.value.forEach((p) => {
    params[p.key] = actionParams.value[p.key] ?? p.default
  })
  actionParams.value = params
}

// 初始化时设置 actionType
if (!actionType.value && currentProviderActions.value.length > 0) {
  actionType.value = currentProviderActions.value[0].type
}

const handleSave = () => {
  const hook = {
    name: name.value || '未命名钩子',
    provider: provider.value,
    trigger: trigger.value,
    tickInterval: isTickTrigger.value ? tickInterval.value : 0,
    action: { type: actionType.value, ...actionParams.value }
  }
  emit('save', hook)
}
</script>

<template>
  <div class="hook-editor">
    <h4 class="editor-title">{{ isEdit ? '编辑钩子' : '新建钩子' }}</h4>

    <!-- 名称 -->
    <div class="form-group">
      <label class="form-label">名称</label>
      <input v-model="name" type="text" class="form-input" placeholder="钩子名称" />
    </div>

    <!-- Provider -->
    <div class="form-group">
      <label class="form-label">Provider</label>
      <select v-model="provider" class="form-select">
        <option v-for="p in availableProviders" :key="p.id" :value="p.id">
          {{ p.name }}
        </option>
      </select>
    </div>

    <!-- 触发事件 -->
    <div class="form-group">
      <label class="form-label">触发事件</label>
      <select v-model="trigger" class="form-select">
        <optgroup v-for="group in TRIGGER_GROUPS" :key="group.label" :label="group.label">
          <option v-for="t in group.triggers" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </optgroup>
      </select>
    </div>

    <!-- Tick 间隔 -->
    <div v-if="isTickTrigger" class="form-group">
      <label class="form-label">间隔（秒）</label>
      <input v-model.number="tickInterval" type="number" class="form-input" min="1" max="86400" />
    </div>

    <!-- Action 类型 -->
    <div v-if="currentProviderActions.length > 1" class="form-group">
      <label class="form-label">动作类型</label>
      <select v-model="actionType" class="form-select">
        <option v-for="act in currentProviderActions" :key="act.type" :value="act.type">
          {{ act.name }}
        </option>
      </select>
    </div>

    <!-- 动态参数 -->
    <div v-for="param in currentActionParams" :key="param.key" class="form-group">
      <label class="form-label">{{ param.label }}</label>

      <!-- Select -->
      <select v-if="param.type === 'select'" v-model="actionParams[param.key]" class="form-select">
        <option v-for="opt in param.options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <!-- Number -->
      <input
        v-else-if="param.type === 'number'"
        v-model.number="actionParams[param.key]"
        type="number"
        class="form-input"
        :min="param.min"
        :max="param.max"
        :step="param.step || 1"
      />

      <!-- Patterns (waveform upload) -->
      <CoyoteWaveformUpload
        v-else-if="param.type === 'patterns'"
        :patterns="actionParams[param.key] || []"
        @update:patterns="actionParams[param.key] = $event"
      />

      <!-- String -->
      <input
        v-else
        v-model="actionParams[param.key]"
        type="text"
        class="form-input"
        :placeholder="param.label"
      />
    </div>

    <!-- 按钮 -->
    <div class="editor-buttons">
      <button class="action-btn primary" @click="handleSave">
        <Icon icon="lucide:check" width="16" height="16" />
        <span>保存</span>
      </button>
      <button class="action-btn" @click="$emit('cancel')">
        <span>取消</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.hook-editor {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  margin-bottom: 16px;
}

.editor-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 16px;
}

.form-group {
  margin-bottom: 12px;
}

.form-label {
  display: block;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus {
  border-color: rgba(57, 197, 187, 0.5);
}

.form-select {
  appearance: auto;
}

.form-select option,
.form-select optgroup {
  background: #2a2f35;
  color: rgba(255, 255, 255, 0.9);
}

.editor-buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
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
