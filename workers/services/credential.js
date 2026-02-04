/**
 * @module workers/services/credential
 * @description WebAuthn 凭证 CRUD 服务
 */

/**
 * 保存新的 WebAuthn 凭证
 * @param {Object} db - D1 数据库实例
 * @param {Object} params
 * @param {string} params.credentialId - 凭证 ID (base64url 编码)
 * @param {string} params.userId - 用户 ID
 * @param {Uint8Array} params.publicKey - 公钥
 * @param {number} params.counter - 签名计数器
 * @param {string[]} [params.transports] - 传输方式
 * @param {string} [params.deviceType] - 设备类型
 * @param {string} [params.deviceName] - 设备名称
 * @param {boolean} [params.backedUp] - 是否已备份
 * @returns {Promise<void>}
 */
export const saveCredential = async (
  db,
  { credentialId, userId, publicKey, counter, transports, deviceType, deviceName, backedUp }
) => {
  await db
    .prepare(
      `INSERT INTO credentials (id, user_id, public_key, counter, transports, device_type, device_name, backed_up)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      credentialId,
      userId,
      publicKey,
      counter,
      transports ? JSON.stringify(transports) : null,
      deviceType || null,
      deviceName || null,
      backedUp ? 1 : 0
    )
    .run()
}

/**
 * 通过凭证 ID 查找凭证
 * @param {Object} db - D1 数据库实例
 * @param {string} credentialId - 凭证 ID
 * @returns {Promise<Object|null>}
 */
export const findCredentialById = async (db, credentialId) => {
  const row = await db.prepare('SELECT * FROM credentials WHERE id = ?').bind(credentialId).first()

  if (!row) return null

  return {
    ...row,
    transports: row.transports ? JSON.parse(row.transports) : [],
    backed_up: !!row.backed_up
  }
}

/**
 * 获取用户的所有凭证
 * @param {Object} db - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object[]>}
 */
export const findCredentialsByUserId = async (db, userId) => {
  const { results } = await db
    .prepare('SELECT * FROM credentials WHERE user_id = ?')
    .bind(userId)
    .all()

  return results.map((row) => ({
    ...row,
    transports: row.transports ? JSON.parse(row.transports) : [],
    backed_up: !!row.backed_up
  }))
}

/**
 * 更新凭证的签名计数器
 * @param {Object} db - D1 数据库实例
 * @param {string} credentialId - 凭证 ID
 * @param {number} newCounter - 新的计数器值
 * @returns {Promise<void>}
 */
export const updateCredentialCounter = async (db, credentialId, newCounter) => {
  await db
    .prepare('UPDATE credentials SET counter = ? WHERE id = ?')
    .bind(newCounter, credentialId)
    .run()
}

/**
 * 删除凭证
 * @param {Object} db - D1 数据库实例
 * @param {string} credentialId - 凭证 ID
 * @param {string} userId - 用户 ID (确保只能删除自己的凭证)
 * @returns {Promise<boolean>} 是否成功删除
 */
export const deleteCredential = async (db, credentialId, userId) => {
  const result = await db
    .prepare('DELETE FROM credentials WHERE id = ? AND user_id = ?')
    .bind(credentialId, userId)
    .run()

  return result.meta.changes > 0
}

/**
 * 获取用户凭证数量
 * @param {Object} db - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<number>}
 */
export const getCredentialCount = async (db, userId) => {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM credentials WHERE user_id = ?')
    .bind(userId)
    .first()

  return result?.count || 0
}

/**
 * 格式化凭证信息用于 API 返回 (不包含敏感数据)
 * @param {Object} credential - 数据库凭证记录
 * @returns {Object}
 */
export const formatCredentialForResponse = (credential) => {
  return {
    id: credential.id,
    deviceType: credential.device_type,
    deviceName: credential.device_name,
    transports: credential.transports,
    backedUp: credential.backed_up
  }
}
