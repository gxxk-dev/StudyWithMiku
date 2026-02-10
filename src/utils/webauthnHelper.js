/**
 * @fileoverview WebAuthn 浏览器 API 封装
 * @module utils/webauthnHelper
 */

/**
 * 检查浏览器是否支持 WebAuthn
 * @returns {boolean} 是否支持
 */
export const isWebAuthnSupported = () => {
  return !!(
    window.PublicKeyCredential &&
    navigator.credentials &&
    navigator.credentials.create &&
    navigator.credentials.get
  )
}

/**
 * 检查是否支持平台认证器（如 Touch ID、Face ID、Windows Hello）
 * @returns {Promise<boolean>} 是否支持
 */
export const isPlatformAuthenticatorAvailable = async () => {
  if (!isWebAuthnSupported()) return false

  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch (error) {
    console.error('检查平台认证器失败:', error)
    return false
  }
}

/**
 * Base64URL 字符串转 ArrayBuffer
 * @param {string} base64URL - Base64URL 编码的字符串
 * @returns {ArrayBuffer} ArrayBuffer
 */
export const base64URLToBuffer = (base64URL) => {
  // 将 Base64URL 转换为 Base64
  const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/')

  // 补齐 padding
  const padLength = (4 - (base64.length % 4)) % 4
  const paddedBase64 = base64 + '='.repeat(padLength)

  // 解码 Base64
  const binaryString = atob(paddedBase64)

  // 转换为 Uint8Array
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes.buffer
}

/**
 * ArrayBuffer 转 Base64URL 字符串
 * @param {ArrayBuffer} buffer - ArrayBuffer
 * @returns {string} Base64URL 编码的字符串
 */
export const bufferToBase64URL = (buffer) => {
  // 转换为 Uint8Array
  const bytes = new Uint8Array(buffer)

  // 转换为二进制字符串
  let binaryString = ''
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i])
  }

  // 编码为 Base64
  const base64 = btoa(binaryString)

  // 转换为 Base64URL（移除 padding，替换字符）
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * 转换服务器返回的注册选项为浏览器 API 格式
 * @param {Object} options - 服务器返回的选项
 * @returns {Object} 浏览器 API 格式的选项
 */
export const parseRegisterOptions = (options) => {
  return {
    publicKey: {
      challenge: base64URLToBuffer(options.challenge),
      rp: options.rp,
      user: {
        id: base64URLToBuffer(options.user.id),
        name: options.user.name,
        displayName: options.user.displayName
      },
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      attestation: options.attestation,
      authenticatorSelection: options.authenticatorSelection,
      excludeCredentials: options.excludeCredentials?.map((cred) => ({
        id: base64URLToBuffer(cred.id),
        type: cred.type,
        transports: cred.transports
      }))
    }
  }
}

/**
 * 转换服务器返回的登录选项为浏览器 API 格式
 * @param {Object} options - 服务器返回的选项
 * @returns {Object} 浏览器 API 格式的选项
 */
export const parseLoginOptions = (options) => {
  return {
    publicKey: {
      challenge: base64URLToBuffer(options.challenge),
      timeout: options.timeout,
      rpId: options.rpId,
      allowCredentials: options.allowCredentials?.map((cred) => ({
        id: base64URLToBuffer(cred.id),
        type: cred.type,
        transports: cred.transports
      })),
      userVerification: options.userVerification
    }
  }
}

/**
 * 转换浏览器返回的凭据为服务器 API 格式
 * @param {PublicKeyCredential} credential - 浏览器返回的凭据
 * @param {boolean} isRegistration - 是否为注册流程
 * @returns {Object} 服务器 API 格式的凭据
 */
export const serializeCredential = (credential, isRegistration = false) => {
  const response = {
    id: credential.id,
    rawId: bufferToBase64URL(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON)
    }
  }

  if (isRegistration) {
    // 注册流程
    response.response.attestationObject = bufferToBase64URL(credential.response.attestationObject)

    // 可选：传输方式（放在 response.response 内部，与后端 schema 一致）
    if (credential.response.getTransports) {
      response.response.transports = credential.response.getTransports()
    }
  } else {
    // 登录流程
    response.response.authenticatorData = bufferToBase64URL(credential.response.authenticatorData)
    response.response.signature = bufferToBase64URL(credential.response.signature)

    // 可选：用户句柄
    if (credential.response.userHandle) {
      response.response.userHandle = bufferToBase64URL(credential.response.userHandle)
    }
  }

  return response
}

/**
 * 创建凭据（注册）
 * @param {Object} options - 注册选项
 * @returns {Promise<Object>} 序列化后的凭据
 */
export const createCredential = async (options) => {
  if (!isWebAuthnSupported()) {
    throw new Error('浏览器不支持 WebAuthn')
  }

  try {
    const parsedOptions = parseRegisterOptions(options)
    const credential = await navigator.credentials.create(parsedOptions)

    if (!credential) {
      throw new Error('创建凭据失败')
    }

    return serializeCredential(credential, true)
  } catch (error) {
    // 处理用户取消等常见错误
    if (error.name === 'NotAllowedError') {
      throw new Error('用户取消了操作或超时')
    } else if (error.name === 'InvalidStateError') {
      throw new Error('该设备已注册')
    } else if (error.name === 'NotSupportedError') {
      throw new Error('不支持的认证器类型')
    }

    throw error
  }
}

/**
 * 获取凭据（登录）
 * @param {Object} options - 登录选项
 * @returns {Promise<Object>} 序列化后的凭据
 */
export const getCredential = async (options) => {
  if (!isWebAuthnSupported()) {
    throw new Error('浏览器不支持 WebAuthn')
  }

  try {
    const parsedOptions = parseLoginOptions(options)
    const credential = await navigator.credentials.get(parsedOptions)

    if (!credential) {
      throw new Error('获取凭据失败')
    }

    return serializeCredential(credential, false)
  } catch (error) {
    // 处理用户取消等常见错误
    if (error.name === 'NotAllowedError') {
      throw new Error('用户取消了操作或超时')
    } else if (error.name === 'NotFoundError') {
      throw new Error('未找到匹配的凭据')
    }

    throw error
  }
}

/**
 * 获取认证器类型描述
 * @param {string} authenticatorAttachment - 认证器附件类型
 * @returns {string} 描述文本
 */
export const getAuthenticatorTypeDescription = (authenticatorAttachment) => {
  switch (authenticatorAttachment) {
    case 'platform':
      return '平台认证器（如 Touch ID、Face ID、Windows Hello）'
    case 'cross-platform':
      return '外部认证器（如安全密钥）'
    default:
      return '未知认证器类型'
  }
}

/**
 * 获取用户验证要求描述
 * @param {string} userVerification - 用户验证要求
 * @returns {string} 描述文本
 */
export const getUserVerificationDescription = (userVerification) => {
  switch (userVerification) {
    case 'required':
      return '必须进行用户验证（如指纹、面部识别）'
    case 'preferred':
      return '优先进行用户验证'
    case 'discouraged':
      return '不建议进行用户验证'
    default:
      return '未指定用户验证要求'
  }
}
