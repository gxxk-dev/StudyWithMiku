/**
 * 头像工具测试
 */

import { describe, it, expect } from 'vitest'
import {
  sha256Hex,
  buildGravatarUrl,
  buildLibravatarUrl,
  buildQQAvatarUrl,
  resolveAvatars
} from '../../../../workers/utils/avatar.js'

describe('workers/utils/avatar', () => {
  describe('sha256Hex', () => {
    it('应该返回已知输入的正确哈希', async () => {
      // SHA-256 of empty string
      const hash = await sha256Hex('')
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    })

    it('应该返回 64 字符的十六进制字符串', async () => {
      const hash = await sha256Hex('test@example.com')
      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('buildGravatarUrl', () => {
    it('应该生成正确格式的 Gravatar URL', async () => {
      const url = await buildGravatarUrl('test@example.com')
      expect(url).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\/[0-9a-f]{64}\?d=404&s=80$/)
    })

    it('应该对 email 进行归一化（trim + lowercase）', async () => {
      const url1 = await buildGravatarUrl('Test@Example.com')
      const url2 = await buildGravatarUrl('  test@example.com  ')
      expect(url1).toBe(url2)
    })
  })

  describe('buildLibravatarUrl', () => {
    it('应该生成正确格式的 Libravatar URL', async () => {
      const url = await buildLibravatarUrl('test@example.com')
      expect(url).toMatch(/^https:\/\/seccdn\.libravatar\.org\/avatar\/[0-9a-f]{64}\?d=404&s=80$/)
    })

    it('应该对 email 进行归一化', async () => {
      const url1 = await buildLibravatarUrl('Test@Example.com')
      const url2 = await buildLibravatarUrl('test@example.com')
      expect(url1).toBe(url2)
    })
  })

  describe('buildQQAvatarUrl', () => {
    it('应该生成正确格式的 QQ 头像 URL', () => {
      const url = buildQQAvatarUrl('12345')
      expect(url).toBe('https://q1.qlogo.cn/g?b=qq&nk=12345&s=100')
    })
  })

  describe('resolveAvatars', () => {
    it('有 email 时应该返回 gravatar 和 libravatar', async () => {
      const avatars = await resolveAvatars({
        email: 'test@example.com',
        qqNumber: null,
        oauthAccounts: []
      })

      expect(avatars.gravatar).toMatch(/gravatar\.com/)
      expect(avatars.libravatar).toMatch(/libravatar\.org/)
      expect(avatars.qq).toBeNull()
      expect(avatars.oauth).toBeNull()
    })

    it('有 qqNumber 时应该返回 qq', async () => {
      const avatars = await resolveAvatars({
        email: null,
        qqNumber: '12345',
        oauthAccounts: []
      })

      expect(avatars.gravatar).toBeNull()
      expect(avatars.libravatar).toBeNull()
      expect(avatars.qq).toMatch(/qlogo\.cn/)
      expect(avatars.oauth).toBeNull()
    })

    it('有 OAuth 账号时应该返回 oauth 头像', async () => {
      const avatars = await resolveAvatars({
        email: null,
        qqNumber: null,
        oauthAccounts: [{ avatarUrl: 'https://github.com/avatar.png' }]
      })

      expect(avatars.oauth).toBe('https://github.com/avatar.png')
    })

    it('OAuth 账号无头像时 oauth 应为 null', async () => {
      const avatars = await resolveAvatars({
        email: null,
        qqNumber: null,
        oauthAccounts: [{ avatarUrl: null }]
      })

      expect(avatars.oauth).toBeNull()
    })

    it('所有来源都有时应该全部返回', async () => {
      const avatars = await resolveAvatars({
        email: 'test@example.com',
        qqNumber: '12345',
        oauthAccounts: [{ avatarUrl: 'https://github.com/avatar.png' }]
      })

      expect(avatars.gravatar).toBeTruthy()
      expect(avatars.libravatar).toBeTruthy()
      expect(avatars.qq).toBeTruthy()
      expect(avatars.oauth).toBeTruthy()
    })

    it('所有来源都为空时应该全部返回 null', async () => {
      const avatars = await resolveAvatars({
        email: null,
        qqNumber: null,
        oauthAccounts: []
      })

      expect(avatars).toEqual({
        gravatar: null,
        libravatar: null,
        qq: null,
        oauth: null
      })
    })
  })
})
