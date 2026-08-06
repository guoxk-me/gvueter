import { describe, expect, it } from 'vite-plus/test'
import {
  ADMIN_DISPLAY_TIME_ZONE,
  getCurrencyLabel,
  getDateTimeLabel,
  getFileSizeLabel,
  getNumberLabel,
  getPercentageLabel,
} from '@/lib/display-format'

describe('locale-aware display formatting', () => {
  it('uses the requested locale and timezone at a calendar boundary', () => {
    const boundaryTimestamp = '2026-12-31T16:00:00.000Z'
    const sharedOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    } as const

    expect(
      getDateTimeLabel(boundaryTimestamp, {
        ...sharedOptions,
        locale: 'en-US',
        timeZone: 'UTC',
      }),
    ).toBe('12/31/2026, 16:00')
    expect(
      getDateTimeLabel(boundaryTimestamp, {
        ...sharedOptions,
        locale: 'zh-CN',
        timeZone: ADMIN_DISPLAY_TIME_ZONE,
      }),
    ).toBe('2027/01/01 00:00')
  })

  it('returns a stable empty label for empty, invalid, and non-finite input', () => {
    expect(
      getDateTimeLabel(undefined, {
        locale: 'en-US',
        timeZone: 'UTC',
      }),
    ).toBe('—')
    expect(
      getDateTimeLabel('not-a-date', {
        locale: 'zh-CN',
        timeZone: ADMIN_DISPLAY_TIME_ZONE,
      }),
    ).toBe('—')
    expect(getNumberLabel(Number.NaN, { locale: 'en-US' })).toBe('—')
    expect(getPercentageLabel(null, { locale: 'zh-CN' })).toBe('—')
    expect(getFileSizeLabel(-1, { locale: 'en-US' })).toBe('—')
  })

  it('formats numbers, percentage points, CNY, and file sizes with Intl', () => {
    expect(
      getNumberLabel(1_234_567.89, {
        locale: 'en-US',
        maximumFractionDigits: 2,
      }),
    ).toBe('1,234,567.89')
    expect(
      getPercentageLabel(8.2, {
        locale: 'en-US',
        maximumFractionDigits: 1,
        signDisplay: 'always',
      }),
    ).toBe('+8.2%')
    expect(
      getCurrencyLabel(1_234.5, {
        locale: 'zh-CN',
        currency: 'CNY',
        minimumFractionDigits: 2,
      }),
    ).toBe('¥1,234.50')
    expect(getFileSizeLabel(1_536, { locale: 'en-US' })).toBe('1.5 KB')
    expect(getFileSizeLabel(1_536, { locale: 'zh-CN' })).toBe('1.5 KB')
  })

  it('rejects ambiguous currency identifiers', () => {
    expect(() =>
      getCurrencyLabel(10, {
        locale: 'en-US',
        currency: 'cny',
      }),
    ).toThrowError('Currency must use an uppercase ISO 4217 code.')
  })
})
