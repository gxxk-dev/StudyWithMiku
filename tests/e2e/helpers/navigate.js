/**
 * E2E 测试页面导航工具
 */

/**
 * 打开设置模态框并导航到账号 tab
 * @param {import('@playwright/test').Page} page
 */
export const openAccountTab = async (page) => {
  // 点击设置图标（StatusPill 组件中的 settings-icon）
  await page.click('.settings-icon')

  // 等待设置模态框出现
  await page.waitForSelector('.settings-modal', { timeout: 5000 })

  // 点击账号 tab（SettingsSidebar 中的 nav-item）
  await page.click('.nav-item:has-text("账号")')

  // 等待 tab 内容加载
  await page.waitForSelector('.tab-content', { timeout: 5000 })
}

/**
 * 通过 page.evaluate 向 localStorage 注入认证状态
 * @param {import('@playwright/test').Page} page
 * @param {Object} user - 用户信息
 * @param {Object} tokens - Token 信息
 */
export const injectAuthState = async (page, user, tokens) => {
  await page.evaluate(
    ({ user, tokens }) => {
      localStorage.setItem('swm_user_info', JSON.stringify(user))
      localStorage.setItem('swm_access_token', tokens.accessToken)
      localStorage.setItem('swm_refresh_token', tokens.refreshToken)

      const expiresAt = Date.now() + tokens.expiresIn * 1000
      localStorage.setItem('swm_token_expires_at', expiresAt.toString())
      localStorage.setItem('swm_token_type', tokens.tokenType || 'Bearer')
    },
    { user, tokens }
  )
}

/**
 * 清除 localStorage 中的认证状态
 * @param {import('@playwright/test').Page} page
 */
export const clearAuthState = async (page) => {
  await page.evaluate(() => {
    localStorage.removeItem('swm_user_info')
    localStorage.removeItem('swm_access_token')
    localStorage.removeItem('swm_refresh_token')
    localStorage.removeItem('swm_token_expires_at')
    localStorage.removeItem('swm_token_type')
  })
}

/**
 * 获取 localStorage 中的认证状态
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Object>} { user, tokens }
 */
export const getAuthState = async (page) => {
  return page.evaluate(() => {
    const user = localStorage.getItem('swm_user_info')
    const accessToken = localStorage.getItem('swm_access_token')
    const refreshToken = localStorage.getItem('swm_refresh_token')
    const expiresAt = localStorage.getItem('swm_token_expires_at')
    const tokenType = localStorage.getItem('swm_token_type')

    return {
      user: user ? JSON.parse(user) : null,
      tokens: accessToken
        ? {
            accessToken,
            refreshToken,
            expiresAt: parseInt(expiresAt, 10),
            tokenType
          }
        : null
    }
  })
}
