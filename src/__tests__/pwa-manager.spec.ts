import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import PwaManager from '@/features/pwa/components/PwaManager.vue'
import { i18n } from '@/i18n'

// AI modified: jsdom tests exercise lifecycle UI, not the PWA plugin's platform-specific virtual loader.
vi.mock(import('virtual:pwa-register/vue'), async () => {
  const { shallowRef } = await import('vue')
  return {
    useRegisterSW: () => ({
      needRefresh: shallowRef(false),
      offlineReady: shallowRef(false),
      updateServiceWorker: vi.fn(async () => undefined),
    }),
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('pWA manager', () => {
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
