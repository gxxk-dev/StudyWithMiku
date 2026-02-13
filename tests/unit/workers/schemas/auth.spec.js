import { describe, it, expect } from 'vitest'
import {
  usernameSchema,
  registerOptionsSchema,
  loginOptionsSchema,
  updateProfileSchema,
  focusRecordsSchema,
  focusSettingsSchema,
  playlistsDataSchema,
  dataTypeParamSchema
} from '../../../../workers/schemas/auth.js'

describe('workers/schemas/auth', () => {
  describe('usernameSchema', () => {
    it('接受有效用户名（3-20 字符，字母数字下划线）', () => {
      expect(usernameSchema.safeParse('abc').success).toBe(true)
      expect(usernameSchema.safeParse('user_123').success).toBe(true)
      expect(usernameSchema.safeParse('A_B_C').success).toBe(true)
      expect(usernameSchema.safeParse('a'.repeat(20)).success).toBe(true)
    })

    it('拒绝太短的用户名', () => {
      expect(usernameSchema.safeParse('ab').success).toBe(false)
      expect(usernameSchema.safeParse('').success).toBe(false)
    })

    it('拒绝太长的用户名', () => {
      expect(usernameSchema.safeParse('a'.repeat(21)).success).toBe(false)
    })

    it('拒绝包含特殊字符的用户名', () => {
      expect(usernameSchema.safeParse('user@name').success).toBe(false)
      expect(usernameSchema.safeParse('user name').success).toBe(false)
      expect(usernameSchema.safeParse('user-name').success).toBe(false)
      expect(usernameSchema.safeParse('用户名').success).toBe(false)
    })

    it('拒绝非字符串类型', () => {
      expect(usernameSchema.safeParse(123).success).toBe(false)
      expect(usernameSchema.safeParse(null).success).toBe(false)
    })
  })

  describe('registerOptionsSchema', () => {
    it('接受有效的注册选项', () => {
      const result = registerOptionsSchema.safeParse({ username: 'testuser' })
      expect(result.success).toBe(true)
    })

    it('接受带 displayName 的注册选项', () => {
      const result = registerOptionsSchema.safeParse({
        username: 'testuser',
        displayName: 'Test User'
      })
      expect(result.success).toBe(true)
    })

    it('拒绝无效用户名', () => {
      const result = registerOptionsSchema.safeParse({ username: 'ab' })
      expect(result.success).toBe(false)
    })

    it('拒绝缺少 username', () => {
      const result = registerOptionsSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('拒绝过长的 displayName', () => {
      const result = registerOptionsSchema.safeParse({
        username: 'testuser',
        displayName: 'a'.repeat(51)
      })
      expect(result.success).toBe(false)
    })
  })

  describe('loginOptionsSchema', () => {
    it('接受有效的登录选项', () => {
      const result = loginOptionsSchema.safeParse({ username: 'testuser' })
      expect(result.success).toBe(true)
    })

    it('拒绝无效用户名', () => {
      const result = loginOptionsSchema.safeParse({ username: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('updateProfileSchema', () => {
    it('接受有效的 email', () => {
      expect(updateProfileSchema.safeParse({ email: 'test@example.com' }).success).toBe(true)
    })

    it('接受 null email（清除）', () => {
      expect(updateProfileSchema.safeParse({ email: null }).success).toBe(true)
    })

    it('拒绝无效的 email', () => {
      expect(updateProfileSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
    })

    it('拒绝过长的 email', () => {
      expect(updateProfileSchema.safeParse({ email: 'a'.repeat(250) + '@b.c' }).success).toBe(false)
    })

    it('接受有效的 QQ 号（5-11 位数字）', () => {
      expect(updateProfileSchema.safeParse({ qqNumber: '12345' }).success).toBe(true)
      expect(updateProfileSchema.safeParse({ qqNumber: '12345678901' }).success).toBe(true)
    })

    it('拒绝无效的 QQ 号', () => {
      expect(updateProfileSchema.safeParse({ qqNumber: '1234' }).success).toBe(false)
      expect(updateProfileSchema.safeParse({ qqNumber: '123456789012' }).success).toBe(false)
      expect(updateProfileSchema.safeParse({ qqNumber: 'abcde' }).success).toBe(false)
    })

    it('接受 null qqNumber（清除）', () => {
      expect(updateProfileSchema.safeParse({ qqNumber: null }).success).toBe(true)
    })

    it('接受有效的 avatarUrl', () => {
      expect(
        updateProfileSchema.safeParse({ avatarUrl: 'https://example.com/avatar.png' }).success
      ).toBe(true)
    })

    it('拒绝无效的 avatarUrl', () => {
      expect(updateProfileSchema.safeParse({ avatarUrl: 'not-a-url' }).success).toBe(false)
    })

    it('接受有效的 displayName', () => {
      expect(updateProfileSchema.safeParse({ displayName: 'New Name' }).success).toBe(true)
    })

    it('拒绝过长的 displayName', () => {
      expect(updateProfileSchema.safeParse({ displayName: 'a'.repeat(51) }).success).toBe(false)
    })

    it('接受空对象', () => {
      expect(updateProfileSchema.safeParse({}).success).toBe(true)
    })

    it('接受多个字段同时更新', () => {
      const result = updateProfileSchema.safeParse({
        email: 'test@example.com',
        qqNumber: '12345',
        avatarUrl: 'https://example.com/avatar.png',
        displayName: 'Test'
      })
      expect(result.success).toBe(true)
    })
  })

  describe('focusRecordsSchema', () => {
    const validRecord = {
      id: 'rec-001',
      mode: 'focus',
      startTime: 1700000000000,
      endTime: 1700001500000,
      duration: 1500,
      elapsed: 1500,
      completionType: 'completed'
    }

    it('接受有效的 focus 记录数组', () => {
      const result = focusRecordsSchema.safeParse([validRecord])
      expect(result.success).toBe(true)
    })

    it('接受空数组', () => {
      const result = focusRecordsSchema.safeParse([])
      expect(result.success).toBe(true)
    })

    it('拒绝 endTime < startTime', () => {
      const result = focusRecordsSchema.safeParse([
        { ...validRecord, endTime: validRecord.startTime - 1 }
      ])
      expect(result.success).toBe(false)
    })

    it('拒绝 elapsed > duration', () => {
      const result = focusRecordsSchema.safeParse([
        { ...validRecord, elapsed: validRecord.duration + 1 }
      ])
      expect(result.success).toBe(false)
    })

    it('拒绝无效的 mode', () => {
      const result = focusRecordsSchema.safeParse([{ ...validRecord, mode: 'invalid' }])
      expect(result.success).toBe(false)
    })

    it('拒绝无效的 completionType', () => {
      const result = focusRecordsSchema.safeParse([{ ...validRecord, completionType: 'invalid' }])
      expect(result.success).toBe(false)
    })

    it('接受所有有效的 mode 值', () => {
      for (const mode of ['focus', 'shortBreak', 'longBreak']) {
        const result = focusRecordsSchema.safeParse([{ ...validRecord, mode }])
        expect(result.success).toBe(true)
      }
    })

    it('接受所有有效的 completionType 值', () => {
      for (const ct of ['completed', 'cancelled', 'skipped', 'interrupted', 'disabled']) {
        const result = focusRecordsSchema.safeParse([{ ...validRecord, completionType: ct }])
        expect(result.success).toBe(true)
      }
    })
  })

  describe('focusSettingsSchema', () => {
    const validSettings = {
      focusDuration: 1500,
      shortBreakDuration: 300,
      longBreakDuration: 900,
      longBreakInterval: 4,
      autoStartBreaks: false,
      autoStartFocus: false,
      notificationEnabled: true,
      notificationSound: true
    }

    it('接受有效设置', () => {
      const result = focusSettingsSchema.safeParse(validSettings)
      expect(result.success).toBe(true)
    })

    it('拒绝 focusDuration 超出范围', () => {
      expect(focusSettingsSchema.safeParse({ ...validSettings, focusDuration: 59 }).success).toBe(
        false
      )
      expect(focusSettingsSchema.safeParse({ ...validSettings, focusDuration: 7201 }).success).toBe(
        false
      )
    })

    it('拒绝 longBreakInterval 超出范围', () => {
      expect(
        focusSettingsSchema.safeParse({ ...validSettings, longBreakInterval: 0 }).success
      ).toBe(false)
      expect(
        focusSettingsSchema.safeParse({ ...validSettings, longBreakInterval: 11 }).success
      ).toBe(false)
    })

    it('拒绝缺少必填字段', () => {
      const { focusDuration: _focusDuration, ...incomplete } = validSettings
      expect(focusSettingsSchema.safeParse(incomplete).success).toBe(false)
    })
  })

  describe('playlistsDataSchema', () => {
    const validPlaylistData = {
      playlists: [
        {
          id: 'pl-001',
          name: 'My Playlist',
          order: 0,
          mode: 'playlist'
        }
      ],
      currentId: 'pl-001',
      defaultId: 'pl-001'
    }

    it('接受有效歌单数据', () => {
      const result = playlistsDataSchema.safeParse(validPlaylistData)
      expect(result.success).toBe(true)
    })

    it('接受 null 的 currentId 和 defaultId', () => {
      const result = playlistsDataSchema.safeParse({
        ...validPlaylistData,
        currentId: null,
        defaultId: null
      })
      expect(result.success).toBe(true)
    })

    it('接受带歌曲的歌单', () => {
      const result = playlistsDataSchema.safeParse({
        ...validPlaylistData,
        playlists: [
          {
            id: 'pl-001',
            name: 'My Playlist',
            order: 0,
            mode: 'playlist',
            songs: [{ id: 'song-1', name: 'Song 1' }]
          }
        ]
      })
      expect(result.success).toBe(true)
    })

    it('拒绝无效的 mode', () => {
      const result = playlistsDataSchema.safeParse({
        ...validPlaylistData,
        playlists: [{ id: 'pl-001', name: 'Test', order: 0, mode: 'invalid' }]
      })
      expect(result.success).toBe(false)
    })
  })

  describe('dataTypeParamSchema', () => {
    it('接受所有有效数据类型', () => {
      const validTypes = [
        'focus_records',
        'focus_settings',
        'playlists',
        'user_settings',
        'share_config'
      ]
      for (const type of validTypes) {
        const result = dataTypeParamSchema.safeParse({ type })
        expect(result.success).toBe(true)
      }
    })

    it('拒绝无效数据类型', () => {
      expect(dataTypeParamSchema.safeParse({ type: 'invalid' }).success).toBe(false)
      expect(dataTypeParamSchema.safeParse({ type: '' }).success).toBe(false)
    })

    it('拒绝缺少 type', () => {
      expect(dataTypeParamSchema.safeParse({}).success).toBe(false)
    })
  })
})
