# gvueter

This project runs on Vue 3 with Vite+.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See the [Vite Configuration Reference](https://vite.dev/config/) and Vite+ docs for the unified toolchain workflow.

## Project Setup

```sh
vp install
```

### Compile and Hot-Reload for Development

```sh
vp dev
```

### Run Formatting, Linting, and Type Checks

```sh
vp check
```

### Build for Production

```sh
vp build
```

### Run Unit Tests

```sh
vp test
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
vp exec playwright install

# When testing on CI, must build the project first
vp build

# Runs the end-to-end tests
vp exec playwright test
# Runs the tests only on Chromium
vp exec playwright test --project=chromium
# Runs the tests of a specific file
vp exec playwright test tests/example.spec.ts
# Runs the tests in debug mode
vp exec playwright test --debug
```
