<script setup>
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useCoyote } from '../../../../composables/useCoyote.js'
import { HookTrigger, HookActionType } from '../../../../composables/coyote/constants.js'
import CoyoteWaveformUpload from './CoyoteWaveformUpload.vue'

const props = defineProps({
  hook: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['save', 'cancel'])

const { addHook, updateHook } = useCoyote()

const isEditing = computed(() => !!props.hook)

// 表单状态
const name = ref('')
const trigger = ref(HookTrigger.FOCUS_PAUSE)
const tickInterval = ref(300)
const actionType = ref(HookActionType.PULSE)
const channel = ref('A')
const value = ref(50)
const patterns = ref([])
const durationMs = ref(3000)
const audioFileId = ref('')

// 初始化表单
const initForm = () => {
  if (props.hook) {
    name.value = props.hook.name || ''
    trigger.value = props.hook.trigger || HookTrigger.FOCUS_PAUSE
    tickInterval.value = props.hook.tickInterval || 300
    actionType.value = props.hook.action?.type || HookActionType.PULSE
    channel.value = props.hook.action?.channel || 'A'
    value.value = props.hook.action?.value ?? 50
    patterns.value = props.hook.action?.patterns || []
    durationMs.value = props.hook.action?.durationMs || 3000
    audioFileId.value = props.hook.action?.audioFileId || ''
  }
}

watch(() => props.hook, initForm, { immediate: true })

const isTick = computed(
  () => trigger.value === HookTrigger.FOCUS_TICK || trigger.value === HookTrigger.BREAK_TICK
)

const isPulse = computed(() => actionType.value === HookActionType.PULSE)
const isStrengthAction = computed(
  () =>
    actionType.value === HookActionType.STRENGTH_SET ||
    actionType.value === HookActionType.STRENGTH_INCREASE ||
    actionType.value === HookActionType.STRENGTH_DECREASE
)

const triggerGroups = [
  {
    label: '状态转换',
    options: [
      { value: HookTrigger.FOCUS_START, label: '专注开始' },
      { value: HookTrigger.FOCUS_PAUSE, label: '专注暂停' },
      { value: HookTrigger.FOCUS_RESUME, label: '专注恢复' },
      { value: HookTrigger.BREAK_START, label: '休息开始' }
    ]
  },
  {
    label: '完成事件',
    options: [
      { value: HookTrigger.FOCUS_COMPLETED, label: '专注完成' },
      { value: HookTrigger.FOCUS_CANCELLED, label: '专注取消' },
      { value: HookTrigger.FOCUS_SKIPPED, label: '专注跳过' },
      { value: HookTrigger.BREAK_COMPLETED, label: '休息完成' },
      { value: HookTrigger.BREAK_CANCELLED, label: '休息取消' },
      { value: HookTrigger.BREAK_SKIPPED, label: '休息跳过' }
    ]
  },
  {
    label: '周期',
    options: [
      { value: HookTrigger.FOCUS_TICK, label: '专注定时' },
      { value: HookTrigger.BREAK_TICK, label: '休息定时' }
    ]
  }
]

const actionTypes = [
  { value: HookActionType.PULSE, label: '脉冲' },
  { value: HookActionType.STRENGTH_SET, label: '设置强度' },
  { value: HookActionType.STRENGTH_INCREASE, label: '增加强度' },
  { value: HookActionType.STRENGTH_DECREASE, label: '减少强度' },
  { value: HookActionType.CLEAR, label: '清除' }
]

const handleWaveformLoaded = (data) => {
  patterns.value = data.patterns
  durationMs.value = data.durationMs
  audioFileId.value = data.audioFileId || ''
}

const handleSave = () => {
  const hookData = {
    name: name.value || '未命名钩子',
    trigger: trigger.value,
    ...(isTick.value && { tickInterval: tickInterval.value }),
    action: {
      type: actionType.value,
      channel: channel.value,
      ...(isStrengthAction.value && { value: value.value }),
      ...(isPulse.value && {
        patterns: patterns.value,
        durationMs: durationMs.value,
        audioFileId: audioFileId.value
      })
    }
  }

  if (isEditing.value) {
    updateHook(props.hook.id, hookData)
  } else {
    addHook(hookData)
  }

  emit('save')
}
</script>

<template>
  <div class="hook-editor">
    <h4 class="editor-title">{{ isEditing ? '编辑钩子' : '新建钩子' }}</h4>

    <!-- 名称 -->
    <div class="editor-field">
      <label class="field-label">名称</label>
      <input v-model="name" type="text" class="text-input" placeholder="钩子名称" />
    </div>

    <!-- 触发条件 -->
    <div class="editor-section-label">触发条件</div>
    <div class="editor-field">
      <label class="field-label">事件</label>
      <select v-model="trigger" class="select-input">
        <optgroup v-for="group in triggerGroups" :key="group.label" :label="group.label">
          <option v-for="opt in group.options" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </optgroup>
      </select>
    </div>

    <div v-if="isTick" class="editor-field">
      <label class="field-label">间隔（秒）</label>
      <input v-model.number="tickInterval" type="number" class="number-input" min="1" max="3600" />
    </div>

    <!-- 执行动作 -->
    <div class="editor-section-label">执行动作</div>
    <div class="editor-field">
      <label class="field-label">类型</label>
      <select v-model="actionType" class="select-input">
        <option v-for="at in actionTypes" :key="at.value" :value="at.value">
          {{ at.label }}
        </option>
      </select>
    </div>

    <div class="editor-field">
      <label class="field-label">通道</label>
      <div class="radio-group">
        <label class="radio-label"> <input v-model="channel" type="radio" value="A" /> A </label>
        <label class="radio-label"> <input v-model="channel" type="radio" value="B" /> B </label>
        <label class="radio-label">
          <input v-model="channel" type="radio" value="both" /> 双通道
        </label>
      </div>
    </div>

    <div v-if="isStrengthAction" class="editor-field">
      <label class="field-label">强度值</label>
      <input v-model.number="value" type="number" class="number-input" min="0" max="200" />
    </div>

    <!-- 波形上传（脉冲类型） -->
    <CoyoteWaveformUpload
      v-if="isPulse"
      :audio-file-id="audioFileId"
      @loaded="handleWaveformLoaded"
    />

    <!-- 按钮 -->
    <div class="editor-buttons">
      <button class="action-btn primary" @click="handleSave">
        <Icon icon="lucide:check" width="16" height="16" />
        保存
      </button>
      <button class="action-btn" @click="$emit('cancel')">
        <Icon icon="lucide:x" width="16" height="16" />
        取消
      </button>
    </div>
  </div>
</template>

<style scoped>
.hook-editor {
  margin-top: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.editor-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 12px;
}

.editor-section-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  margin: 12px 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.editor-field {
  margin-bottom: 10px;
}

.field-label {
  display: block;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 4px;
}

.text-input,
.select-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
  outline: none;
  box-sizing: border-box;
}

.text-input:focus,
.select-input:focus {
  border-color: rgba(57, 197, 187, 0.5);
}

.select-input {
  cursor: pointer;
}

.select-input option,
.select-input optgroup {
  background: #1e2328;
  color: rgba(255, 255, 255, 0.9);
}

.number-input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: #39c5bb;
  font-size: 0.85rem;
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
}

.radio-group {
  display: flex;
  gap: 16px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
}

.radio-label input[type='radio'] {
  accent-color: #39c5bb;
}

.editor-buttons {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
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
