import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  concurrency: 10,
  nodeResolve: true,
  watch: false,
  files: './test/*_test.js',
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'firefox' }),
    playwrightLauncher({ product: 'webkit' }),
  ],
};
