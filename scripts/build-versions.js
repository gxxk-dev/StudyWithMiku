/**
 * @module build-versions
 * 多版本构建脚本
 *
 * 读取所有 v* Git tags，使用 git worktree 为每个 tag 构建，
 * 将产物放入 dist/v/{version}/，并生成 versions.json 版本清单。
 *
 * 用法：node scripts/build-versions.js
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, cpSync, writeFileSync, rmSync } from 'fs'
import { resolve } from 'path'

const ROOT_DIR = resolve(import.meta.dirname, '..')
const DIST_DIR = resolve(ROOT_DIR, 'dist')
const WORKTREE_BASE = resolve(ROOT_DIR, '.version-worktrees')

/**
 * 执行 shell 命令并返回 stdout
 * @param {string} cmd - 命令
 * @param {object} [options] - execSync 选项
 * @returns {string}
 */
function run(cmd, options = {}) {
  return execSync(cmd, { encoding: 'utf-8', cwd: ROOT_DIR, ...options }).trim()
}

/**
 * 获取所有 v* tags 及其日期，按版本降序排列
 * @returns {Array<{tag: string, date: string}>}
 */
function getVersionTags() {
  let output
  try {
    output = run(
      'git tag -l "v*" --sort=-version:refname --format="%(refname:short)|%(creatordate:short)"'
    )
  } catch {
    return []
  }

  if (!output) return []

  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [rawTag, date] = line.split('|')
      const tag = rawTag.replace(/^v/, '')
      return { tag, date }
    })
}

/**
 * 为指定 tag 构建版本产物
 * @param {string} tag - 版本号（不含 v 前缀）
 */
function buildVersion(tag) {
  const worktreeDir = resolve(WORKTREE_BASE, tag)
  const versionDistDir = resolve(DIST_DIR, 'v', tag)

  console.log(`\n--- 构建 v${tag} ---`)

  try {
    // 创建 worktree
    if (existsSync(worktreeDir)) {
      run(`git worktree remove "${worktreeDir}" --force`)
    }
    run(`git worktree add "${worktreeDir}" "v${tag}"`)

    // 安装依赖并构建
    console.log('  安装依赖...')
    run('bun install --frozen-lockfile', { cwd: worktreeDir })
    console.log('  构建中...')
    run('bun run build', { cwd: worktreeDir })

    // 复制构建产物到 dist/v/{tag}/
    const buildOutput = resolve(worktreeDir, 'dist')
    if (!existsSync(buildOutput)) {
      console.error(`  构建产物不存在: ${buildOutput}`)
      return false
    }

    mkdirSync(versionDistDir, { recursive: true })
    cpSync(buildOutput, versionDistDir, { recursive: true })
    console.log(`  产物已复制到 ${versionDistDir}`)

    return true
  } catch (e) {
    console.error(`  构建 v${tag} 失败:`, e.message)
    return false
  } finally {
    // 清理 worktree
    try {
      run(`git worktree remove "${worktreeDir}" --force`)
    } catch {
      // 忽略清理错误
    }
  }
}

/**
 * 主流程
 */
function main() {
  const tags = getVersionTags()

  if (tags.length === 0) {
    console.log('没有找到 v* tags，跳过版本构建。')
    writeVersionsJson([])
    return
  }

  console.log(`找到 ${tags.length} 个版本 tags:`, tags.map((t) => `v${t.tag}`).join(', '))

  // 确保 dist 目录存在
  mkdirSync(resolve(DIST_DIR, 'v'), { recursive: true })

  // 确保 worktree 基础目录存在
  mkdirSync(WORKTREE_BASE, { recursive: true })

  const builtVersions = []

  for (const { tag, date } of tags) {
    const success = buildVersion(tag)
    if (success) {
      builtVersions.push({ tag, date })
    }
  }

  // 生成 versions.json
  writeVersionsJson(builtVersions)

  // 清理 worktree 基础目录
  try {
    rmSync(WORKTREE_BASE, { recursive: true, force: true })
  } catch {
    // 忽略
  }

  console.log(`\n构建完成！成功 ${builtVersions.length}/${tags.length} 个版本。`)
}

/**
 * 生成 versions.json
 * @param {Array<{tag: string, date: string}>} versions
 */
function writeVersionsJson(versions) {
  const manifest = {
    latest: versions.length > 0 ? versions[0].tag : null,
    versions
  }

  const outputPath = resolve(DIST_DIR, 'versions.json')
  mkdirSync(DIST_DIR, { recursive: true })
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2))
  console.log(`versions.json 已生成: ${outputPath}`)
}

main()
