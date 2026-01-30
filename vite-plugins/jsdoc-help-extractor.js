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

// 函数级标签，用于区分模块描述和方法描述
const FUNCTION_TAGS = ['param', 'returns', 'return', 'async', 'throws', 'example']

/**
 * 判断 JSDoc 块是否包含函数级标签
 * @param {object} block - comment-parser 解析的块
 * @returns {boolean}
 */
function hasFunctionTags(block) {
  return block.tags.some((t) => FUNCTION_TAGS.includes(t.tag))
}

/**
 * 提取模块描述（三级回退策略）
 * @param {object[]} parsed - comment-parser 解析结果
 * @param {string} moduleName - 模块名称
 * @returns {{ description: string, moduleBlockIndex: number }} 模块描述和对应块索引
 */
function extractModuleDescription(parsed, _moduleName) {
  // 策略1: 查找 @module 或 @file 标签
  const moduleBlockIndex = parsed.findIndex((block) =>
    block.tags.some((t) => t.tag === 'module' || t.tag === 'file')
  )
  if (moduleBlockIndex !== -1) {
    return {
      description: parsed[moduleBlockIndex].description || '(未提供模块描述)',
      moduleBlockIndex
    }
  }

  // 策略2: 检查第一个注释块是否在文件顶部且不含函数标签
  if (parsed.length > 0) {
    const firstBlock = parsed[0]
    const firstLine = firstBlock.source?.[0]?.number ?? -1

    // 文件顶部（第0-2行）且不含函数级标签，视为模块描述
    if (
      firstLine >= 0 &&
      firstLine <= 2 &&
      !hasFunctionTags(firstBlock) &&
      firstBlock.description
    ) {
      return {
        description: firstBlock.description,
        moduleBlockIndex: 0
      }
    }
  }

  // 策略3: 无法提取
  return {
    description: '(未提供模块描述)',
    moduleBlockIndex: -1
  }
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

  // 提取模块描述
  const { description: moduleDesc, moduleBlockIndex } = extractModuleDescription(parsed, moduleName)

  // 将 JSDoc 块与其对应的函数名关联
  // 通过分析 JSDoc 块在源码中的位置来匹配函数
  const lines = content.split('\n')

  for (let blockIndex = 0; blockIndex < parsed.length; blockIndex++) {
    const block = parsed[blockIndex]

    // 跳过已识别为模块描述的块
    if (blockIndex === moduleBlockIndex) continue

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

    // 跳过没有找到函数名的块
    if (!funcName) continue

    // 提取 @deprecated 标签
    const deprecatedTag = block.tags.find((t) => t.tag === 'deprecated')
    const deprecated = deprecatedTag ? deprecatedTag.description || true : null

    // 提取 @default 标签并关联到参数
    const defaultTags = block.tags.filter((t) => t.tag === 'default')
    const defaultMap = {}
    for (const dt of defaultTags) {
      // @default 标签的 name 字段是参数名，description 是默认值
      if (dt.name) {
        defaultMap[dt.name] = dt.description || dt.name
      }
    }

    // 提取方法信息
    methods[funcName] = {
      description: block.description || '',
      params: block.tags
        .filter((t) => t.tag === 'param')
        .map((t) => {
          const param = {
            name: t.name,
            type: t.type,
            description: t.description,
            optional: t.optional
          }
          // 关联 @default 值
          if (defaultMap[t.name]) {
            param.default = defaultMap[t.name]
          }
          return param
        }),
      returns: (() => {
        const ret = block.tags.find((t) => t.tag === 'returns' || t.tag === 'return')
        return ret ? { type: ret.type, description: ret.description } : null
      })(),
      example: block.tags.find((t) => t.tag === 'example')?.description || null,
      async: block.tags.some((t) => t.tag === 'async'),
      deprecated
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
        description: '(未提供模块描述)',
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
