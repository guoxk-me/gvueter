import { mount } from "@vue/test-utils";

import { describe, expect, it } from "vite-plus/test";
import App from "../App.vue";
import { hasAbility } from "../lib/access";

describe("app", () => {
  it("renders the router outlet shell", () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: {
            template: '<div data-test="router-view">router outlet</div>',
          },
        },
      },
    });

    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(true);
  });

  it("keeps the app title shell importable", () => {
    expect(App).toBeTruthy();
  });

  it("evaluates platform-admin abilities", () => {
    expect(
      hasAbility(
        {
          id: "usr-platform-admin",
          name: "Maya Chen",
          email: "maya@gvueter.app",
          role: "platform-admin",
          title: "Platform Admin",
        },
        { action: "manage", resource: "tenants" },
      ),
    ).toBe(true);
  });
});
