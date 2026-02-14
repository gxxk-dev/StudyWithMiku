/**
 * App 启动引导 Composable
 *
 * 提取自 App.vue onMounted 中的：
 * - OAuth 回调处理
 * - 认证初始化 + 在线连接
 * - PWA 更新回调
 *
 * @module composables/useAppBootstrap
 */

/**
 * @param {Object} deps - 依赖注入
 * @param {Function} deps.showToast - Toast 通知函数
 * @param {Function} deps.showConfirm - 确认对话框函数
 * @param {Object} deps.auth - useAuth() 返回值
 * @param {Object} deps.onlineServer - 在线计数服务
 * @param {Object} deps.pwa - usePWA() 返回值
 * @param {Function} deps.setSwUpdateCallback - SW 更新回调设置函数
 * @param {import('vue').Ref} deps.settingsModalOpen - 设置面板开关
 * @param {import('vue').Ref} deps.settingsModalRef - 设置面板组件引用
 * @param {import('vue').Ref} deps.showMergeDialog - 合并对话框开关
 * @param {import('vue').Ref} deps.pendingMergeToken - 待合并 token
 * @param {import('vue').Ref} deps.pendingMergeType - 待合并类型
 * @param {import('vue').Ref} deps.pendingMergeHasData - 待合并是否有数据
 */
export function useAppBootstrap(deps) {
  const {
    showToast,
    showConfirm,
    auth,
    onlineServer,
    pwa,
    setSwUpdateCallback,
    settingsModalOpen,
    settingsModalRef,
    showMergeDialog,
    pendingMergeToken,
    pendingMergeType,
    pendingMergeHasData
  } = deps

  /**
   * 处理 OAuth 登录回调
   */
  const handleOAuth = async () => {
    const { handleOAuthCallback, handleOAuthLinkCallback, initialize: initAuth } = auth

    // 处理 OAuth 登录回调
    try {
      const oauthResult = await handleOAuthCallback()
      if (oauthResult) {
        console.log('OAuth 登录成功:', oauthResult.username || oauthResult.displayName)
        showToast('success', `欢迎，${oauthResult.displayName || oauthResult.username}！`)
      }
    } catch (err) {
      console.error('OAuth 回调处理失败:', err)
      showToast('error', err.message || 'OAuth 登录失败')
    }

    // 处理 OAuth 关联回调
    try {
      const linkResult = await handleOAuthLinkCallback()
      if (linkResult) {
        if (linkResult.success) {
          showToast('success', '第三方账号关联成功')
        } else if (linkResult.code === 'OAUTH_ALREADY_LINKED_SELF') {
          showToast('warning', '该第三方账号已关联到你的账号')
        } else if (linkResult.code === 'OAUTH_ALREADY_LINKED') {
          if (linkResult.mergeToken) {
            showMergeDialog.value = true
            pendingMergeToken.value = linkResult.mergeToken
            pendingMergeType.value = 'oauth'
            pendingMergeHasData.value = !!linkResult.hasData
          } else {
            showToast('error', '该第三方账号已被其他用户绑定')
          }
        } else {
          showToast('error', linkResult.error || '关联失败')
        }
      }
    } catch (err) {
      console.error('OAuth 关联回调处理失败:', err)
      showToast('error', err.message || '关联处理失败')
    }

    // 初始化认证状态
    initAuth()
  }

  /**
   * 连接在线计数服务器
   */
  const connectOnline = () => {
    onlineServer.connect()
  }

  /**
   * 设置 PWA 更新回调
   */
  const setupPWAUpdate = () => {
    const { setHasUpdate, refreshApp } = pwa
    setSwUpdateCallback(() => {
      console.log('检测到新版本可用')
      setHasUpdate(true)
      showConfirm('发现新版本', '应用有更新可用', {
        confirmText: '立即更新',
        cancelText: '稍后',
        onConfirm: () => refreshApp(true),
        extraActions: [
          {
            label: '查看更新',
            style: 'secondary',
            callback: () => {
              settingsModalOpen.value = true
              setTimeout(() => {
                settingsModalRef.value?.setActiveTab('changelog')
              }, 50)
            }
          }
        ]
      })
    })
  }

  /**
   * 执行全部启动引导
   */
  const bootstrap = async () => {
    await handleOAuth()
    connectOnline()
    setupPWAUpdate()
  }

  return {
    bootstrap,
    handleOAuth,
    connectOnline,
    setupPWAUpdate
  }
}
