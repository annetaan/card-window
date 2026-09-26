// rollup-plugin-typescript2 emits only .d.ts files, which TypeScript reads as CommonJS types.
// Copy them to .d.mts so the `import` condition gets ESM types and the default import resolves.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../lib/esm');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.d.ts'))) {
  const source = fs.readFileSync(path.join(dir, file), 'utf8');
  const esm = source.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(dir, file.replace(/\.d\.ts$/, '.d.mts')), esm);
}
