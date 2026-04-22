import { server } from './src/mocks/node'
import { afterAll, afterEach, beforeAll } from 'vite-plus/test'

// 所有测试开始前启动 MSW server
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))

// 每个测试结束后重置 handlers，避免测试间污染
afterEach(() => server.resetHandlers())

// 所有测试结束后关闭 server
afterAll(() => server.close())
