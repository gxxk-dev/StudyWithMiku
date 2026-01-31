<script setup>
/**
 * 分享卡片 - 配置面板组件
 * 允许用户选择要展示的内容模块
 */

import { Icon } from '@iconify/vue'
import { HitokotoCategory } from '../../../../../composables/useHitokoto.js'

const config = defineModel({ type: Object, required: true })

const emit = defineEmits(['refresh-hitokoto', 'save'])

/**
 * 一言种类选项
 */
const hitokotoCategoryOptions = [
  { value: HitokotoCategory.ANIMATION, label: '动画' },
  { value: HitokotoCategory.COMIC, label: '漫画' },
  { value: HitokotoCategory.GAME, label: '游戏' },
  { value: HitokotoCategory.LITERATURE, label: '文学' },
  { value: HitokotoCategory.ORIGINAL, label: '原创' },
  { value: HitokotoCategory.FILM, label: '影视' },
  { value: HitokotoCategory.POETRY, label: '诗词' },
  { value: HitokotoCategory.PHILOSOPHY, label: '哲学' },
  { value: HitokotoCategory.WITTY, label: '抖机灵' }
]

/**
 * 切换一言种类
 */
const toggleCategory = (value) => {
  const idx = config.value.hitokotoCategories.indexOf(value)
  if (idx === -1) {
    config.value.hitokotoCategories.push(value)
  } else if (config.value.hitokotoCategories.length > 1) {
    // 至少保留一个种类
    config.value.hitokotoCategories.splice(idx, 1)
  }
}

/**
 * 检查种类是否选中
 */
const isCategorySelected = (value) => {
  return config.value.hitokotoCategories?.includes(value)
}
</script>

<template>
  <div class="config-panel">
    <div class="config-section">
      <h4 class="config-title">选择内容</h4>

      <label class="config-checkbox">
        <input v-model="config.modules.basicStats" type="checkbox" />
        <span class="checkbox-label">基础统计</span>
        <span class="checkbox-desc">总专注、时长、完成率、连击</span>
      </label>

      <label class="config-checkbox">
        <input v-model="config.modules.miniHeatmap" type="checkbox" />
        <span class="checkbox-label">迷你热力图</span>
        <span class="checkbox-desc">近30天活动图</span>
      </label>

      <label class="config-checkbox">
        <input v-model="config.modules.trendChart" type="checkbox" />
        <span class="checkbox-label">趋势图</span>
        <span class="checkbox-desc">近30天折线图</span>
      </label>

      <label class="config-checkbox">
        <input v-model="config.showHitokoto" type="checkbox" />
        <span class="checkbox-label">一言</span>
        <span class="checkbox-desc">随机励志语句</span>
      </label>

      <!-- 一言种类选择 -->
      <div v-if="config.showHitokoto" class="category-selector">
        <span class="category-label">种类：</span>
        <div class="category-tags">
          <button
            v-for="opt in hitokotoCategoryOptions"
            :key="opt.value"
            class="category-tag"
            :class="{ active: isCategorySelected(opt.value) }"
            @click="toggleCategory(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="config-actions">
      <button
        v-if="config.showHitokoto"
        class="action-btn secondary"
        @click="emit('refresh-hitokoto')"
      >
        <Icon icon="mdi:refresh" width="18" height="18" />
        <span>换一言</span>
      </button>
      <button class="action-btn primary" @click="emit('save')">
        <Icon icon="mdi:download" width="18" height="18" />
        <span>保存图片</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
$color-miku: #39c5bb;

.config-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 200px;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.config-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 4px 0;
}

.config-checkbox {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  input[type='checkbox'] {
    display: none;
  }

  input[type='checkbox']:checked + .checkbox-label::before {
    background: $color-miku;
    border-color: $color-miku;
  }

  input[type='checkbox']:checked + .checkbox-label::after {
    opacity: 1;
  }
}

.checkbox-label {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);

  &::before {
    content: '';
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    background: transparent;
    transition: all 0.2s ease;
  }

  &::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 50%;
    width: 8px;
    height: 4px;
    border-left: 2px solid white;
    border-bottom: 2px solid white;
    transform: translateY(-70%) rotate(-45deg);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
}

.checkbox-desc {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 24px;
}

.category-selector {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.category-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
  display: block;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-tag {
  padding: 4px 8px;
  font-size: 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.8);
  }

  &.active {
    background: $color-miku;
    border-color: $color-miku;
    color: white;
  }
}

.config-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &.primary {
    background: $color-miku;
    color: white;

    &:hover:not(:disabled) {
      background: #2da8a0;
      transform: translateY(-2px);
    }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.2);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
