/**
 * 用户服务测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  findUserByUsername,
  findUserById,
  usernameExists,
  isValidUsername,
  createWebAuthnUser,
  updateUser,
  deleteUser,
  formatUserForResponse
} from '../../../../workers/services/user.js'
import { createMockD1 } from '../../../setup/fixtures/workerMocks.js'
import { sampleUsers, sampleUsersCamelCase } from '../../../setup/fixtures/authData.js'

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

    it('不存在的用户应该返回 null 或 undefined', async () => {
      const user = await findUserByUsername(mockDB, 'nonexistent')
      expect(user).toBeFalsy()
    })
  })

  describe('findUserById', () => {
    it('应该通过 ID 找到用户', async () => {
      const user = await findUserById(mockDB, 'user-001')

      expect(user).not.toBeNull()
      expect(user.username).toBe('testuser')
    })

    it('不存在的 ID 应该返回 null 或 undefined', async () => {
      const user = await findUserById(mockDB, 'nonexistent-id')
      expect(user).toBeFalsy()
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
      expect(result.avatarUrl).toBeNull()
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

  describe('updateUser', () => {
    it('应该更新用户的 displayName', async () => {
      await updateUser(mockDB, 'user-001', { displayName: 'Updated Name' })

      const user = await findUserById(mockDB, 'user-001')
      expect(user.displayName).toBe('Updated Name')
    })

    it('应该更新用户的 avatarUrl', async () => {
      await updateUser(mockDB, 'user-001', { avatarUrl: 'https://new-avatar.png' })

      const user = await findUserById(mockDB, 'user-001')
      expect(user.avatarUrl).toBe('https://new-avatar.png')
    })

    it('应该更新用户的 email', async () => {
      await updateUser(mockDB, 'user-001', { email: 'test@example.com' })

      const user = await findUserById(mockDB, 'user-001')
      expect(user.email).toBe('test@example.com')
    })

    it('应该更新用户的 qqNumber', async () => {
      await updateUser(mockDB, 'user-001', { qqNumber: '12345' })

      const user = await findUserById(mockDB, 'user-001')
      expect(user.qqNumber).toBe('12345')
    })

    it('应该能将 email 置空', async () => {
      await updateUser(mockDB, 'user-002', { email: null })

      const user = await findUserById(mockDB, 'user-002')
      expect(user.email).toBeNull()
    })

    it('不允许的字段应该被忽略', async () => {
      await updateUser(mockDB, 'user-001', {
        username: 'hacked_username',
        displayName: 'Valid Update'
      })

      const user = await findUserById(mockDB, 'user-001')
      expect(user.username).toBe('testuser') // 没有被修改
      expect(user.displayName).toBe('Valid Update')
    })
  })

  describe('deleteUser', () => {
    it('应该删除用户', async () => {
      await deleteUser(mockDB, 'user-001')

      const user = await findUserById(mockDB, 'user-001')
      expect(user).toBeFalsy()
    })
  })

  describe('formatUserForResponse', () => {
    it('应该正确格式化用户响应', () => {
      const formatted = formatUserForResponse(sampleUsersCamelCase[0])

      expect(formatted).toEqual({
        id: 'user-001',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        email: null,
        qqNumber: null
      })
    })

    it('应该处理带有头像的用户', () => {
      const formatted = formatUserForResponse(sampleUsersCamelCase[1])

      expect(formatted.avatarUrl).toBe('https://github.com/avatar.png')
      expect(formatted.email).toBe('github@example.com')
    })

    it('应该包含 avatars 对象（如果提供）', () => {
      const avatars = {
        gravatar: 'https://gravatar.com/avatar/abc',
        libravatar: null,
        qq: null,
        oauth: 'https://github.com/avatar.png'
      }
      const formatted = formatUserForResponse(sampleUsersCamelCase[0], { avatars })

      expect(formatted.avatars).toEqual(avatars)
    })

    it('不提供 avatars 时不应包含 avatars 字段', () => {
      const formatted = formatUserForResponse(sampleUsersCamelCase[0])

      expect(formatted.avatars).toBeUndefined()
    })
  })
})
