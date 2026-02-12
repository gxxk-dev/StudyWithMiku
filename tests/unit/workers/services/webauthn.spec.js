import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createRegistrationOptions,
  verifyRegistration,
  createAuthenticationOptions,
  verifyAuthentication,
  getDeviceType,
  generateDeviceName
} from '../../../../workers/services/webauthn.js'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server'
import {
  findCredentialsByUserId,
  findCredentialById
} from '../../../../workers/services/credential.js'

vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn()
}))

vi.mock('../../../../workers/services/credential.js', () => ({
  findCredentialsByUserId: vi.fn(),
  findCredentialById: vi.fn()
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('workers/services/webauthn', () => {
  describe('createRegistrationOptions', () => {
    it('排除已有凭据并生成注册选项', async () => {
      const existingCreds = [
        { id: 'cred-001', transports: ['internal'] },
        { id: 'cred-002', transports: ['usb'] }
      ]
      findCredentialsByUserId.mockResolvedValue(existingCreds)
      generateRegistrationOptions.mockResolvedValue({ challenge: 'test-challenge' })

      const result = await createRegistrationOptions({
        userId: 'user-001',
        username: 'testuser',
        displayName: 'Test User',
        rpId: 'localhost',
        rpName: 'Test App',
        db: {}
      })

      expect(findCredentialsByUserId).toHaveBeenCalledWith({}, 'user-001')
      expect(generateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          rpName: 'Test App',
          rpID: 'localhost',
          userName: 'testuser',
          excludeCredentials: [
            { id: 'cred-001', transports: ['internal'] },
            { id: 'cred-002', transports: ['usb'] }
          ]
        })
      )
      expect(result.challenge).toBe('test-challenge')
    })

    it('无已有凭据时 excludeCredentials 为空', async () => {
      findCredentialsByUserId.mockResolvedValue([])
      generateRegistrationOptions.mockResolvedValue({ challenge: 'ch' })

      await createRegistrationOptions({
        userId: 'user-001',
        username: 'test',
        displayName: 'Test',
        rpId: 'localhost',
        rpName: 'App',
        db: {}
      })

      expect(generateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({ excludeCredentials: [] })
      )
    })

    it('displayName 缺失时回退到 username', async () => {
      findCredentialsByUserId.mockResolvedValue([])
      generateRegistrationOptions.mockResolvedValue({})

      await createRegistrationOptions({
        userId: 'user-001',
        username: 'testuser',
        displayName: undefined,
        rpId: 'localhost',
        rpName: 'App',
        db: {}
      })

      expect(generateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({ userDisplayName: 'testuser' })
      )
    })
  })

  describe('verifyRegistration', () => {
    it('验证成功返回 registrationInfo', async () => {
      const mockInfo = { credentialID: 'cred-new', credentialPublicKey: new Uint8Array([1, 2]) }
      verifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: mockInfo
      })

      const result = await verifyRegistration({
        response: { id: 'resp' },
        expectedChallenge: 'challenge',
        expectedOrigin: 'http://localhost',
        expectedRPID: 'localhost'
      })

      expect(result.verified).toBe(true)
      expect(result.registrationInfo).toEqual(mockInfo)
    })

    it('验证失败返回 error', async () => {
      verifyRegistrationResponse.mockResolvedValue({
        verified: false,
        registrationInfo: null
      })

      const result = await verifyRegistration({
        response: {},
        expectedChallenge: 'ch',
        expectedOrigin: 'http://localhost',
        expectedRPID: 'localhost'
      })

      expect(result.verified).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('缺少 registrationInfo 返回 error', async () => {
      verifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: null
      })

      const result = await verifyRegistration({
        response: {},
        expectedChallenge: 'ch',
        expectedOrigin: 'http://localhost',
        expectedRPID: 'localhost'
      })

      expect(result.verified).toBe(false)
    })

    it('异常时返回 error', async () => {
      verifyRegistrationResponse.mockRejectedValue(new Error('Invalid response'))

      const result = await verifyRegistration({
        response: {},
        expectedChallenge: 'ch',
        expectedOrigin: 'http://localhost',
        expectedRPID: 'localhost'
      })

      expect(result.verified).toBe(false)
      expect(result.error).toBe('Invalid response')
    })
  })

  describe('createAuthenticationOptions', () => {
    it('包含用户凭据生成认证选项', async () => {
      const creds = [
        { id: 'cred-001', transports: ['internal'] },
        { id: 'cred-002', transports: ['usb'] }
      ]
      findCredentialsByUserId.mockResolvedValue(creds)
      generateAuthenticationOptions.mockResolvedValue({ challenge: 'auth-challenge' })

      const result = await createAuthenticationOptions({
        userId: 'user-001',
        rpId: 'localhost',
        db: {}
      })

      expect(generateAuthenticationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          rpID: 'localhost',
          allowCredentials: [
            { id: 'cred-001', transports: ['internal'] },
            { id: 'cred-002', transports: ['usb'] }
          ]
        })
      )
      expect(result.challenge).toBe('auth-challenge')
    })
  })

  describe('verifyAuthentication', () => {
    it('验证成功返回凭据信息', async () => {
      const credential = {
        id: 'cred-001',
        publicKey: new Uint8Array([1, 2]),
        counter: 5,
        transports: ['internal'],
        userId: 'user-001'
      }
      findCredentialById.mockResolvedValue(credential)
      verifyAuthenticationResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 6 }
      })

      const result = await verifyAuthentication({
        response: { id: 'cred-001' },
        expectedChallenge: 'ch',
        expectedOrigin: 'http://localhost',
        expectedRPID: 'localhost',
        db: {}
      })

      expect(result.verified).toBe(true)
      expect(result.credentialId).toBe('cred-001')
      expect(result.userId).toBe('user-001')
      expect(result.newCounter).toBe(6)
      expect(result.counterWarning).toBe(false)
    })

    it('计数器未递增时发出克隆警告', async () => {
      const credential = {
        id: 'cred-001',
        publicKey: new Uint8Array([1]),
        counter: 10,
        transports: ['internal'],
        userId: 'user-001'
      }
      findCredentialById.mockResolvedValue(credential)
      verifyAuthenticationResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 10 }
      })

      const result = await verifyAuthentication({
        response: { id: 'cred-001' },
        expectedChallenge: 'ch',
        expectedOrigin: 'http://localhost',
        expectedRPID: 'localhost',
        db: {}
      })

      expect(result.verified).toBe(true)
      expect(result.counterWarning).toBe(true)
    })

    it('凭据未找到返回 error', async () => {
      findCredentialById.mockResolvedValue(null)

      const result = await verifyAuthentication({
        response: { id: 'nonexistent' },
        expectedChallenge: 'ch',
        expectedOrigin: 'http://localhost',
        expectedRPID: 'localhost',
        db: {}
      })

      expect(result.verified).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('验证失败返回 error', async () => {
      findCredentialById.mockResolvedValue({
        id: 'cred-001',
        publicKey: new Uint8Array([1]),
        counter: 0,
        transports: [],
        userId: 'user-001'
      })
      verifyAuthenticationResponse.mockResolvedValue({ verified: false })

      const result = await verifyAuthentication({
        response: { id: 'cred-001' },
        expectedChallenge: 'ch',
        expectedOrigin: 'http://localhost',
        expectedRPID: 'localhost',
        db: {}
      })

      expect(result.verified).toBe(false)
    })
  })

  describe('getDeviceType', () => {
    it('有 authenticatorData 返回 platform', () => {
      expect(getDeviceType({ aaguid: '00000000' })).toBe('platform')
    })

    it('null 返回 unknown', () => {
      expect(getDeviceType(null)).toBe('unknown')
    })

    it('undefined 返回 unknown', () => {
      expect(getDeviceType(undefined)).toBe('unknown')
    })
  })

  describe('generateDeviceName', () => {
    it('internal → 内置认证器', () => {
      expect(generateDeviceName(['internal'])).toBe('内置认证器')
    })

    it('hybrid → 手机认证器', () => {
      expect(generateDeviceName(['hybrid'])).toBe('手机认证器')
    })

    it('usb → USB 安全密钥', () => {
      expect(generateDeviceName(['usb'])).toBe('USB 安全密钥')
    })

    it('nfc → NFC 安全密钥', () => {
      expect(generateDeviceName(['nfc'])).toBe('NFC 安全密钥')
    })

    it('ble → 蓝牙安全密钥', () => {
      expect(generateDeviceName(['ble'])).toBe('蓝牙安全密钥')
    })

    it('空数组 → 安全密钥', () => {
      expect(generateDeviceName([])).toBe('安全密钥')
    })

    it('无参数 → 安全密钥', () => {
      expect(generateDeviceName()).toBe('安全密钥')
    })
  })
})
