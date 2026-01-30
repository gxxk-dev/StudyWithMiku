import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useHitokoto, HitokotoCategory } from '../../../src/composables/useHitokoto.js'

describe('useHitokoto.js', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('初始状态', () => {
    it('初始化时 hitokoto 应该为 null', () => {
      const { hitokoto, loading, error } = useHitokoto()

      expect(hitokoto.value).toBeNull()
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })
  })

  describe('fetchHitokoto', () => {
    it('成功获取一言', async () => {
      const mockResponse = {
        hitokoto: '测试一言内容',
        from: '测试来源',
        creator: '测试作者',
        type: 'a'
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const { hitokoto, loading, error, fetchHitokoto } = useHitokoto()

      await fetchHitokoto()

      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(hitokoto.value).toEqual({
        text: '测试一言内容',
        from: '测试来源',
        creator: '测试作者',
        type: 'a'
      })
    })

    it('使用 from_who 作为来源', async () => {
      const mockResponse = {
        hitokoto: '测试内容',
        from_who: '测试人物'
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const { hitokoto, fetchHitokoto } = useHitokoto()

      await fetchHitokoto()

      expect(hitokoto.value.from).toBe('测试人物')
    })

    it('无来源时使用默认值', async () => {
      const mockResponse = {
        hitokoto: '测试内容'
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const { hitokoto, fetchHitokoto } = useHitokoto()

      await fetchHitokoto()

      expect(hitokoto.value.from).toBe('未知来源')
    })

    it('处理网络错误并使用降级语句', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const { hitokoto, error, fetchHitokoto } = useHitokoto()

      await fetchHitokoto()

      expect(error.value).toBe('Network error')
      expect(hitokoto.value).toEqual({
        text: '学习的道路永无止境，坚持就是胜利！',
        from: 'Study with Miku'
      })
    })

    it('处理 HTTP 错误', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      })

      const { hitokoto, error, fetchHitokoto } = useHitokoto()

      await fetchHitokoto()

      expect(error.value).toBe('HTTP error: 500')
      expect(hitokoto.value).not.toBeNull()
    })

    it('支持单个类别参数', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ hitokoto: 'test' })
      })

      const { fetchHitokoto } = useHitokoto()

      await fetchHitokoto(HitokotoCategory.ANIMATION)

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('?c=a'), expect.any(Object))
    })

    it('支持多个类别参数', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ hitokoto: 'test' })
      })

      const { fetchHitokoto } = useHitokoto()

      await fetchHitokoto([HitokotoCategory.ANIMATION, HitokotoCategory.PHILOSOPHY])

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('?c=a&c=k'),
        expect.any(Object)
      )
    })

    it('loading 状态正确切换', async () => {
      let resolvePromise
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      global.fetch = vi.fn().mockReturnValue(promise)

      const { loading, fetchHitokoto } = useHitokoto()

      expect(loading.value).toBe(false)

      const fetchPromise = fetchHitokoto()

      expect(loading.value).toBe(true)

      resolvePromise({
        ok: true,
        json: () => Promise.resolve({ hitokoto: 'test' })
      })

      await fetchPromise

      expect(loading.value).toBe(false)
    })
  })

  describe('refresh', () => {
    it('refresh 方法应该重新获取一言', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ hitokoto: 'test' })
      })

      const { refresh } = useHitokoto()

      await refresh()

      expect(global.fetch).toHaveBeenCalled()
    })

    it('refresh 可以传入类别参数', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ hitokoto: 'test' })
      })

      const { refresh } = useHitokoto()

      await refresh(HitokotoCategory.GAME)

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('?c=c'), expect.any(Object))
    })
  })

  describe('HitokotoCategory', () => {
    it('应该导出所有类别', () => {
      expect(HitokotoCategory.ANIMATION).toBe('a')
      expect(HitokotoCategory.COMIC).toBe('b')
      expect(HitokotoCategory.GAME).toBe('c')
      expect(HitokotoCategory.LITERATURE).toBe('d')
      expect(HitokotoCategory.ORIGINAL).toBe('e')
      expect(HitokotoCategory.INTERNET).toBe('f')
      expect(HitokotoCategory.OTHER).toBe('g')
      expect(HitokotoCategory.FILM).toBe('h')
      expect(HitokotoCategory.POETRY).toBe('i')
      expect(HitokotoCategory.NETEASE).toBe('j')
      expect(HitokotoCategory.PHILOSOPHY).toBe('k')
      expect(HitokotoCategory.WITTY).toBe('l')
    })
  })
})
