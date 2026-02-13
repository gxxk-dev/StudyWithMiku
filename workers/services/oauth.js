/**
 * @module workers/services/oauth
 * @description OAuth 认证处理服务
 */

import { OAUTH_CONFIG, AUTH_PROVIDER } from '../constants.js'

const LINUXDO_AVATAR_BASE = 'https://linux.do'

/**
 * 生成 OAuth state 参数
 * @returns {string}
 */
export const generateOAuthState = () => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * 构建 GitHub OAuth 授权 URL
 * @param {Object} params
 * @param {string} params.clientId - GitHub Client ID
 * @param {string} params.redirectUri - 回调 URL
 * @param {string} params.state - CSRF state
 * @returns {string}
 */
export const buildGitHubAuthUrl = ({ clientId, redirectUri, state }) => {
  const url = new URL(OAUTH_CONFIG.GITHUB.AUTHORIZE_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', OAUTH_CONFIG.GITHUB.SCOPE)
  url.searchParams.set('state', state)
  return url.toString()
}

/**
 * 交换 GitHub 授权码获取 Token
 * @param {Object} params
 * @param {string} params.code - 授权码
 * @param {string} params.clientId - GitHub Client ID
 * @param {string} params.clientSecret - GitHub Client Secret
 * @param {string} params.redirectUri - 回调 URL
 * @returns {Promise<{accessToken?: string, error?: string}>}
 */
export const exchangeGitHubCode = async ({ code, clientId, clientSecret, redirectUri }) => {
  try {
    const response = await fetch(OAUTH_CONFIG.GITHUB.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      })
    })

    const data = await response.json()

    if (data.error) {
      return { error: data.error_description || data.error }
    }

    return { accessToken: data.access_token }
  } catch (error) {
    return { error: error.message }
  }
}

/**
 * 获取 GitHub 用户信息
 * @param {string} accessToken - GitHub Access Token
 * @returns {Promise<{user?: Object, error?: string}>}
 */
export const getGitHubUser = async (accessToken) => {
  try {
    const response = await fetch(OAUTH_CONFIG.GITHUB.USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'User-Agent': 'StudyWithMiku'
      }
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('GitHub API error:', response.status, text)
      return { error: `GitHub API error: ${response.status}` }
    }

    const data = await response.json()

    return {
      user: {
        provider: AUTH_PROVIDER.GITHUB,
        providerId: String(data.id),
        username: data.login,
        displayName: data.name || data.login,
        avatarUrl: data.avatar_url,
        email: data.email
      }
    }
  } catch (error) {
    console.error('GitHub fetch exception:', error)
    return { error: error.message }
  }
}

/**
 * 构建 Google OAuth 授权 URL
 * @param {Object} params
 * @param {string} params.clientId - Google Client ID
 * @param {string} params.redirectUri - 回调 URL
 * @param {string} params.state - CSRF state
 * @returns {string}
 */
export const buildGoogleAuthUrl = ({ clientId, redirectUri, state }) => {
  const url = new URL(OAUTH_CONFIG.GOOGLE.AUTHORIZE_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', OAUTH_CONFIG.GOOGLE.SCOPE)
  url.searchParams.set('state', state)
  url.searchParams.set('access_type', 'offline')
  return url.toString()
}

/**
 * 交换 Google 授权码获取 Token
 * @param {Object} params
 * @param {string} params.code - 授权码
 * @param {string} params.clientId - Google Client ID
 * @param {string} params.clientSecret - Google Client Secret
 * @param {string} params.redirectUri - 回调 URL
 * @returns {Promise<{accessToken?: string, error?: string}>}
 */
export const exchangeGoogleCode = async ({ code, clientId, clientSecret, redirectUri }) => {
  try {
    const response = await fetch(OAUTH_CONFIG.GOOGLE.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    const data = await response.json()

    if (data.error) {
      return { error: data.error_description || data.error }
    }

    return { accessToken: data.access_token }
  } catch (error) {
    return { error: error.message }
  }
}

/**
 * 获取 Google 用户信息
 * @param {string} accessToken - Google Access Token
 * @returns {Promise<{user?: Object, error?: string}>}
 */
export const getGoogleUser = async (accessToken) => {
  try {
    const response = await fetch(OAUTH_CONFIG.GOOGLE.USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      return { error: 'Failed to fetch user info' }
    }

    const data = await response.json()

    return {
      user: {
        provider: AUTH_PROVIDER.GOOGLE,
        providerId: data.id,
        username: data.email?.split('@')[0] || `google_${data.id}`,
        displayName: data.name,
        avatarUrl: data.picture,
        email: data.email
      }
    }
  } catch (error) {
    return { error: error.message }
  }
}

/**
 * 构建 Microsoft OAuth 授权 URL
 * @param {Object} params
 * @param {string} params.clientId - Microsoft Client ID
 * @param {string} params.tenantId - Azure AD Tenant ID
 * @param {string} params.redirectUri - 回调 URL
 * @param {string} params.state - CSRF state
 * @returns {string}
 */
export const buildMicrosoftAuthUrl = ({ clientId, tenantId, redirectUri, state }) => {
  const authorizeUrl = OAUTH_CONFIG.MICROSOFT.AUTHORIZE_URL.replace('{tenant}', tenantId)
  const url = new URL(authorizeUrl)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', OAUTH_CONFIG.MICROSOFT.SCOPE)
  url.searchParams.set('state', state)
  url.searchParams.set('response_mode', 'query')
  return url.toString()
}

/**
 * 交换 Microsoft 授权码获取 Token
 * @param {Object} params
 * @param {string} params.code - 授权码
 * @param {string} params.clientId - Microsoft Client ID
 * @param {string} params.clientSecret - Microsoft Client Secret
 * @param {string} params.tenantId - Azure AD Tenant ID
 * @param {string} params.redirectUri - 回调 URL
 * @returns {Promise<{accessToken?: string, error?: string}>}
 */
export const exchangeMicrosoftCode = async ({
  code,
  clientId,
  clientSecret,
  tenantId,
  redirectUri
}) => {
  try {
    const tokenUrl = OAUTH_CONFIG.MICROSOFT.TOKEN_URL.replace('{tenant}', tenantId)

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: OAUTH_CONFIG.MICROSOFT.SCOPE
      })
    })

    const data = await response.json()

    if (data.error) {
      return { error: data.error_description || data.error }
    }

    return { accessToken: data.access_token }
  } catch (error) {
    return { error: error.message }
  }
}

/**
 * 获取 Microsoft 用户信息
 * @param {string} accessToken - Microsoft Access Token
 * @returns {Promise<{user?: Object, error?: string}>}
 */
export const getMicrosoftUser = async (accessToken) => {
  try {
    const response = await fetch(OAUTH_CONFIG.MICROSOFT.USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      return { error: 'Failed to fetch user info' }
    }

    const data = await response.json()

    return {
      user: {
        provider: AUTH_PROVIDER.MICROSOFT,
        providerId: data.id,
        username: data.userPrincipalName?.split('@')[0] || `ms_${data.id}`,
        displayName: data.displayName,
        avatarUrl: null, // Microsoft Graph 需要额外请求获取头像
        email: data.mail || data.userPrincipalName
      }
    }
  } catch (error) {
    return { error: error.message }
  }
}

/**
 * 构建 LINUX DO OAuth 授权 URL
 * @param {Object} params
 * @param {string} params.clientId - LINUX DO Client ID
 * @param {string} params.redirectUri - 回调 URL
 * @param {string} params.state - CSRF state
 * @returns {string}
 */
export const buildLinuxDoAuthUrl = ({ clientId, redirectUri, state }) => {
  const url = new URL(OAUTH_CONFIG.LINUXDO.AUTHORIZE_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', OAUTH_CONFIG.LINUXDO.SCOPE)
  url.searchParams.set('state', state)
  return url.toString()
}

/**
 * 交换 LINUX DO 授权码获取 Token
 * @param {Object} params
 * @param {string} params.code - 授权码
 * @param {string} params.clientId - LINUX DO Client ID
 * @param {string} params.clientSecret - LINUX DO Client Secret
 * @param {string} params.redirectUri - 回调 URL
 * @returns {Promise<{accessToken?: string, error?: string}>}
 */
export const exchangeLinuxDoCode = async ({ code, clientId, clientSecret, redirectUri }) => {
  try {
    const response = await fetch(OAUTH_CONFIG.LINUXDO.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    })

    const data = await response.json()

    if (data.error) {
      return { error: data.error_description || data.error }
    }

    return { accessToken: data.access_token }
  } catch (error) {
    return { error: error.message }
  }
}

/**
 * 获取 LINUX DO 用户信息
 * @param {string} accessToken - LINUX DO Access Token
 * @returns {Promise<{user?: Object, error?: string}>}
 */
export const getLinuxDoUser = async (accessToken) => {
  try {
    const response = await fetch(OAUTH_CONFIG.LINUXDO.USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      return { error: `LINUX DO API error: ${response.status}` }
    }

    const data = await response.json()

    // avatar_template 可能是相对路径如 "/user_avatar/linux.do/..."
    let avatarUrl = null
    if (data.avatar_template) {
      const tpl = data.avatar_template.replace('{size}', '240')
      avatarUrl = tpl.startsWith('http') ? tpl : `${LINUXDO_AVATAR_BASE}${tpl}`
    }

    return {
      user: {
        provider: AUTH_PROVIDER.LINUXDO,
        providerId: String(data.id),
        username: data.username,
        displayName: data.name || data.username,
        avatarUrl,
        email: null // LINUX DO Connect 不提供 email
      }
    }
  } catch (error) {
    return { error: error.message }
  }
}
