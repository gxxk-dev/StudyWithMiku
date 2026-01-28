/**
 * 数据导出工具函数
 * 支持 JSON、CSV、Markdown 格式
 */

/**
 * 导出为 JSON 格式
 * @param {Array} records - 记录数组
 * @param {Object} options - 导出选项
 * @param {Object} options.stats - 统计数据
 * @param {Object} options.settings - 设置
 * @returns {string} JSON 字符串
 */
export const exportToJSON = (records, options = {}) => {
  const { stats = null, settings = null } = options

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    recordCount: records.length,
    records,
    ...(stats && { stats }),
    ...(settings && { settings })
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * 导出为 CSV 格式
 * @param {Array} records - 记录数组
 * @returns {string} CSV 字符串
 */
export const exportToCSV = (records) => {
  if (!records || records.length === 0) {
    return ''
  }

  // CSV 头部
  const headers = ['id', 'mode', 'startTime', 'endTime', 'duration', 'elapsed', 'completionType']

  // 转义 CSV 字段
  const escapeCSV = (value) => {
    if (value === null || value === undefined) {
      return ''
    }
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // 格式化时间
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    return new Date(timestamp).toISOString()
  }

  // 生成行
  const rows = records.map((record) =>
    [
      escapeCSV(record.id),
      escapeCSV(record.mode),
      escapeCSV(formatTime(record.startTime)),
      escapeCSV(formatTime(record.endTime)),
      escapeCSV(record.duration),
      escapeCSV(record.elapsed),
      escapeCSV(record.completionType)
    ].join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}

/**
 * 导出为 Markdown 格式
 * @param {Array} records - 记录数组
 * @param {Object} options - 导出选项
 * @param {Object} options.stats - 统计数据
 * @returns {string} Markdown 字符串
 */
export const exportToMarkdown = (records, options = {}) => {
  const { stats = null } = options
  const lines = []

  // 标题
  lines.push('# Focus Records Export')
  lines.push('')
  lines.push(`Exported at: ${new Date().toLocaleString()}`)
  lines.push('')

  // 统计摘要
  if (stats) {
    lines.push('## Summary')
    lines.push('')
    lines.push(`- Total Sessions: ${stats.totalSessions || 0}`)
    lines.push(`- Completed Sessions: ${stats.completedSessions || 0}`)
    lines.push(`- Total Focus Time: ${formatDuration(stats.totalFocusTime || 0)}`)
    lines.push(`- Average Focus Time: ${formatDuration(stats.averageFocusTime || 0)}`)
    lines.push('')
  }

  // 记录表格
  if (records && records.length > 0) {
    lines.push('## Records')
    lines.push('')
    lines.push('| Date | Mode | Duration | Status |')
    lines.push('|------|------|----------|--------|')

    records.forEach((record) => {
      const date = record.startTime ? new Date(record.startTime).toLocaleDateString() : '-'
      const mode = formatMode(record.mode)
      const duration = formatDuration(record.elapsed || 0)
      const status = formatCompletionType(record.completionType)
      lines.push(`| ${date} | ${mode} | ${duration} | ${status} |`)
    })
  } else {
    lines.push('No records found.')
  }

  return lines.join('\n')
}

/**
 * 格式化时长
 * @param {number} seconds - 秒数
 * @returns {string} 格式化的时长
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0m'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

/**
 * 格式化模式名称
 * @param {string} mode - 模式
 * @returns {string} 显示名称
 */
export const formatMode = (mode) => {
  const modeNames = {
    focus: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break'
  }
  return modeNames[mode] || mode
}

/**
 * 格式化完成类型
 * @param {string} type - 完成类型
 * @returns {string} 显示名称
 */
export const formatCompletionType = (type) => {
  const typeNames = {
    completed: 'Completed',
    cancelled: 'Cancelled',
    skipped: 'Skipped',
    interrupted: 'Interrupted'
  }
  return typeNames[type] || type
}

/**
 * 下载文件
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME 类型
 */
export const downloadFile = (content, filename, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * 导出并下载
 * @param {Array} records - 记录数组
 * @param {string} format - 导出格式 (json/csv/markdown)
 * @param {Object} options - 导出选项
 */
export const exportAndDownload = (records, format, options = {}) => {
  const timestamp = new Date().toISOString().split('T')[0]
  let content, filename, mimeType

  switch (format) {
    case 'json':
      content = exportToJSON(records, options)
      filename = `focus-records-${timestamp}.json`
      mimeType = 'application/json'
      break

    case 'csv':
      content = exportToCSV(records)
      filename = `focus-records-${timestamp}.csv`
      mimeType = 'text/csv'
      break

    case 'markdown':
      content = exportToMarkdown(records, options)
      filename = `focus-records-${timestamp}.md`
      mimeType = 'text/markdown'
      break

    default:
      throw new Error(`Unsupported export format: ${format}`)
  }

  downloadFile(content, filename, mimeType)

  return { success: true, filename }
}
