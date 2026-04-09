import { mount } from "@vue/test-utils";

import { describe, expect, it } from "vite-plus/test";
import App from "../App.vue";

describe("app", () => {
  it("mounts renders properly", () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain("You did it!");
  });
});
