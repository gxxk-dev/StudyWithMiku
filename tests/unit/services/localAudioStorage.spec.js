/**
 * src/services/localAudioStorage.js 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PLAYLIST_CONFIG } from '@/config/constants.js'
import { ErrorTypes } from '@/types/playlist.js'
import { localManagedSongs, localReferenceSongs } from '../../setup/fixtures/songs.js'

describe('localAudioStorage.js', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const getModule = async () => {
    return await import('@/services/localAudioStorage.js')
  }

  describe('isOPFSSupported', () => {
    it('支持 OPFS 时应该返回 true', async () => {
      const { isOPFSSupported } = await getModule()
      expect(isOPFSSupported()).toBe(true)
    })
  })

  describe('isFileHandleSupported', () => {
    it('支持 showOpenFilePicker 时应该返回 true', async () => {
      window.showOpenFilePicker = vi.fn()
      const { isFileHandleSupported } = await getModule()
      expect(isFileHandleSupported()).toBe(true)
    })

    it('不支持 showOpenFilePicker 时应该返回 false', async () => {
      delete window.showOpenFilePicker
      const { isFileHandleSupported } = await getModule()
      expect(isFileHandleSupported()).toBe(false)
    })
  })

  describe('saveToOPFS', () => {
    it('应该成功保存文件', async () => {
      const { saveToOPFS } = await getModule()
      const file = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' })

      const result = await saveToOPFS(file, 'test.mp3')

      expect(result.success).toBe(true)
    })

    it('文件过大时应该返回 FILE_TOO_LARGE', async () => {
      const { saveToOPFS } = await getModule()
      // 创建一个超过限制大小的 mock 文件
      const largeFile = new File([''], 'large.mp3', { type: 'audio/mpeg' })
      Object.defineProperty(largeFile, 'size', {
        value: PLAYLIST_CONFIG.MAX_LOCAL_FILE_SIZE + 1
      })

      const result = await saveToOPFS(largeFile, 'large.mp3')

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.FILE_TOO_LARGE)
    })
  })

  describe('readFromOPFS', () => {
    it('应该成功读取已保存的文件', async () => {
      const { saveToOPFS, readFromOPFS } = await getModule()
      const content = 'test audio content'
      const file = new File([content], 'test.mp3', { type: 'audio/mpeg' })

      await saveToOPFS(file, 'test.mp3')
      const result = await readFromOPFS('test.mp3')

      expect(result.success).toBe(true)
      expect(result.file).toBeInstanceOf(File)
    })

    it('文件不存在时应该返回 FILE_NOT_FOUND', async () => {
      const { readFromOPFS } = await getModule()

      const result = await readFromOPFS('non-existent.mp3')

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.FILE_NOT_FOUND)
    })
  })

  describe('deleteFromOPFS', () => {
    it('应该成功删除文件', async () => {
      const { saveToOPFS, deleteFromOPFS, readFromOPFS } = await getModule()
      const file = new File(['content'], 'to-delete.mp3', { type: 'audio/mpeg' })
      await saveToOPFS(file, 'to-delete.mp3')

      const result = await deleteFromOPFS('to-delete.mp3')

      expect(result.success).toBe(true)

      // 验证文件已删除
      const readResult = await readFromOPFS('to-delete.mp3')
      expect(readResult.success).toBe(false)
    })

    it('删除不存在的文件应该返回成功', async () => {
      const { deleteFromOPFS } = await getModule()

      const result = await deleteFromOPFS('non-existent.mp3')

      expect(result.success).toBe(true)
    })
  })

  describe('listOPFSFiles', () => {
    it('应该列出所有音频文件', async () => {
      const { saveToOPFS, listOPFSFiles } = await getModule()

      await saveToOPFS(new File(['1'], 'file1.mp3'), 'file1.mp3')
      await saveToOPFS(new File(['2'], 'file2.mp3'), 'file2.mp3')

      const result = await listOPFSFiles()

      expect(result.success).toBe(true)
      expect(result.files).toContain('file1.mp3')
      expect(result.files).toContain('file2.mp3')
    })
  })

  describe('FileHandle 操作', () => {
    beforeEach(() => {
      window.showOpenFilePicker = vi.fn()
    })

    afterEach(() => {
      delete window.showOpenFilePicker
    })

    describe('saveFileHandle', () => {
      it('应该成功保存 FileHandle', async () => {
        const { saveFileHandle } = await getModule()
        const mockHandle = { kind: 'file', name: 'test.mp3' }

        const result = await saveFileHandle('test-key', mockHandle)

        expect(result.success).toBe(true)
      })
    })

    describe('getFileHandle', () => {
      it('应该成功获取已保存的 FileHandle', async () => {
        const { saveFileHandle, getFileHandle } = await getModule()
        const mockHandle = { kind: 'file', name: 'test.mp3' }
        await saveFileHandle('test-key', mockHandle)

        const result = await getFileHandle('test-key')

        expect(result.success).toBe(true)
        expect(result.handle).toEqual(mockHandle)
      })

      it('不存在的 key 应该返回 FILE_NOT_FOUND', async () => {
        const { getFileHandle } = await getModule()

        const result = await getFileHandle('non-existent-key')

        expect(result.success).toBe(false)
        expect(result.error).toBe(ErrorTypes.FILE_NOT_FOUND)
      })
    })

    describe('deleteFileHandle', () => {
      it('应该成功删除 FileHandle', async () => {
        const { saveFileHandle, deleteFileHandle, getFileHandle } = await getModule()
        const mockHandle = { kind: 'file', name: 'test.mp3' }
        await saveFileHandle('test-key', mockHandle)

        const result = await deleteFileHandle('test-key')

        expect(result.success).toBe(true)

        // 验证已删除
        const getResult = await getFileHandle('test-key')
        expect(getResult.success).toBe(false)
      })
    })
  })

  describe('getFileFromHandle', () => {
    it('handle 为 null 时应该返回 FILE_NOT_FOUND', async () => {
      const { getFileFromHandle } = await getModule()

      const result = await getFileFromHandle(null)

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.FILE_NOT_FOUND)
    })

    it('权限被拒绝时应该返回 PERMISSION_DENIED', async () => {
      const { getFileFromHandle } = await getModule()
      const mockHandle = {
        queryPermission: vi.fn().mockResolvedValue('denied')
      }

      const result = await getFileFromHandle(mockHandle)

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.PERMISSION_DENIED)
    })

    it('权限已授予时应该成功获取文件', async () => {
      const { getFileFromHandle } = await getModule()
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mpeg' })
      const mockHandle = {
        queryPermission: vi.fn().mockResolvedValue('granted'),
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      const result = await getFileFromHandle(mockHandle)

      expect(result.success).toBe(true)
      expect(result.file).toBe(mockFile)
    })

    it('权限为 prompt 时应该请求权限', async () => {
      const { getFileFromHandle } = await getModule()
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mpeg' })
      const mockHandle = {
        queryPermission: vi.fn().mockResolvedValue('prompt'),
        requestPermission: vi.fn().mockResolvedValue('granted'),
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      const result = await getFileFromHandle(mockHandle)

      expect(mockHandle.requestPermission).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })
  })

  describe('工具函数', () => {
    describe('generateOPFSFileName', () => {
      it('应该生成唯一的文件名', async () => {
        const { generateOPFSFileName } = await getModule()

        const name1 = generateOPFSFileName('test.mp3')
        const name2 = generateOPFSFileName('test.mp3')

        expect(name1).not.toBe(name2)
        expect(name1).toMatch(/^\d+_[a-z0-9]+\.mp3$/)
      })

      it('应该保留原始扩展名', async () => {
        const { generateOPFSFileName } = await getModule()

        expect(generateOPFSFileName('song.mp3')).toMatch(/\.mp3$/)
        expect(generateOPFSFileName('song.m4a')).toMatch(/\.m4a$/)
        expect(generateOPFSFileName('song.wav')).toMatch(/\.wav$/)
      })

      it('没有扩展名时应该使用文件名作为扩展名', async () => {
        const { generateOPFSFileName } = await getModule()

        // 根据源码实现，没有扩展名时会使用文件名本身作为 "扩展名"
        expect(generateOPFSFileName('song')).toMatch(/\.song$/)
      })
    })

    describe('generateHandleKey', () => {
      it('应该生成唯一的键名', async () => {
        const { generateHandleKey } = await getModule()

        const key1 = generateHandleKey()
        const key2 = generateHandleKey()

        expect(key1).not.toBe(key2)
        expect(key1).toMatch(/^handle_\d+_[a-z0-9]+$/)
      })
    })

    describe('parseFileNameToSongInfo', () => {
      it('应该解析 "艺术家 - 歌曲名" 格式', async () => {
        const { parseFileNameToSongInfo } = await getModule()

        const result = parseFileNameToSongInfo('Artist - Song Name.mp3')

        expect(result.artist).toBe('Artist')
        expect(result.name).toBe('Song Name')
      })

      it('应该支持多种分隔符', async () => {
        const { parseFileNameToSongInfo } = await getModule()

        expect(parseFileNameToSongInfo('Artist – Song.mp3').artist).toBe('Artist')
        expect(parseFileNameToSongInfo('Artist－Song.mp3').artist).toBe('Artist')
        expect(parseFileNameToSongInfo('Artist-Song.mp3').artist).toBe('Artist')
      })

      it('无法解析时应该使用文件名作为歌曲名', async () => {
        const { parseFileNameToSongInfo } = await getModule()

        const result = parseFileNameToSongInfo('JustASongName.mp3')

        expect(result.name).toBe('JustASongName')
        expect(result.artist).toBe('未知艺术家')
      })

      it('应该移除扩展名', async () => {
        const { parseFileNameToSongInfo } = await getModule()

        const result = parseFileNameToSongInfo('SongName.mp3')

        expect(result.name).toBe('SongName')
        expect(result.name).not.toContain('.mp3')
      })
    })

    describe('getLocalAudioURL', () => {
      it('非本地歌曲应该返回 INVALID_DATA', async () => {
        const { getLocalAudioURL } = await getModule()

        const result = await getLocalAudioURL({ type: 'online' })

        expect(result.success).toBe(false)
        expect(result.error).toBe(ErrorTypes.INVALID_DATA)
      })

      it('托管模式应该从 OPFS 读取', async () => {
        const { saveToOPFS, getLocalAudioURL } = await getModule()

        // 先保存文件
        const file = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' })
        await saveToOPFS(file, 'test.mp3')

        const song = { ...localManagedSongs[0], fileName: 'test.mp3' }
        const result = await getLocalAudioURL(song)

        expect(result.success).toBe(true)
        expect(result.url).toMatch(/^blob:/)
      })

      it('未知存储模式应该返回 INVALID_DATA', async () => {
        const { getLocalAudioURL } = await getModule()

        const result = await getLocalAudioURL({
          type: 'local',
          storage: 'unknown'
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe(ErrorTypes.INVALID_DATA)
      })
    })
  })
})
