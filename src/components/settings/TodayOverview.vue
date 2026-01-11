<template>
  <div class="today-overview">
    <div class="overview-card">
      <div class="stat-item">
        <div class="stat-label">今日番茄钟</div>
        <div class="stat-value focus-color">- / -</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">连续天数</div>
        <div class="stat-value success-color">-</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">本周时长</div>
        <div class="stat-value info-color">-</div>
      </div>
      <button class="detail-icon" title="查看详情">
        <Icon icon="lucide:bar-chart-3" width="20" height="20" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
</script>

<style scoped lang="scss">
@use '../../styles/pomodoro.scss' as *;

.today-overview {
  margin-bottom: 1.5rem;
}

.overview-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  position: relative;
}

.stat-item {
  flex: 1;
  text-align: left;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.3rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;

  &.focus-color {
    color: $color-focus;
  }

  &.success-color {
    color: $color-success;
  }

  &.info-color {
    color: #2196F3;
  }
}

.detail-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.3);
  color: #2196F3;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(33, 150, 243, 0.2);
    border-color: rgba(33, 150, 243, 0.5);
    transform: translateY(-2px);
  }
}

// 横屏适配
@media (orientation: landscape) and (max-height: 500px) {
  .today-overview {
    margin-bottom: 0;
  }

  .overview-card {
    padding: 0.8rem;
    gap: 1rem;
  }

  .stat-label {
    font-size: 0.65rem;
    margin-bottom: 0.2rem;
  }

  .stat-value {
    font-size: 1rem;
  }

  .detail-icon {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  // 超小屏进一步缩小
  @media (max-width: 667px) {
    .overview-card {
      padding: 0.6rem;
      gap: 0.8rem;
    }

    .stat-label {
      font-size: 0.6rem;
    }

    .stat-value {
      font-size: 0.9rem;
    }

    .detail-icon {
      width: 28px;
      height: 28px;
      font-size: 0.9rem;
    }
  }
}
</style>
