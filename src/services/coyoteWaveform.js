/**
 * 音频文件转 DG-Lab 波形 hex 数据服务
 * 使用 Web Audio API 解码音频，转换为 DG-Lab V3 16 字符 hex 格式
 * 原始音频存储在 OPFS 独立子目录中
 */

import { isOPFSSupported } from './localAudioStorage.js'

const OPFS_DIR = 'coyote-waveforms'
const WINDOW_MS = 100
const MAX_DURATION_MS = 30000
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * 获取 OPFS 波形目录
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
const getWaveformDir = async () => {
  const root = await navigator.storage.getDirectory()
  return await root.getDirectoryHandle(OPFS_DIR, { create: true })
}

/**
 * 将振幅（0-1）映射为 DG-Lab V3 16 字符 hex
 * 格式：4 频率字节 + 4 强度字节 = 16 hex 字符
 * 每个频率/强度字节值相同（4 脉冲子通道统一）
 * @param {number} amplitude - 归一化振幅 0-1
 * @returns {string} 16 字符 hex 字符串
 */
const amplitudeToHex = (amplitude) => {
  const clamped = Math.max(0, Math.min(1, amplitude))
  // 频率：振幅越大频率越高 (10-240)
  const freq = Math.round(10 + clamped * 230)
  // 强度：跟随振幅 (0-100)
  const intensity = Math.round(clamped * 100)
  const fh = freq.toString(16).padStart(2, '0')
  const ih = intensity.toString(16).padStart(2, '0')
  // V3: 4 频率字节 + 4 强度字节 = 16 hex 字符
  return `${fh}${fh}${fh}${fh}${ih}${ih}${ih}${ih}`
}

/**
 * 将音频文件转换为 DG-Lab 波形 hex 数据
 * @param {File} audioFile - 音频文件
 * @returns {Promise<{patterns: string[], durationMs: number}>}
 */
const audioToPatterns = async (audioFile) => {
  if (audioFile.size > MAX_FILE_SIZE) {
    throw new Error('文件过大（超过 10MB）')
  }

  if (typeof AudioContext === 'undefined' && typeof window.webkitAudioContext === 'undefined') {
    throw new Error('浏览器不支持音频处理')
  }

  const AudioCtx = AudioContext || window.webkitAudioContext
  const ctx = new AudioCtx()

  try {
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

    const sampleRate = audioBuffer.sampleRate
    const samplesPerWindow = Math.floor((sampleRate * WINDOW_MS) / 1000)
    const channelData = audioBuffer.getChannelData(0)

    // 截断到最大时长
    const maxSamples = Math.floor((sampleRate * MAX_DURATION_MS) / 1000)
    const totalSamples = Math.min(channelData.length, maxSamples)
    const totalWindows = Math.max(1, Math.floor(totalSamples / samplesPerWindow))

    const patterns = []

    for (let w = 0; w < totalWindows; w++) {
      const start = w * samplesPerWindow
      const end = Math.min(start + samplesPerWindow, totalSamples)

      // 计算窗口 RMS 能量
      let sumSquares = 0
      for (let i = start; i < end; i++) {
        sumSquares += channelData[i] * channelData[i]
      }
      const rms = Math.sqrt(sumSquares / (end - start))

      // RMS 归一化（典型音频 RMS 在 0-0.5 之间，放大到 0-1）
      const amplitude = Math.min(1, rms * 2)
      patterns.push(amplitudeToHex(amplitude))
    }

    const durationMs = totalWindows * WINDOW_MS

    return { patterns, durationMs }
  } finally {
    ctx.close()
  }
}

/**
 * 保存波形音频到 OPFS
 * @param {File} file - 音频文件
 * @param {string} id - 唯一标识
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const saveWaveformAudio = async (file, id) => {
  if (!isOPFSSupported()) {
    return { success: false, error: 'OPFS 不支持' }
  }

  try {
    const dir = await getWaveformDir()
    const fileHandle = await dir.getFileHandle(id, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(file)
    await writable.close()
    return { success: true }
  } catch (err) {
    console.error('[CoyoteWaveform] 保存文件失败:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 从 OPFS 加载波形音频
 * @param {string} id - 唯一标识
 * @returns {Promise<{success: boolean, file?: File, error?: string}>}
 */
const loadWaveformAudio = async (id) => {
  if (!isOPFSSupported()) {
    return { success: false, error: 'OPFS 不支持' }
  }

  try {
    const dir = await getWaveformDir()
    const fileHandle = await dir.getFileHandle(id)
    const file = await fileHandle.getFile()
    return { success: true, file }
  } catch (err) {
    if (err.name === 'NotFoundError') {
      return { success: false, error: '文件不存在' }
    }
    console.error('[CoyoteWaveform] 读取文件失败:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 删除 OPFS 中的波形音频
 * @param {string} id - 唯一标识
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const deleteWaveformAudio = async (id) => {
  if (!isOPFSSupported()) {
    return { success: false, error: 'OPFS 不支持' }
  }

  try {
    const dir = await getWaveformDir()
    await dir.removeEntry(id)
    return { success: true }
  } catch (err) {
    if (err.name === 'NotFoundError') {
      return { success: true }
    }
    console.error('[CoyoteWaveform] 删除文件失败:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 列出所有已存波形音频
 * @returns {Promise<{success: boolean, files?: string[], error?: string}>}
 */
const listWaveformAudios = async () => {
  if (!isOPFSSupported()) {
    return { success: false, error: 'OPFS 不支持' }
  }

  try {
    const dir = await getWaveformDir()
    const files = []
    for await (const entry of dir.values()) {
      if (entry.kind === 'file') {
        files.push(entry.name)
      }
    }
    return { success: true, files }
  } catch (err) {
    console.error('[CoyoteWaveform] 列出文件失败:', err)
    return { success: false, error: err.message }
  }
}

export const coyoteWaveform = {
  audioToPatterns,
  saveWaveformAudio,
  loadWaveformAudio,
  deleteWaveformAudio,
  listWaveformAudios
}

export default coyoteWaveform
