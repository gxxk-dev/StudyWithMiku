import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import StatsCards from '../../../../src/components/settings/tabs/stats/StatsCards.vue'

// Mock @iconify/vue 防止模块内部异步操作引发未处理异常
vi.mock('@iconify/vue', () => ({
  Icon: { template: '<span />' }
}))

// Mock useFocus
vi.mock('../../../../src/composables/useFocus.js', () => ({
  useFocus: () => ({
    todayStats: {
      value: {
        completedSessions: 5,
        totalFocusTime: 7500, // 2h 5m
        completionRate: 83.3,
        averageFocusTime: 1500, // 25m
        totalBreakTime: 900
      }
    },
    weekStats: {
      value: {
        completedSessions: 20,
        totalFocusTime: 30000, // 8h 20m
        completionRate: 90,
        averageFocusTime: 1500
      }
    },
    monthStats: {
      value: {
        completedSessions: 80,
        totalFocusTime: 120000, // 33h 20m
        completionRate: 85,
        averageFocusTime: 1500
      }
    },
    allTimeStats: {
      value: {
        completedSessions: 250,
        totalFocusTime: 375000, // 104h 10m
        completionRate: 88,
        averageFocusTime: 1500,
        longestStreak: 15
      }
    }
  })
}))

describe('StatsCards.vue', () => {
  afterEach(async () => {
    // 等待所有异步任务完成以避免 iconify 的异步问题
    await flushPromises()
    vi.clearAllTimers()
  })
  const createWrapper = () => {
    return mount(StatsCards, {
      global: {
        stubs: {
          Icon: true
        }
      }
    })
  }

  describe('渲染', () => {
    it('应该渲染四个数据卡片', () => {
      const wrapper = createWrapper()
      const cards = wrapper.findAll('.stat-card')
      expect(cards.length).toBe(4)
    })

    it('应该显示正确的卡片标签', () => {
      const wrapper = createWrapper()
      const labels = wrapper.findAll('.card-label')

      expect(labels[0].text()).toBe('今日')
      expect(labels[1].text()).toBe('本周')
      expect(labels[2].text()).toBe('本月')
      expect(labels[3].text()).toBe('总计')
    })
  })

  describe('数据显示', () => {
    it('应该显示专注次数', () => {
      const wrapper = createWrapper()
      const html = wrapper.html()

      expect(html).toContain('5') // 今日
      expect(html).toContain('20') // 本周
      expect(html).toContain('80') // 本月
      expect(html).toContain('250') // 总计
    })

    it('应该正确格式化时长', () => {
      const wrapper = createWrapper()
      const html = wrapper.html()

      // 今日: 7500s = 2h 5m
      expect(html).toContain('2h 5m')
    })

    it('应该显示完成率', () => {
      const wrapper = createWrapper()
      const html = wrapper.html()

      expect(html).toContain('83.3%')
      expect(html).toContain('90%')
      expect(html).toContain('85%')
      expect(html).toContain('88%')
    })

    it('总计卡片应该显示最长连击', () => {
      const wrapper = createWrapper()
      const cards = wrapper.findAll('.stat-card')
      const totalCard = cards[3] // 总计是第四个卡片
      const extraMetric = totalCard.find('.metric.extra')

      expect(extraMetric.exists()).toBe(true)
      expect(extraMetric.text()).toContain('15')
      expect(extraMetric.text()).toContain('最长连击')
    })
  })

  describe('时间格式化', () => {
    it('小于1小时应该只显示分钟', () => {
      const wrapper = createWrapper()
      const html = wrapper.html()

      // averageFocusTime = 1500s = 25m
      expect(html).toContain('25m')
    })

    it('大于1小时应该显示小时和分钟', () => {
      const wrapper = createWrapper()
      const html = wrapper.html()

      // 2h 5m
      expect(html).toContain('2h 5m')
    })
  })

  describe('样式', () => {
    it('每个卡片应该有正确的主题色', () => {
      const wrapper = createWrapper()
      const cards = wrapper.findAll('.stat-card')

      // 检查 CSS 变量是否设置
      expect(cards[0].attributes('style')).toContain('--card-color')
      expect(cards[1].attributes('style')).toContain('--card-color')
      expect(cards[2].attributes('style')).toContain('--card-color')
      expect(cards[3].attributes('style')).toContain('--card-color')
    })
  })
})
