/**
 * @module workers/utils/avatar
 * @description 头像 URL 构建工具
 */

/**
 * 计算字符串的 SHA-256 哈希（十六进制）
 * @param {string} str
 * @returns {Promise<string>}
 */
export async function sha256Hex(str) {
  const data = new TextEncoder().encode(str)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 构建 Gravatar URL
 * @param {string} email
 * @returns {Promise<string>}
 */
export async function buildGravatarUrl(email) {
  const hash = await sha256Hex(email.trim().toLowerCase())
  return `https://www.gravatar.com/avatar/${hash}?d=404&s=80`
}

/**
 * 构建 Libravatar URL
 * @param {string} email
 * @returns {Promise<string>}
 */
export async function buildLibravatarUrl(email) {
  const hash = await sha256Hex(email.trim().toLowerCase())
  return `https://seccdn.libravatar.org/avatar/${hash}?d=404&s=80`
}

/**
 * 构建 QQ 头像 URL
 * @param {string} qqNumber
 * @returns {string}
 */
export function buildQQAvatarUrl(qqNumber) {
  return `https://q1.qlogo.cn/g?b=qq&nk=${qqNumber}&s=100`
}

/**
 * 解析所有可用头像 URL
 * @param {Object} params
 * @param {string|null} params.email
 * @param {string|null} params.qqNumber
 * @param {Array} [params.oauthAccounts]
 * @returns {Promise<Object>}
 */
export async function resolveAvatars({ email, qqNumber, oauthAccounts = [] }) {
  const avatars = {
    gravatar: null,
    libravatar: null,
    qq: null,
    oauth: null
  }

  if (email) {
    const [gravatar, libravatar] = await Promise.all([
      buildGravatarUrl(email),
      buildLibravatarUrl(email)
    ])
    avatars.gravatar = gravatar
    avatars.libravatar = libravatar
  }

  if (qqNumber) {
    avatars.qq = buildQQAvatarUrl(qqNumber)
  }

  const oauthAvatar = oauthAccounts.find((a) => a.avatarUrl)?.avatarUrl
  if (oauthAvatar) {
    avatars.oauth = oauthAvatar
  }

  return avatars
}
