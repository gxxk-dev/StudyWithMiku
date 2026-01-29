/**
 * 控制台格式化输出
 * 提供美观的帮助信息展示
 */

const STYLES = {
  title: 'color: #39c5bb; font-weight: bold; font-size: 14px',
  module: 'color: #4fc3f7; font-weight: bold',
  method: 'color: #81c784',
  param: 'color: #90a4ae',
  type: 'color: #78909c; font-style: italic',
  description: 'color: #b0bec5',
  ref: 'color: #ba68c8',
  example: 'color: #a5d6a7',
  reset: 'color: inherit'
}

/**
 * 构建带样式的控制台输出
 * 收集格式字符串和样式参数，最后一次性输出
 */
class ConsoleBuilder {
  constructor() {
    this.parts = []
    this.styles = []
  }

  /**
   * 添加带样式的文本
   * @param {string} text - 文本内容
   * @param {string} [style] - CSS 样式
   */
  add(text, style = '') {
    if (style) {
      this.parts.push(`%c${text}`)
      this.styles.push(style)
    } else {
      this.parts.push(text)
    }
    return this
  }

  /**
   * 添加换行
   */
  newline() {
    this.parts.push('\n')
    return this
  }

  /**
   * 输出到控制台
   */
  print() {
    console.log(this.parts.join(''), ...this.styles)
  }

  /**
   * 输出为 group
   * @param {string} title - 组标题
   * @param {string} [style] - 标题样式
   */
  printGroup(title, style) {
    // 先输出内容，再用 groupCollapsed 包裹标题
    // 避免 %c 格式化问题
    console.groupCollapsed(title)
    if (style) {
      // 在 group 内部用样式输出标题
      console.log(`%c${title}`, style)
    }
    console.log(this.parts.join(''), ...this.styles)
    console.groupEnd()
  }
}

/**
 * 打印模块概览
 * @param {object} modules - 所有模块对象
 * @param {object} metadata - 帮助元数据
 */
export const printOverview = (modules, metadata) => {
  const builder = new ConsoleBuilder()

  builder.add(' swm_dev - 开发者控制台 ', STYLES.title)
  builder.newline().newline()
  builder.add('可用模块:', 'font-weight: bold')
  builder.newline()

  for (const [name, module] of Object.entries(modules)) {
    if (name === 'help') continue

    const meta = metadata[name]
    const desc = meta?.description || '(无描述)'
    const methodCount = Object.keys(module).filter(
      (k) => typeof module[k] === 'function' && k !== 'help'
    ).length

    builder
      .add(`  ${name.padEnd(12)}`, STYLES.module)
      .add(` ${desc} `, STYLES.description)
      .add(`[${methodCount} 方法]`, STYLES.type)
      .newline()
  }

  builder.newline()
  builder.add('使用方式:', 'font-weight: bold')
  builder.newline()
  builder.add('  swm_dev.help()           - 显示此概览', STYLES.reset)
  builder.newline()
  builder.add('  swm_dev.help("playlist") - 查看模块详情', STYLES.reset)
  builder.newline()
  builder.add('  swm_dev.playlist.help()  - 模块内置帮助', STYLES.reset)

  builder.print()
}

/**
 * 打印模块详情
 * @param {string} name - 模块名称
 * @param {object} module - 模块对象
 * @param {object} introspected - 反射分析结果
 * @param {object} meta - 模块元数据
 */
export const printModuleDetail = (name, module, introspected, meta) => {
  const builder = new ConsoleBuilder()

  if (meta?.description) {
    builder.add(meta.description, STYLES.description).newline()
  }

  // 打印方法
  if (introspected.methods.length > 0) {
    builder.newline()
    builder.add('方法:', 'font-weight: bold').newline()

    for (const method of introspected.methods) {
      const methodMeta = meta?.methods?.[method.name]
      const asyncPrefix = method.isAsync ? 'async ' : ''

      builder.newline()
      builder
        .add(`  ${asyncPrefix}${method.name}`, STYLES.method)
        .add(`(${method.signature})`, STYLES.param)
        .newline()

      if (methodMeta?.description) {
        builder.add(`    ${methodMeta.description}`, STYLES.description).newline()
      }

      if (methodMeta?.params?.length) {
        for (const p of methodMeta.params) {
          const opt = p.optional ? '?' : ''
          builder
            .add('    @param ', STYLES.param)
            .add(`${p.name}${opt}`, 'color: #fff')
            .add(`: ${p.type || 'any'} `, STYLES.type)
            .add(`- ${p.description || ''}`, STYLES.description)
            .newline()
        }
      }

      if (methodMeta?.returns) {
        builder
          .add('    @returns ', STYLES.param)
          .add(methodMeta.returns.type || 'void', STYLES.type)
          .newline()
      }

      if (methodMeta?.example) {
        builder.add('    示例: ', STYLES.param).add(methodMeta.example, STYLES.example).newline()
      }
    }
  }

  // 打印响应式状态
  if (introspected.refs.length > 0) {
    builder.newline()
    builder.add('响应式状态 (Ref):', 'font-weight: bold').newline()
    for (const ref of introspected.refs) {
      builder
        .add(`  ${ref.name}`, STYLES.ref)
        .add(`: ${ref.refType} `, STYLES.type)
        .add(`= ${ref.currentValue}`, STYLES.description)
        .newline()
    }
  }

  // 打印普通属性
  if (introspected.properties.length > 0) {
    builder.newline()
    builder.add('属性:', 'font-weight: bold').newline()
    for (const prop of introspected.properties) {
      builder
        .add(`  ${prop.name}`, 'color: #ffb74d')
        .add(`: ${prop.type} `, STYLES.type)
        .add(`= ${prop.currentValue}`, STYLES.description)
        .newline()
    }
  }

  builder.printGroup(name, STYLES.module)
}
