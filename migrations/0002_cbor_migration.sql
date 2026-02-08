-- Migration: CBOR 数据格式迁移
-- 将 user_data 表的 data 字段从 TEXT 改为 BLOB，并添加 data_format 字段

-- 1. 创建新表
CREATE TABLE user_data_new (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL,
  data BLOB NOT NULL,
  data_format TEXT NOT NULL DEFAULT 'json',
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, data_type)
);

-- 2. 迁移数据（保持 JSON 格式，后续通过脚本转换为 CBOR）
INSERT INTO user_data_new (user_id, data_type, data, data_format, version)
SELECT user_id, data_type, CAST(data AS BLOB), 'json', version
FROM user_data;

-- 3. 删除旧表
DROP TABLE user_data;

-- 4. 重命名新表
ALTER TABLE user_data_new RENAME TO user_data;
