/**
 * @module workers/services/webauthn
 * @description WebAuthn 核心逻辑 - 注册和认证选项生成、验证
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server'
import { WEBAUTHN_CONFIG } from '../constants.js'
import { findCredentialsByUserId, findCredentialById } from './credential.js'

/**
 * 生成注册选项
 * @param {Object} params
 * @param {string} params.userId - 用户 ID
 * @param {string} params.username - 用户名
 * @param {string} params.displayName - 显示名称
 * @param {string} params.rpId - Relying Party ID
 * @param {string} params.rpName - Relying Party 名称
 * @param {Object} params.db - D1 数据库实例
 * @returns {Promise<Object>}
 */
export const createRegistrationOptions = async ({
  userId,
  username,
  displayName,
  rpId,
  rpName,
  db
}) => {
  // 获取用户已有的凭证，用于排除
  const existingCredentials = await findCredentialsByUserId(db, userId)

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpId,
    userID: new TextEncoder().encode(userId),
    userName: username,
    userDisplayName: displayName || username,
    attestationType: 'none',
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.id,
      transports: cred.transports
    })),
    authenticatorSelection: {
      authenticatorAttachment: WEBAUTHN_CONFIG.AUTHENTICATOR_ATTACHMENT,
      userVerification: WEBAUTHN_CONFIG.USER_VERIFICATION,
      residentKey: WEBAUTHN_CONFIG.RESIDENT_KEY
    },
    supportedAlgorithmIDs: WEBAUTHN_CONFIG.SUPPORTED_ALGORITHMS
  })

  return options
}

/**
 * 验证注册响应
 * @param {Object} params
 * @param {Object} params.response - 前端返回的注册响应
 * @param {string} params.expectedChallenge - 预期的挑战值
 * @param {string} params.expectedOrigin - 预期的 Origin
 * @param {string} params.expectedRPID - 预期的 RP ID
 * @returns {Promise<{verified: boolean, registrationInfo?: Object, error?: string}>}
 */
export const verifyRegistration = async ({
  response,
  expectedChallenge,
  expectedOrigin,
  expectedRPID
}) => {
  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
      requireUserVerification: false
    })

    if (!verification.verified || !verification.registrationInfo) {
      return { verified: false, error: 'Verification failed' }
    }

    return {
      verified: true,
      registrationInfo: verification.registrationInfo
    }
  } catch (error) {
    console.error('WebAuthn registration verification error:', error)
    return { verified: false, error: error.message }
  }
}

/**
 * 生成认证选项
 * @param {Object} params
 * @param {string} params.userId - 用户 ID
 * @param {string} params.rpId - Relying Party ID
 * @param {Object} params.db - D1 数据库实例
 * @returns {Promise<Object>}
 */
export const createAuthenticationOptions = async ({ userId, rpId, db }) => {
  const credentials = await findCredentialsByUserId(db, userId)

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    allowCredentials: credentials.map((cred) => ({
      id: cred.id,
      transports: cred.transports
    })),
    userVerification: WEBAUTHN_CONFIG.USER_VERIFICATION
  })

  return options
}

/**
 * 验证认证响应
 * @param {Object} params
 * @param {Object} params.response - 前端返回的认证响应
 * @param {string} params.expectedChallenge - 预期的挑战值
 * @param {string} params.expectedOrigin - 预期的 Origin
 * @param {string} params.expectedRPID - 预期的 RP ID
 * @param {Object} params.db - D1 数据库实例
 * @returns {Promise<{verified: boolean, credentialId?: string, newCounter?: number, counterWarning?: boolean, error?: string}>}
 */
export const verifyAuthentication = async ({
  response,
  expectedChallenge,
  expectedOrigin,
  expectedRPID,
  db
}) => {
  try {
    // 查找凭证
    const credential = await findCredentialById(db, response.id)
    if (!credential) {
      return { verified: false, error: 'Credential not found' }
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
      credential: {
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: credential.transports
      },
      requireUserVerification: false
    })

    if (!verification.verified) {
      return { verified: false, error: 'Verification failed' }
    }

    // 检查计数器是否有异常 (可能是凭证被克隆)
    const counterWarning =
      verification.authenticationInfo.newCounter <= credential.counter && credential.counter > 0

    if (counterWarning) {
      console.warn(
        `Security warning: counter not incremented for credential ${credential.id}. ` +
          `Old: ${credential.counter}, New: ${verification.authenticationInfo.newCounter}`
      )
    }

    return {
      verified: true,
      credentialId: credential.id,
      userId: credential.userId,
      newCounter: verification.authenticationInfo.newCounter,
      counterWarning
    }
  } catch (error) {
    console.error('WebAuthn authentication verification error:', error)
    return { verified: false, error: error.message }
  }
}

/**
 * 获取设备类型描述
 * @param {Object} authenticatorData - 认证器数据
 * @returns {string}
 */
export const getDeviceType = (authenticatorData) => {
  if (!authenticatorData) return 'unknown'

  // 基于 AAGUID 或其他特征判断设备类型
  // 这里简化处理，实际可以根据 AAGUID 数据库查询
  return 'platform'
}

/**
 * 生成设备默认名称
 * @param {string[]} transports - 传输方式
 * @param {string} [deviceType] - 设备类型 (singleDevice/multiDevice)
 * @returns {string}
 */
export const generateDeviceName = (transports = [], deviceType) => {
  // 优先判断 internal（平台认证器，如指纹、面部识别）
  if (transports.includes('internal')) {
    return '内置认证器'
  }
  // hybrid 通常是手机作为认证器
  if (transports.includes('hybrid')) {
    return '手机认证器'
  }
  // 如果只有 usb，可能是硬件安全密钥
  if (transports.includes('usb')) {
    return 'USB 安全密钥'
  }
  if (transports.includes('nfc')) {
    return 'NFC 安全密钥'
  }
  if (transports.includes('ble')) {
    return '蓝牙安全密钥'
  }
  return '安全密钥'
}
