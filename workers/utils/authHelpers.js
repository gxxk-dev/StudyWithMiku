/**
 * @module workers/utils/authHelpers
 * @description WebAuthn 认证共享工具函数
 */

import { MERGE_TOKEN_TTL } from '../constants.js'

/**
 * 获取 AuthChallenge Durable Object 实例
 */
export const getChallengeStore = (env) => {
  const id = env.AUTH_CHALLENGE.idFromName('global')
  return env.AUTH_CHALLENGE.get(id)
}

/**
 * 生成挑战 ID
 */
export const generateChallengeId = () => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * 存储 merge token 到 Durable Object
 */
export const storeMergeToken = async (env, token, data) => {
  const store = getChallengeStore(env)
  await store.fetch(new URL('http://internal').href, {
    method: 'PUT',
    body: JSON.stringify({
      challengeId: token,
      ttl: MERGE_TOKEN_TTL,
      ...data
    })
  })
}

/**
 * 获取 merge token 数据
 */
export const getMergeToken = async (env, token) => {
  const store = getChallengeStore(env)
  const res = await store.fetch(new URL(`http://internal?id=${token}`).href)
  if (!res.ok) return null
  return res.json()
}

/**
 * 删除 merge token（消费后防止重放）
 */
export const deleteMergeToken = async (env, token) => {
  const store = getChallengeStore(env)
  await store.fetch(new URL(`http://internal?id=${token}`).href, { method: 'DELETE' })
}
