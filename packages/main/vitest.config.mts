import { playwright } from '@vitest/browser-playwright';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'jsdom',
          exclude: [...configDefaults.exclude, 'src/**/*.browser.test.tsx'],
        },
      },
      {
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.tsx'],
          browser: {
            enabled: true,
            headless: true,
            // Playwright launches headless Chromium with --hide-scrollbars, which
            // takes the space of a horizontal scrollbar away even when a test
            // styles it with ::-webkit-scrollbar. Without the flag a styled
            // scrollbar is a visible classic one on macOS as on Linux.
            provider: playwright({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
