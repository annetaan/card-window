import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  platform: 'neutral',
  target: 'es2019',
  dts: true,
  clean: ['lib'],
  fixedExtension: false,
  format: {
    esm: { outDir: 'lib/esm' },
    cjs: { outDir: 'lib/cjs' },
  },
  outputOptions: { exports: 'named', generatedCode: { symbols: false } },
});
