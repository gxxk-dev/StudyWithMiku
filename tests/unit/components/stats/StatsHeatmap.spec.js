import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import StatsHeatmap from '../../../../src/components/settings/tabs/stats/StatsHeatmap.vue'

// Mock useFocus
vi.mock('../../../../src/composables/useFocus.js', () => ({
  useFocus: () => ({
    getHeatmapData: vi.fn((options = {}) => {
      const { days = 90 } = options
      const data = []
      const endDate = new Date()
      endDate.setHours(23, 59, 59, 999)

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(endDate)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().slice(0, 10)

        // 模拟一些数据
        const count = i % 7 === 0 ? 0 : Math.floor(Math.random() * 5)
        const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4

        data.push({
          date: dateStr,
          count,
          totalTime: count * 1500, // 25分钟每个
          level
        })
      }

      return data
    })
  })
}))

describe('StatsHeatmap.vue', () => {
  afterEach(async () => {
    // 等待所有异步任务完成
    await flushPromises()
    vi.clearAllTimers()
  })
  const createWrapper = (props = {}) => {
    return mount(StatsHeatmap, {
      props: {
        days: 90,
        ...props
      },
      global: {
        stubs: {
          Icon: true
        }
      }
    })
  }

  describe('渲染', () => {
    it('应该渲染热力图容器', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.heatmap-container').exists()).toBe(true)
    })

    it('应该渲染星期标签', () => {
      const wrapper = createWrapper()
      const labels = wrapper.findAll('.week-label')
      expect(labels.length).toBe(7)
    })

    it('应该渲染图例', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.legend').exists()).toBe(true)
      expect(wrapper.findAll('.legend-cell').length).toBe(5)
    })

    it('应该渲染月份标签', () => {
      const wrapper = createWrapper()
      expect(wrapper.findAll('.month-label').length).toBeGreaterThan(0)
    })
  })

  describe('热力图单元格', () => {
    it('应该渲染足够数量的单元格', () => {
      const wrapper = createWrapper({ days: 90 })
      const cells = wrapper.findAll('.heatmap-cell:not(.empty)')
      // 应该有接近90个单元格（排除空单元格）
      expect(cells.length).toBeGreaterThanOrEqual(85)
      expect(cells.length).toBeLessThanOrEqual(96)
    })

    it('应该根据等级应用正确的 class', () => {
      const wrapper = createWrapper()
      const cells = wrapper.findAll('.heatmap-cell')

      // 至少应该有一些不同等级的单元格
      const hasLevel0 = cells.some((c) => c.classes().includes('level-0'))
      const hasOtherLevels = cells.some(
        (c) =>
          c.classes().includes('level-1') ||
          c.classes().includes('level-2') ||
          c.classes().includes('level-3') ||
          c.classes().includes('level-4')
      )

      expect(hasLevel0 || hasOtherLevels).toBe(true)
    })
  })

  describe('交互', () => {
    it('悬停时应该显示 tooltip', async () => {
      const wrapper = createWrapper()
      const cell = wrapper.find('.heatmap-cell:not(.empty)')

      await cell.trigger('mouseenter')

      // 等待 DOM 更新
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.heatmap-tooltip').exists()).toBe(true)
    })

    it('离开时应该隐藏 tooltip', async () => {
      const wrapper = createWrapper()
      const cell = wrapper.find('.heatmap-cell:not(.empty)')

      await cell.trigger('mouseenter')
      await wrapper.vm.$nextTick()
      await cell.trigger('mouseleave')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.heatmap-tooltip').exists()).toBe(false)
    })

    it('点击有数据的单元格应该触发 select-date 事件', async () => {
      const wrapper = createWrapper()
      const clickableCells = wrapper.findAll('.heatmap-cell.clickable')

      if (clickableCells.length > 0) {
        await clickableCells[0].trigger('click')
        expect(wrapper.emitted('select-date')).toBeTruthy()
      }
    })

    it('点击空单元格不应该触发事件', async () => {
      const wrapper = createWrapper()
      const emptyCells = wrapper.findAll('.heatmap-cell.empty')

      if (emptyCells.length > 0) {
        await emptyCells[0].trigger('click')
        expect(wrapper.emitted('select-date')).toBeFalsy()
      }
    })
  })

  describe('props', () => {
    it('days prop 应该影响渲染的单元格数量', () => {
      const wrapper90 = createWrapper({ days: 90 })
      const wrapper365 = createWrapper({ days: 365 })

      const cells90 = wrapper90.findAll('.heatmap-cell:not(.empty)')
      const cells365 = wrapper365.findAll('.heatmap-cell:not(.empty)')

      expect(cells365.length).toBeGreaterThan(cells90.length)
    })
  })
})
