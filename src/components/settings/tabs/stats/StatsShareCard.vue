<script setup>
/**
 * 分享卡片主组件
 * 整合预览和配置面板，支持模块化内容选择
 * 手机端：卡片缩小 + 抽屉式配置面板
 */

import { ref, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useHitokoto, HitokotoCategory } from '../../../../composables/useHitokoto.js'
import { STORAGE_KEYS } from '../../../../config/constants.js'
import { safeLocalStorageGet, safeLocalStorageSet } from '../../../../utils/storage.js'
import ShareCardPreview from './share/ShareCardPreview.vue'
import ShareCardConfig from './share/ShareCardConfig.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  modules: {
    basicStats: true,
    miniHeatmap: true,
    trendChart: false
  },
  showHitokoto: true,
  hitokotoCategories: [HitokotoCategory.ANIMATION, HitokotoCategory.PHILOSOPHY]
}

/**
 * 加载保存的配置
 */
const loadConfig = () => {
  const saved = safeLocalStorageGet(STORAGE_KEYS.SHARE_CARD_CONFIG)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        modules: { ...DEFAULT_CONFIG.modules, ...parsed.modules },
        hitokotoCategories: parsed.hitokotoCategories || DEFAULT_CONFIG.hitokotoCategories
      }
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }
  return { ...DEFAULT_CONFIG }
}

/**
 * 配置状态
 */
const config = ref(loadConfig())

/**
 * 保存配置到 localStorage
 */
const saveConfig = () => {
  safeLocalStorageSet(STORAGE_KEYS.SHARE_CARD_CONFIG, JSON.stringify(config.value))
}

// 配置变化时保存
watch(config, saveConfig, { deep: true })

/**
 * 一言
 */
const {
  hitokoto,
  loading: hitokotoLoading,
  fetchHitokoto,
  refresh: refreshHitokoto
} = useHitokoto()

/**
 * 卡片引用
 */
const cardRef = ref(null)

/**
 * 保存状态
 */
const saving = ref(false)

/**
 * 手机端配置抽屉是否展开
 */
const drawerOpen = ref(false)

/**
 * 关闭弹窗
 */
const close = () => {
  drawerOpen.value = false
  emit('close')
}

/**
 * ESC 键关闭
 */
const onKeydown = (e) => {
  if (e.key === 'Escape') {
    close()
  }
}

/**
 * 刷新一言
 */
const handleRefreshHitokoto = () => {
  refreshHitokoto(config.value.hitokotoCategories)
}

/**
 * 保存为图片
 */
const saveAsImage = async () => {
  if (!cardRef.value || saving.value) return

  saving.value = true

  try {
    const { default: html2canvas } = await import('html2canvas')

    // 获取卡片预览组件的根元素
    const cardElement = cardRef.value.$el || cardRef.value

    const canvas = await html2canvas(cardElement, {
      backgroundColor: '#1a1f25',
      scale: 2,
      useCORS: true,
      logging: false
    })

    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    link.download = `study-with-miku-${date}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (err) {
    console.error('Failed to save image:', err)
  } finally {
    saving.value = false
  }
}

/**
 * 切换配置抽屉
 */
const toggleDrawer = () => {
  drawerOpen.value = !drawerOpen.value
}

// 打开时获取一言
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && !hitokoto.value) {
      fetchHitokoto(config.value.hitokotoCategories)
    }
    if (!isOpen) {
      drawerOpen.value = false
    }
  }
)

onMounted(() => {
  if (props.isOpen && !hitokoto.value) {
    fetchHitokoto(config.value.hitokotoCategories)
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="close" @keydown="onKeydown">
        <div class="share-modal-container">
          <!-- 关闭按钮 -->
          <button class="close-btn" @click="close">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>

          <div class="modal-content">
            <!-- 卡片预览 -->
            <div class="preview-section">
              <ShareCardPreview
                ref="cardRef"
                :config="config"
                :hitokoto="hitokoto"
                :hitokoto-loading="hitokotoLoading"
              />
            </div>

            <!-- 桌面端配置面板 -->
            <div class="config-section desktop-only">
              <ShareCardConfig
                v-model="config"
                :saving="saving"
                @refresh-hitokoto="handleRefreshHitokoto"
                @save="saveAsImage"
              />
            </div>
          </div>

          <!-- 手机端底部操作栏 -->
          <div class="mobile-actions">
            <button class="mobile-btn" @click="toggleDrawer">
              <Icon icon="mdi:cog" width="20" height="20" />
              <span>设置</span>
            </button>
            <button class="mobile-btn primary" :disabled="saving" @click="saveAsImage">
              <Icon icon="mdi:download" width="20" height="20" />
              <span>{{ saving ? '保存中...' : '保存图片' }}</span>
            </button>
          </div>

          <!-- 手机端配置抽屉 -->
          <Transition name="drawer-slide">
            <div v-if="drawerOpen" class="drawer-overlay" @click.self="drawerOpen = false">
              <div class="drawer-content">
                <div class="drawer-handle" />
                <ShareCardConfig
                  v-model="config"
                  :saving="saving"
                  @refresh-hitokoto="handleRefreshHitokoto"
                  @save="saveAsImage"
                />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
$color-miku: #39c5bb;

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.share-modal-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
}

.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  padding: 6px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
}

.modal-content {
  display: flex;
  gap: 24px;
  align-items: stretch;
}

.preview-section {
  flex-shrink: 0;
  transform: none; // 明确设置，确保媒体查询能正确覆盖
}

.config-section {
  display: flex;
  flex-direction: column;
  min-width: 220px;
  background: rgba(30, 35, 45, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
}

// 手机端底部操作栏（默认隐藏）
.mobile-actions {
  display: none;
}

// 手机端抽屉
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.drawer-content {
  width: 100%;
  max-width: 400px;
  max-height: 70vh;
  background: rgba(30, 35, 45, 0.98);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 12px 20px 24px;
  overflow-y: auto;
}

.drawer-handle {
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  margin: 0 auto 16px;
}

// 过渡动画
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;

  .share-modal-container {
    transform: scale(0.95);
  }
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: all 0.3s ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;

  .drawer-content {
    transform: translateY(100%);
  }
}

// 移动端横屏适配 (高度受限时触发)
@media (max-height: 500px) {
  .share-modal-container {
    width: 100%;
    height: 100%;
    justify-content: center;
    padding: 8px 16px;
  }

  .close-btn {
    position: fixed;
    top: 8px;
    right: 12px;
    z-index: 10;
  }

  .modal-content {
    flex-direction: row;
    align-items: stretch;
    gap: 12px;
    height: calc(100vh - 16px);
  }

  .preview-section {
    flex: 1;
    overflow: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 8px;
  }

  .config-section {
    flex-shrink: 0;
    width: 180px;
    overflow-y: auto;
    padding: 10px 12px;
  }

  .mobile-actions {
    display: none;
  }
}
</style>
