import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick } from 'vue'
import PwaManager from '@/features/pwa/components/PwaManager.vue'
import { i18n } from '@/i18n'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PWA manager', () => {
  it('captures the browser install event and exposes a dismissible install action', async () => {
    const requestInstall = vi.fn(async () => undefined)
    const installEvent = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: requestInstall,
      userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
    })
    const wrapper = mount(PwaManager, {
      global: { plugins: [i18n] },
    })

    window.dispatchEvent(installEvent)
    await nextTick()

    const prompt = wrapper.get('[data-pwa-prompt]')
    expect(prompt.text()).toContain(i18n.global.t('pwa.installTitle'))

    await prompt.get('button').trigger('click')
    expect(requestInstall).toHaveBeenCalledOnce()
  })
})
