/**
 * 用户服务测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  findUserByUsername,
  findUserById,
  findUserByProvider,
  usernameExists,
  isValidUsername,
  createWebAuthnUser,
  createOrGetOAuthUser,
  updateUser,
  deleteUser,
  formatUserForResponse
} from '../../../../workers/services/user.js'
import { AUTH_PROVIDER } from '../../../../workers/constants.js'
import { createMockD1 } from '../../../setup/fixtures/workerMocks.js'
import { sampleUsers, createOAuthUser } from '../../../setup/fixtures/authData.js'

describe('user.js', () => {
  let mockDB

  beforeEach(() => {
    mockDB = createMockD1()
    // 预置测试用户（深拷贝以避免测试间干扰）
    mockDB.__setTable('users', JSON.parse(JSON.stringify(sampleUsers)))
  })

  describe('findUserByUsername', () => {
    it('应该找到存在的用户', async () => {
      const user = await findUserByUsername(mockDB, 'testuser')

      expect(user).not.toBeNull()
      expect(user.id).toBe('user-001')
      expect(user.username).toBe('testuser')
    })

    it('不存在的用户应该返回 null', async () => {
      const user = await findUserByUsername(mockDB, 'nonexistent')
      expect(user).toBeNull()
    })
  })

  describe('findUserById', () => {
    it('应该通过 ID 找到用户', async () => {
      const user = await findUserById(mockDB, 'user-001')

      expect(user).not.toBeNull()
      expect(user.username).toBe('testuser')
    })

    it('不存在的 ID 应该返回 null', async () => {
      const user = await findUserById(mockDB, 'nonexistent-id')
      expect(user).toBeNull()
    })
  })

  describe('findUserByProvider', () => {
    it('应该通过 OAuth provider 找到用户', async () => {
      const user = await findUserByProvider(mockDB, 'github', '12345678')

      expect(user).not.toBeNull()
      expect(user.username).toBe('github_user')
      expect(user.auth_provider).toBe('github')
    })

    it('不存在的 provider ID 应该返回 null', async () => {
      const user = await findUserByProvider(mockDB, 'github', 'nonexistent')
      expect(user).toBeNull()
    })
  })

  describe('usernameExists', () => {
    it('存在的用户名应该返回 true', async () => {
      const exists = await usernameExists(mockDB, 'testuser')
      expect(exists).toBe(true)
    })

    it('不存在的用户名应该返回 false', async () => {
      const exists = await usernameExists(mockDB, 'newuser')
      expect(exists).toBe(false)
    })
  })

  describe('isValidUsername', () => {
    it('有效用户名应该返回 true', () => {
      expect(isValidUsername('abc')).toBe(true)
      expect(isValidUsername('user123')).toBe(true)
      expect(isValidUsername('test_user')).toBe(true)
      expect(isValidUsername('ABC123_xyz')).toBe(true)
      expect(isValidUsername('a'.repeat(20))).toBe(true)
    })

    it('太短的用户名应该返回 false', () => {
      expect(isValidUsername('ab')).toBe(false)
      expect(isValidUsername('a')).toBe(false)
      expect(isValidUsername('')).toBe(false)
    })

    it('太长的用户名应该返回 false', () => {
      expect(isValidUsername('a'.repeat(21))).toBe(false)
    })

    it('包含非法字符的用户名应该返回 false', () => {
      expect(isValidUsername('user-name')).toBe(false)
      expect(isValidUsername('user.name')).toBe(false)
      expect(isValidUsername('user@name')).toBe(false)
      expect(isValidUsername('用户名')).toBe(false)
      expect(isValidUsername('user name')).toBe(false)
    })
  })

  describe('createWebAuthnUser', () => {
    it('应该创建 WebAuthn 用户', async () => {
      const result = await createWebAuthnUser(mockDB, {
        username: 'newwebauthn',
        displayName: 'New WebAuthn User'
      })

      expect(result.id).toBeDefined()
      expect(result.username).toBe('newwebauthn')
      expect(result.displayName).toBe('New WebAuthn User')
      expect(result.authProvider).toBe(AUTH_PROVIDER.WEBAUTHN)
    })

    it('没有 displayName 时应该使用 username', async () => {
      const result = await createWebAuthnUser(mockDB, {
        username: 'nodisplay'
      })

      expect(result.displayName).toBe('nodisplay')
    })

    it('重复用户名应该抛出错误', async () => {
      await expect(createWebAuthnUser(mockDB, { username: 'testuser' })).rejects.toThrow()
    })
  })

  describe('createOrGetOAuthUser', () => {
    it('新 OAuth 用户应该被创建', async () => {
      const oauthUser = createOAuthUser('github', { providerId: 'new-github-id' })

      const { user, isNew } = await createOrGetOAuthUser(mockDB, {
        provider: oauthUser.provider,
        providerId: oauthUser.providerId,
        preferredUsername: oauthUser.username,
        displayName: oauthUser.displayName,
        avatarUrl: oauthUser.avatarUrl
      })

      expect(isNew).toBe(true)
      expect(user.id).toBeDefined()
      expect(user.auth_provider).toBe('github')
    })

    it('已存在的 OAuth 用户应该直接返回', async () => {
      const { user, isNew } = await createOrGetOAuthUser(mockDB, {
        provider: 'github',
        providerId: '12345678',
        preferredUsername: 'github_user',
        displayName: 'GitHub User'
      })

      expect(isNew).toBe(false)
      expect(user.id).toBe('user-002')
    })

    it('用户名冲突时应该添加数字后缀', async () => {
      // 创建一个用户名会冲突的情况
      const { user } = await createOrGetOAuthUser(mockDB, {
        provider: 'google',
        providerId: 'new-google-id',
        preferredUsername: 'testuser', // 这个用户名已存在
        displayName: 'Google User'
      })

      expect(user.username).toBe('testuser1') // 应该加了后缀
    })
  })

  describe('updateUser', () => {
    it('应该更新用户的 display_name', async () => {
      await updateUser(mockDB, 'user-001', { display_name: 'Updated Name' })

      const user = await findUserById(mockDB, 'user-001')
      expect(user.display_name).toBe('Updated Name')
    })

    it('应该更新用户的 avatar_url', async () => {
      await updateUser(mockDB, 'user-001', { avatar_url: 'https://new-avatar.png' })

      const user = await findUserById(mockDB, 'user-001')
      expect(user.avatar_url).toBe('https://new-avatar.png')
    })

    it('不允许的字段应该被忽略', async () => {
      await updateUser(mockDB, 'user-001', {
        username: 'hacked_username',
        display_name: 'Valid Update'
      })

      const user = await findUserById(mockDB, 'user-001')
      expect(user.username).toBe('testuser') // 没有被修改
      expect(user.display_name).toBe('Valid Update')
    })
  })

  describe('deleteUser', () => {
    it('应该删除用户', async () => {
      await deleteUser(mockDB, 'user-001')

      const user = await findUserById(mockDB, 'user-001')
      expect(user).toBeNull()
    })
  })

  describe('formatUserForResponse', () => {
    it('应该正确格式化用户响应', () => {
      const formatted = formatUserForResponse(sampleUsers[0])

      expect(formatted).toEqual({
        id: 'user-001',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        authProvider: 'webauthn'
      })
    })

    it('应该处理带有头像的用户', () => {
      const formatted = formatUserForResponse(sampleUsers[1])

      expect(formatted.avatarUrl).toBe('https://github.com/avatar.png')
      expect(formatted.authProvider).toBe('github')
    })
  })
})
