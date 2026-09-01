import { defineConfig, devices } from '@playwright/test';

/**
 * iTeach V7 E2E 配置（施工指南 §19.2 / §20）。
 * 使用生产构建 + vite preview，验证 BrowserRouter 的深层路由回退。
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:42873',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // 暗色产品，无系统亮度依赖；WebGL 用 SwiftShader 软件渲染。
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 42873 --strictPort',
    url: 'http://127.0.0.1:42873',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
