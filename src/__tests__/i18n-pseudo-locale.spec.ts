import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES } from '@/i18n'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import {
  createPseudoLocale,
  createPseudoMessage,
  getLocaleMessageKeys,
  getProtectedMessageTokens,
} from '@/i18n/pseudo-locale'

describe('i18n message contracts', () => {
  it('keeps pseudo locale infrastructure out of the user-selectable locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['zh-CN', 'en-US'])
  })

  it('keeps Chinese and English message leaf keys identical', () => {
    const englishKeys = getLocaleMessageKeys(enUS)
    const chineseKeys = getLocaleMessageKeys(zhCN)

    expect(englishKeys.length).toBeGreaterThan(1_300)
    expect(chineseKeys).toEqual(englishKeys)
  })

  it('creates a recursive pseudo locale without adding or removing message keys', () => {
    const pseudoLocale = createPseudoLocale(enUS)

    expect(getLocaleMessageKeys(pseudoLocale)).toEqual(getLocaleMessageKeys(enUS))
  })
})

describe('pseudo locale text expansion', () => {
  it('expands ordinary copy to a stable 130%-150% range', () => {
    const sourceMessage = 'Settings apply after the page refreshes.'
    const pseudoMessage = createPseudoMessage(sourceMessage)
    const expansionRatio = [...pseudoMessage].length / [...sourceMessage].length

    expect(expansionRatio).toBeGreaterThanOrEqual(1.3)
    expect(expansionRatio).toBeLessThanOrEqual(1.5)
    expect(pseudoMessage).not.toContain('Settings')
    expect(pseudoMessage.startsWith('［')).toBe(true)
    expect(pseudoMessage.endsWith('］')).toBe(true)
  })

  it('preserves placeholders, HTML-like tokens, URLs, brands, and code identifiers', () => {
    const sourceMessage
      = 'Welcome {name} to <strong>Admin Panel</strong>. Read `userId` at https://docs.example.com/api with JSON and customWidget.'
    const pseudoMessage = createPseudoMessage(sourceMessage)

    expect(getProtectedMessageTokens(pseudoMessage)).toEqual(
      getProtectedMessageTokens(sourceMessage),
    )
    expect(pseudoMessage).toContain('{name}')
    expect(pseudoMessage).toContain('<strong>Admin Panel</strong>')
    expect(pseudoMessage).toContain('`userId`')
    expect(pseudoMessage).toContain('https://docs.example.com/api')
    expect(pseudoMessage).toContain('JSON')
    expect(pseudoMessage).toContain('customWidget')
  })

  it('retains executable Vue I18n interpolation and literal syntax', () => {
    const pseudoMessage = createPseudoMessage(
      'Welcome {name}. You have {count} alerts at admin{\'@\'}example.com.',
    )
    const pseudoI18n = createI18n({
      legacy: false,
      locale: 'pseudo',
      messages: {
        pseudo: { notification: pseudoMessage },
      },
    })
    const renderedMessage = pseudoI18n.global.t('notification', { count: 3, name: 'Ada' })

    expect(renderedMessage).toContain('Ada')
    expect(renderedMessage).toContain('3')
    expect(renderedMessage).toContain('admin@example.com')
    expect(renderedMessage).not.toContain('{name}')
    expect(renderedMessage).not.toContain('{count}')
  })

  it('keeps every production placeholder intact across recursive expansion', () => {
    const pseudoLocale = createPseudoLocale(enUS)

    function inspectTokens(
      sourceMessages: typeof enUS | Record<string, string>,
      pseudoMessages: typeof pseudoLocale,
    ) {
      for (const [messageKey, sourceMessage] of Object.entries(sourceMessages)) {
        const pseudoMessage = pseudoMessages[messageKey]
        expect(pseudoMessage).toBeDefined()

        if (typeof sourceMessage === 'string') {
          expect(typeof pseudoMessage).toBe('string')
          expect(getProtectedMessageTokens(pseudoMessage as string)).toEqual(
            getProtectedMessageTokens(sourceMessage),
          )
          continue
        }

        expect(typeof pseudoMessage).toBe('object')
        inspectTokens(sourceMessage, pseudoMessage as Record<string, string | typeof pseudoLocale>)
      }
    }

    inspectTokens(enUS, pseudoLocale)
  })
})
