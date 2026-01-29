/**
 * Vite 插件：从源文件中提取 JSDoc 注释生成帮助元数据
 *
 * 在构建时解析指定模块的 JSDoc 注释，生成 help-metadata.json
 * 供运行时帮助系统使用
 */
import { parse } from 'comment-parser'
import fs from 'fs'
import path from 'path'

// 需要提取帮助的模块文件
const TARGET_FILES = {
  playlist: 'src/composables/usePlaylistManager.js',
  audio: 'src/services/localAudioStorage.js',
  io: 'src/services/playlistImportExport.js',
  music: 'src/composables/useMusic.js',
  focus: 'src/composables/useFocus.js',
  exportUtils: 'src/utils/exportUtils.js',
  server: 'src/services/onlineServer.js',
  config: 'src/services/runtimeConfig.js'
}

const DEFAULT_DESCRIPTIONS = {
  playlist: '歌单管理 - CRUD 操作、持久化和状态管理',
  audio: '本地音频存储 - OPFS 和 FileHandle 管理',
  io: '导入导出 - 歌单数据的导入导出',
  music: '音乐播放 - 歌单加载和播放控制',
  focus: '番茄钟系统 - 计时、记录、统计',
  exportUtils: '数据导出工具 - JSON/CSV/Markdown 格式转换',
  server: '在线服务器连接 - WebSocket 管理',
  config: '运行时配置 - 动态修改应用配置'
}

/**
 * 从文件内容中提取模块帮助信息
 * @param {string} content - 文件内容
 * @param {string} moduleName - 模块名称
 * @returns {object} 模块帮助元数据
 */
function extractModuleHelp(content, moduleName) {
  const parsed = parse(content)
  const methods = {}

  // 提取文件顶部的模块描述
  const moduleBlock = parsed.find((block) =>
    block.tags.some((t) => t.tag === 'module' || t.tag === 'file')
  )
  const moduleDesc = moduleBlock?.description || DEFAULT_DESCRIPTIONS[moduleName] || '(无描述)'

  // 将 JSDoc 块与其对应的函数名关联
  // 通过分析 JSDoc 块在源码中的位置来匹配函数
  const lines = content.split('\n')

  for (const block of parsed) {
    if (!block.source || block.source.length === 0) continue

    // 获取 JSDoc 块结束后的行号
    const lastSourceLine = block.source[block.source.length - 1]
    const endLineNumber = lastSourceLine.number

    // 查找紧随 JSDoc 之后的函数声明
    let funcName = null
    for (let i = endLineNumber + 1; i < Math.min(endLineNumber + 5, lines.length); i++) {
      const line = lines[i]
      if (!line || line.trim() === '') continue

      // 匹配各种函数声明模式
      const patterns = [
        // const funcName = (params) => ...
        /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/,
        // function funcName(params) ...
        /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/,
        // const funcName = async (params) => ...
        /(?:export\s+)?const\s+(\w+)\s*=\s*async\s*\(/,
        // funcName: (params) => ... (对象方法)
        /(\w+)\s*:\s*(?:async\s*)?\(/,
        // funcName(params) { ... (对象简写方法)
        /(\w+)\s*\([^)]*\)\s*\{/
      ]

      for (const pattern of patterns) {
        const match = line.match(pattern)
        if (match) {
          funcName = match[1]
          break
        }
      }

      if (funcName) break
    }

    // 跳过没有找到函数名的块，或者是模块级注释
    if (!funcName) continue
    if (block.tags.some((t) => t.tag === 'module' || t.tag === 'file')) continue

    // 提取方法信息
    methods[funcName] = {
      description: block.description || '',
      params: block.tags
        .filter((t) => t.tag === 'param')
        .map((t) => ({
          name: t.name,
          type: t.type,
          description: t.description,
          optional: t.optional
        })),
      returns: (() => {
        const ret = block.tags.find((t) => t.tag === 'returns' || t.tag === 'return')
        return ret ? { type: ret.type, description: ret.description } : null
      })(),
      example: block.tags.find((t) => t.tag === 'example')?.description || null,
      async: block.tags.some((t) => t.tag === 'async')
    }
  }

  return {
    description: moduleDesc,
    methods
  }
}

/**
 * 生成帮助元数据
 * @param {string} rootDir - 项目根目录
 * @returns {object} 所有模块的帮助元数据
 */
function generateMetadata(rootDir) {
  const metadata = {}

  for (const [moduleName, filePath] of Object.entries(TARGET_FILES)) {
    const fullPath = path.resolve(rootDir, filePath)

    if (!fs.existsSync(fullPath)) {
      console.warn(`[jsdoc-help-extractor] 文件不存在: ${filePath}`)
      metadata[moduleName] = {
        description: DEFAULT_DESCRIPTIONS[moduleName] || '(无描述)',
        methods: {}
      }
      continue
    }

    const content = fs.readFileSync(fullPath, 'utf-8')
    metadata[moduleName] = extractModuleHelp(content, moduleName)
  }

  return metadata
}

/**
 * Vite 插件：JSDoc 帮助提取器
 * @returns {import('vite').Plugin}
 */
export default function jsdocHelpExtractor() {
  let rootDir = process.cwd()

  return {
    name: 'jsdoc-help-extractor',

    configResolved(config) {
      rootDir = config.root
    },

    buildStart() {
      const metadata = generateMetadata(rootDir)
      const publicPath = path.resolve(rootDir, 'public/help-metadata.json')

      // 确保 public 目录存在
      const publicDir = path.dirname(publicPath)
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true })
      }

      fs.writeFileSync(publicPath, JSON.stringify(metadata, null, 2))
      console.log('[jsdoc-help-extractor] 已生成 public/help-metadata.json')
    },

    generateBundle() {
      const publicPath = path.resolve(rootDir, 'public/help-metadata.json')

      if (fs.existsSync(publicPath)) {
        this.emitFile({
          type: 'asset',
          fileName: 'help-metadata.json',
          source: fs.readFileSync(publicPath, 'utf-8')
        })
      }
    }
  }
}
