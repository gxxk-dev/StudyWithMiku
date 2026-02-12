import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock 浏览器 WebAuthn API
const mockCredentialsCreate = vi.fn()
const mockCredentialsGet = vi.fn()

beforeEach(() => {
  // 设置 PublicKeyCredential 支持
  window.PublicKeyCredential = vi.fn()
  Object.defineProperty(navigator, 'credentials', {
    value: { create: mockCredentialsCreate, get: mockCredentialsGet },
    writable: true,
    configurable: true
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// 动态导入以确保 mock 生效
const loadModule = () => import('@/utils/webauthnHelper.js')

describe('webauthnHelper', () => {
  describe('isWebAuthnSupported', () => {
    it('浏览器支持 WebAuthn 时返回 true', async () => {
      const { isWebAuthnSupported } = await loadModule()
      expect(isWebAuthnSupported()).toBe(true)
    })

    it('浏览器不支持 PublicKeyCredential 时返回 false', async () => {
      delete window.PublicKeyCredential
      const { isWebAuthnSupported } = await loadModule()
      expect(isWebAuthnSupported()).toBe(false)
    })
  })

  describe('base64URLToBuffer / bufferToBase64URL', () => {
    it('往返转换保持一致', async () => {
      const { base64URLToBuffer, bufferToBase64URL } = await loadModule()
      const original = 'SGVsbG8gV29ybGQ'
      const buffer = base64URLToBuffer(original)
      expect(buffer).toBeInstanceOf(ArrayBuffer)
      const result = bufferToBase64URL(buffer)
      expect(result).toBe(original)
    })

    it('正确处理 base64url 特殊字符 (- 和 _)', async () => {
      const { base64URLToBuffer, bufferToBase64URL } = await loadModule()
      // 包含 + 和 / 的 base64 在 base64url 中变为 - 和 _
      const base64url = 'ab-cd_ef'
      const buffer = base64URLToBuffer(base64url)
      const result = bufferToBase64URL(buffer)
      expect(result).toBe(base64url)
    })

    it('处理空字符串', async () => {
      const { base64URLToBuffer, bufferToBase64URL } = await loadModule()
      const buffer = base64URLToBuffer('')
      expect(buffer.byteLength).toBe(0)
      expect(bufferToBase64URL(buffer)).toBe('')
    })

    it('处理需要填充的 base64url 字符串', async () => {
      const { base64URLToBuffer, bufferToBase64URL } = await loadModule()
      // 'YQ' 是 'a' 的 base64url 编码（无填充）
      const buffer = base64URLToBuffer('YQ')
      const view = new Uint8Array(buffer)
      expect(view[0]).toBe(97) // 'a' 的 ASCII
    })
  })

  describe('parseRegisterOptions', () => {
    it('将服务器注册选项转换为浏览器格式', async () => {
      const { parseRegisterOptions } = await loadModule()
      const serverOptions = {
        challenge: 'dGVzdC1jaGFsbGVuZ2U',
        rp: { name: 'Test', id: 'localhost' },
        user: {
          id: 'dXNlci0wMDE',
          name: 'testuser',
          displayName: 'Test User'
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        excludeCredentials: [{ id: 'Y3JlZC0wMDE', type: 'public-key', transports: ['internal'] }]
      }

      const result = parseRegisterOptions(serverOptions)
      expect(result.publicKey.challenge).toBeInstanceOf(ArrayBuffer)
      expect(result.publicKey.user.id).toBeInstanceOf(ArrayBuffer)
      expect(result.publicKey.excludeCredentials[0].id).toBeInstanceOf(ArrayBuffer)
      expect(result.publicKey.rp).toEqual(serverOptions.rp)
    })

    it('处理无 excludeCredentials 的选项', async () => {
      const { parseRegisterOptions } = await loadModule()
      const serverOptions = {
        challenge: 'dGVzdA',
        rp: { name: 'Test', id: 'localhost' },
        user: { id: 'dXNlcg', name: 'test', displayName: 'Test' },
        pubKeyCredParams: []
      }

      const result = parseRegisterOptions(serverOptions)
      expect(result.publicKey.challenge).toBeInstanceOf(ArrayBuffer)
    })
  })

  describe('parseLoginOptions', () => {
    it('将服务器登录选项转换为浏览器格式', async () => {
      const { parseLoginOptions } = await loadModule()
      const serverOptions = {
        challenge: 'dGVzdC1jaGFsbGVuZ2U',
        allowCredentials: [{ id: 'Y3JlZC0wMDE', type: 'public-key', transports: ['internal'] }],
        rpId: 'localhost'
      }

      const result = parseLoginOptions(serverOptions)
      expect(result.publicKey.challenge).toBeInstanceOf(ArrayBuffer)
      expect(result.publicKey.allowCredentials[0].id).toBeInstanceOf(ArrayBuffer)
    })
  })

  describe('serializeCredential', () => {
    const createMockArrayBuffer = (str) => {
      const encoder = new TextEncoder()
      return encoder.encode(str).buffer
    }

    it('序列化注册凭据', async () => {
      const { serializeCredential } = await loadModule()
      const credential = {
        id: 'cred-001',
        rawId: createMockArrayBuffer('rawId'),
        response: {
          clientDataJSON: createMockArrayBuffer('clientData'),
          attestationObject: createMockArrayBuffer('attestation'),
          getTransports: () => ['internal'],
          getPublicKeyAlgorithm: () => -7,
          getPublicKey: () => createMockArrayBuffer('pubkey'),
          getAuthenticatorData: () => createMockArrayBuffer('authData')
        },
        authenticatorAttachment: 'platform',
        type: 'public-key'
      }

      const result = serializeCredential(credential, true)
      expect(result.id).toBe('cred-001')
      expect(typeof result.rawId).toBe('string')
      expect(result.response.attestationObject).toBeDefined()
      expect(result.response.transports).toEqual(['internal'])
      expect(result.type).toBe('public-key')
    })

    it('序列化登录凭据', async () => {
      const { serializeCredential } = await loadModule()
      const credential = {
        id: 'cred-001',
        rawId: createMockArrayBuffer('rawId'),
        response: {
          clientDataJSON: createMockArrayBuffer('clientData'),
          authenticatorData: createMockArrayBuffer('authData'),
          signature: createMockArrayBuffer('sig'),
          userHandle: createMockArrayBuffer('user')
        },
        authenticatorAttachment: 'platform',
        type: 'public-key'
      }

      const result = serializeCredential(credential, false)
      expect(result.id).toBe('cred-001')
      expect(result.response.authenticatorData).toBeDefined()
      expect(result.response.signature).toBeDefined()
    })
  })

  describe('createCredential', () => {
    it('调用 navigator.credentials.create 并序列化结果', async () => {
      const { createCredential } = await loadModule()
      const mockCred = {
        id: 'new-cred',
        rawId: new Uint8Array([1, 2, 3]).buffer,
        response: {
          clientDataJSON: new Uint8Array([4, 5]).buffer,
          attestationObject: new Uint8Array([6, 7]).buffer,
          getTransports: () => ['internal'],
          getPublicKeyAlgorithm: () => -7,
          getPublicKey: () => new Uint8Array([8]).buffer,
          getAuthenticatorData: () => new Uint8Array([9]).buffer
        },
        authenticatorAttachment: 'platform',
        type: 'public-key'
      }
      mockCredentialsCreate.mockResolvedValue(mockCred)

      const options = {
        challenge: 'dGVzdA',
        rp: { name: 'Test', id: 'localhost' },
        user: { id: 'dXNlcg', name: 'test', displayName: 'Test' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }]
      }

      const result = await createCredential(options)
      expect(mockCredentialsCreate).toHaveBeenCalled()
      expect(result.id).toBe('new-cred')
    })

    it('WebAuthn 不支持时抛出错误', async () => {
      delete window.PublicKeyCredential
      const { createCredential } = await loadModule()

      await expect(createCredential({})).rejects.toThrow()
    })
  })

  describe('getCredential', () => {
    it('调用 navigator.credentials.get 并序列化结果', async () => {
      const { getCredential } = await loadModule()
      const mockCred = {
        id: 'existing-cred',
        rawId: new Uint8Array([1, 2]).buffer,
        response: {
          clientDataJSON: new Uint8Array([3]).buffer,
          authenticatorData: new Uint8Array([4]).buffer,
          signature: new Uint8Array([5]).buffer,
          userHandle: new Uint8Array([6]).buffer
        },
        authenticatorAttachment: 'platform',
        type: 'public-key'
      }
      mockCredentialsGet.mockResolvedValue(mockCred)

      const options = {
        challenge: 'dGVzdA',
        allowCredentials: [{ id: 'Y3JlZA', type: 'public-key' }],
        rpId: 'localhost'
      }

      const result = await getCredential(options)
      expect(mockCredentialsGet).toHaveBeenCalled()
      expect(result.id).toBe('existing-cred')
    })

    it('WebAuthn 不支持时抛出错误', async () => {
      delete window.PublicKeyCredential
      const { getCredential } = await loadModule()

      await expect(getCredential({})).rejects.toThrow()
    })
  })

  describe('描述函数', () => {
    it('getAuthenticatorTypeDescription 返回平台认证器描述', async () => {
      const { getAuthenticatorTypeDescription } = await loadModule()
      const desc = getAuthenticatorTypeDescription('platform')
      expect(typeof desc).toBe('string')
      expect(desc.length).toBeGreaterThan(0)
    })

    it('getAuthenticatorTypeDescription 返回跨平台描述', async () => {
      const { getAuthenticatorTypeDescription } = await loadModule()
      const desc = getAuthenticatorTypeDescription('cross-platform')
      expect(typeof desc).toBe('string')
    })

    it('getUserVerificationDescription 返回各级别描述', async () => {
      const { getUserVerificationDescription } = await loadModule()
      expect(typeof getUserVerificationDescription('required')).toBe('string')
      expect(typeof getUserVerificationDescription('preferred')).toBe('string')
      expect(typeof getUserVerificationDescription('discouraged')).toBe('string')
      expect(typeof getUserVerificationDescription('unknown')).toBe('string')
    })
  })
})
