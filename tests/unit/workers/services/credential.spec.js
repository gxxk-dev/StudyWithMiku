/**
 * 凭证服务测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveCredential,
  findCredentialById,
  findCredentialsByUserId,
  updateCredentialCounter,
  deleteCredential,
  getCredentialCount,
  formatCredentialForResponse
} from '../../../../workers/services/credential.js'
import { createMockD1 } from '../../../setup/fixtures/workerMocks.js'
import { sampleCredentials, createCredential } from '../../../setup/fixtures/authData.js'

describe('credential.js', () => {
  let mockDB

  beforeEach(() => {
    mockDB = createMockD1()
    // 预置测试凭证（深拷贝以避免测试间干扰）
    mockDB.__setTable('credentials', JSON.parse(JSON.stringify(sampleCredentials)))
  })

  describe('saveCredential', () => {
    it('应该保存新凭证', async () => {
      const newCred = createCredential({
        id: 'new-credential-001',
        user_id: 'user-001'
      })

      await saveCredential(mockDB, {
        credentialId: newCred.id,
        userId: newCred.user_id,
        publicKey: newCred.public_key,
        counter: newCred.counter,
        transports: ['internal'],
        deviceType: 'platform',
        deviceName: 'New Device',
        backedUp: false
      })

      const saved = await findCredentialById(mockDB, 'new-credential-001')
      expect(saved).not.toBeNull()
      expect(saved.userId).toBe('user-001')
    })

    it('重复 ID 应该抛出错误', async () => {
      await expect(
        saveCredential(mockDB, {
          credentialId: 'credential-001', // 已存在
          userId: 'user-001',
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0
        })
      ).rejects.toThrow()
    })
  })

  describe('findCredentialById', () => {
    it('应该找到存在的凭证', async () => {
      const cred = await findCredentialById(mockDB, 'credential-001')

      expect(cred).not.toBeNull()
      expect(cred.id).toBe('credential-001')
      expect(cred.userId).toBe('user-001')
      expect(cred.transports).toEqual(['internal'])
      expect(cred.backedUp).toBe(false)
    })

    it('应该正确解析 transports JSON', async () => {
      const cred = await findCredentialById(mockDB, 'credential-002')

      expect(cred.transports).toEqual(['usb'])
    })

    it('不存在的凭证应该返回 null 或 undefined', async () => {
      const cred = await findCredentialById(mockDB, 'nonexistent')
      expect(cred).toBeFalsy()
    })
  })

  describe('findCredentialsByUserId', () => {
    it('应该返回用户的所有凭证', async () => {
      const creds = await findCredentialsByUserId(mockDB, 'user-001')

      expect(creds).toHaveLength(2)
      expect(creds[0].id).toBe('credential-001')
      expect(creds[1].id).toBe('credential-002')
    })

    it('没有凭证的用户应该返回空数组', async () => {
      const creds = await findCredentialsByUserId(mockDB, 'user-without-creds')
      expect(creds).toEqual([])
    })
  })

  describe('updateCredentialCounter', () => {
    it('应该更新凭证的计数器', async () => {
      await updateCredentialCounter(mockDB, 'credential-001', 10)

      const cred = await findCredentialById(mockDB, 'credential-001')
      expect(cred.counter).toBe(10)
    })
  })

  describe('deleteCredential', () => {
    it('应该删除属于用户的凭证', async () => {
      const deleted = await deleteCredential(mockDB, 'credential-001', 'user-001')

      expect(deleted).toBe(true)

      const cred = await findCredentialById(mockDB, 'credential-001')
      expect(cred).toBeFalsy()
    })

    it('不属于用户的凭证不应该被删除', async () => {
      const deleted = await deleteCredential(mockDB, 'credential-001', 'user-002')
      expect(deleted).toBe(false)

      const cred = await findCredentialById(mockDB, 'credential-001')
      expect(cred).toBeTruthy()
    })

    it('不存在的凭证应该返回 false', async () => {
      const deleted = await deleteCredential(mockDB, 'nonexistent', 'user-001')
      expect(deleted).toBe(false)
    })
  })

  describe('getCredentialCount', () => {
    it('应该返回用户的凭证数量', async () => {
      const count = await getCredentialCount(mockDB, 'user-001')
      expect(count).toBe(2)
    })

    it('没有凭证的用户应该返回 0', async () => {
      const count = await getCredentialCount(mockDB, 'user-without-creds')
      expect(count).toBe(0)
    })
  })

  describe('formatCredentialForResponse', () => {
    it('应该正确格式化凭证响应（排除敏感数据）', () => {
      const cred = {
        id: 'credential-001',
        userId: 'user-001',
        publicKey: new Uint8Array([1, 2, 3]),
        counter: 5,
        transports: ['internal'],
        deviceType: 'platform',
        deviceName: 'My Device',
        backedUp: true
      }

      const formatted = formatCredentialForResponse(cred)

      expect(formatted).toEqual({
        id: 'credential-001',
        credentialId: 'credential-001',
        deviceType: 'platform',
        deviceName: 'My Device',
        transports: ['internal'],
        backedUp: true,
        lastUsedAt: null
      })

      // 确保敏感字段不在响应中
      expect(formatted.userId).toBeUndefined()
      expect(formatted.publicKey).toBeUndefined()
      expect(formatted.counter).toBeUndefined()
    })
  })
})
