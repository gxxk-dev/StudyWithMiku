/**
 * @module workers/routes/auth
 * @description WebAuthn 认证路由 — 组合所有子路由
 */

import { Hono } from 'hono'
import register from './register.js'
import login from './login.js'
import token from './token.js'
import profile from './profile.js'
import devices from './devices.js'
import methods from './methods.js'

const auth = new Hono()

/**
 * GET /config
 * 获取服务端认证配置
 */
auth.get('/config', (c) => {
  return c.json({
    webauthn: true,
    oauth: {
      github: !!c.env.GITHUB_CLIENT_ID && !!c.env.GITHUB_CLIENT_SECRET,
      google: !!c.env.GOOGLE_CLIENT_ID && !!c.env.GOOGLE_CLIENT_SECRET,
      microsoft: !!c.env.MICROSOFT_CLIENT_ID && !!c.env.MICROSOFT_CLIENT_SECRET,
      linuxdo: !!c.env.LINUXDO_CLIENT_ID && !!c.env.LINUXDO_CLIENT_SECRET
    }
  })
})

// 注册流程
auth.route('/register', register)

// 登录流程
auth.route('/login', login)

// Token 管理（refresh, logout 挂在根路径）
auth.route('/', token)

// 用户信息（me 挂在根路径）
auth.route('/', profile)

// 设备管理
auth.route('/devices', devices)

// 认证方法管理
auth.route('/methods', methods)

export default auth
