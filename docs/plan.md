# Modernization plan

This is the working plan for bringing card-window up to date. I keep it here so a new session can pick up where the last one stopped. Update the status lines as work lands.

Last updated: 2026-09-28

## Goals

1. Move ownership to the annetaan organization, on GitHub and on npm.
2. Replace the old tooling. pnpm, tsdown, Vitest and a working CI.
3. Make rendering cheaper on the CPU. Let CSS do the layout and handle scroll events with less work. The last row must stay left-aligned.
4. Rewrite the docs site in Astro and move the current content over.

Phases run in this order. Phase 4 changes the API, so the docs wait for it.

| Phase | What | Status |
| --- | --- | --- |
| 1 | Ownership transfer | Done |
| 2 | Tooling and CI | Done |
| 3 | Browser tests before the rewrite | Done |
| 4 | Performance rewrite, released as 2.0.0 | Done |
| 5 | Astro docs site | Not started |

## Phase 1. Ownership transfer (done)

- GitHub: `michiharu/card-window` moved to `annetaan/card-window`. GitHub Pages moved with it and serves https://annetaan.github.io/card-window/. The old michiharu.github.io URL returns 404 and cannot redirect.
- npm: the package is now `@annetaan/card-window`. 1.9.3 was published by hand. 1.10.3 was published from `release.yml` with Trusted Publishing and has provenance.
- The old `card-window` is deprecated on all 26 versions. Its dist-tags are `latest: 1.9.2` and `next: 1.10.2`.
- Trusted Publisher on npmjs.com: repository `annetaan/card-window`, workflow `release.yml`, no environment. Renaming `release.yml` breaks publishing until npmjs.com is updated too.

Things I learned on the way:

- `card-window@1.10.0` to `1.10.2` came from commit `d0ef707`, which was never pushed and is gone. They moved the build to vite, added `export default CardWindow` and an `exports` field. 1.10.3 brought both back so users on 1.10.x can switch by renaming the package only.
- The registry took about 2 minutes to serve a brand new package after the first publish.
- `npm deprecate` needs an OTP. Run from the Claude Code prompt with `!`, npm cannot wait for the browser login and fails with `EOTP`. Pass `--otp=<code>` or run it in a normal terminal.

PRs: #61 rename, #62 smoke test, #63 release 1.10.3 and `release.yml`.

## Phase 2. Tooling and CI (done)

Branches: `chore/modern-tooling` for step 1, `chore/ci-workflow` for step 7.

The rule for this phase is to leave the library source alone. The package that comes out should behave exactly like 1.10.3. The smoke test and arethetypeswrong prove that.

### Where things stand

- pnpm 12.6.0 workspace, pinned by `packageManager` in the root `package.json`. It holds `packages/main` only.
- `pnpm-lock.yaml` was imported from `yarn.lock` with `pnpm import`, so every version is unchanged.
- `pnpm-workspace.yaml` has no `allowBuilds` any more. `esbuild` left with esbuild-jest in step 4, and `core-js-pure` left with ESLint in step 5. No package that remains needs a build.
- The pnpm 10 that mise installs locally cannot switch itself to 12. mise older than 2026.9.x cannot install pnpm 12 either, because its aqua registry expects the old asset name `pnpm-macos-arm64` and pnpm 12 ships `pnpm-darwin-arm64.tar.gz`. Upgrade mise first (`brew upgrade mise` for a Homebrew install, which cannot run `mise self-update`), then run `mise upgrade pnpm` and open a new shell. `npx -y pnpm@12.6.0` remains the fallback.
- `packages/main`: tsdown 0.23 (rolldown), TypeScript 5.9.3, Vitest 5 with jsdom 29, oxlint 1.85 with `packages/main/.oxlintrc.json`, oxfmt 0.70 with `.oxfmtrc.json` at the root. tsdown does not type-check. `pnpm typecheck` runs `tsc --noEmit` on `src`, test files included, and CI runs it too.
- `packages/main/tsconfig.json` sets `target` and the ES part of `lib` to ES2019 to match tsdown's target. They only affect type checking. It uses `moduleResolution: bundler`, `jsx: react` and `isolatedModules`. It sets `noEmit`, so tsdown writes all the output. With `isolatedModules`, a type re-export without `export type` makes `pnpm typecheck` fail with TS1205.
- `packages/main/.oxlintrc.json` turns on the `typescript`, `react`, `jsx-a11y` and `import` plugins, with the `correctness` category as errors. On top of that it sets `react/function-component-definition` for arrow functions and `sort-imports` with `ignoreDeclarationSort`, both from `.eslintrc.js`. It also sets the rules from @typescript-eslint/recommended v5 that `correctness` misses, such as `no-array-constructor`, `typescript/no-empty-object-type` and `typescript/no-unsafe-function-type`. `react/rules-of-hooks` is an error. `react/exhaustive-deps` and `react/refs` were warnings until phase 4, which made them errors. `reportUnusedDisableDirectives` is an error. `pnpm lint` now reports nothing.
- `.oxfmtrc.json` at the root sets print width 120, single quotes and `trailingComma: "all"`. Semicolons are oxfmt's default. `sortPackageJson` is off. `sortImports` puts React first. So the import order is checked by `pnpm format:check`, not by lint. oxlint and oxfmt run from `packages/main` with no path arguments and cover every file there that git does not ignore.
- Nothing in the tooling holds TypeScript at 5.x any more.
- `packages/main/tsdown.config.mts` sets the build output. It writes four files: `lib/esm/index.mjs`, `lib/esm/index.d.mts`, `lib/cjs/index.js` and `lib/cjs/index.d.ts`. Each format gets one type file. The target is ES2019. The syntax target comes from the tsdown config, not from `tsconfig.json`.
- `packages/main/vitest.config.mts` only sets the jsdom environment. `globals` is off, so the tests import `describe`, `test` and `expect` from `vitest`. `test` is `vitest run`. `coverage` is `vitest run --coverage` with `@vitest/coverage-v8`.
- `main`, `module` and `exports` are the same as in 1.10.3. `types` points at `./lib/cjs/index.d.ts`.
- tsdown needs Node `^22.18.0 || ^24.11.0 || >=26.0.0`. Vitest 5 asks for `^22.12.0 || ^24.0.0 || >=26.0.0` and jsdom 29 asks for less, so tsdown still sets the Node floor. jsdom 30 would need `^22.22.2 || ^24.15.0 || >=26.0.0`.
- `packages/website`: Docusaurus 2.0.0-beta.18. It is replaced in phase 5.
- `smoke/`: a standalone npm package outside the pnpm workspace. `npm run use:local` clears `smoke/dist`, packs `packages/main` into it and installs the tarball.
- `.github/workflows/ci.yml` runs on pull requests and pushes to `main`, on Node 24 with pnpm from `pnpm/action-setup@v6.1.0`. It runs oxlint, the oxfmt check, typecheck, test, build, arethetypeswrong and the smoke test against the packed tarball. It replaced `main.yml`, which failed on every PR: first on the retired cache service behind `actions/setup-node@v2`, and after step 1 because its `cache: yarn` ran `yarn cache dir`, which rejects `packageManager: pnpm@12.6.0`. The whole job runs as a matrix on React 18 and 19, shown as `ci (18)` and `ci (19)`, with `fail-fast: false`. The 18 leg uses the lockfile. The 19 leg switches to the latest React 19 right after the frozen install, so every later step runs on it.
- `.github/workflows/release.yml` installs and tests with pnpm through `pnpm/action-setup@v6.1.0`. The moving `v6` tag predates pnpm 12 support. It still publishes with `npm publish` in `packages/main`. The `v1.11.0` tag proved it end to end in run 36319590312. `publish` ran 162 tests and published with Trusted Publishing and provenance. `smoke` passed against the published 1.11.0. The registry took about 3 minutes to serve the new version. The wait allows about 5, with 30 tries 10 seconds apart. The run warned that `actions/checkout@v4` and `actions/setup-node@v4` target Node 20, which GitHub deprecated. `release.yml` now uses v7 of both, and its checkout sets `persist-credentials: false`, as in `ci.yml`. No tag has run it on v7 yet, so the next release tag verifies it. That run should show neither the Node 20 warning nor npm's `Unknown user config "always-auth"` warning. setup-node v7 no longer exports a placeholder `NODE_AUTH_TOKEN`, so `pnpm install` warns `Failed to replace env in config: ${NODE_AUTH_TOKEN}`. The warning is expected. A local run of pnpm 12.6.0 with the same `.npmrc` printed it and still installed and passed the tests. Before it publishes, npm exchanges the GitHub OIDC token for a publish token and uses it in place of the token from `.npmrc`, without writing the file.
- `.vscode/settings.json` was deleted in step 5. The repository has no editor settings.
- Dev React is 18.3.1, a devDependency of `packages/main`, with `@types/react` 18.3.31 and `@types/react-dom` 18.3.7. `@testing-library/react` is 16.3.3 with `@testing-library/dom` 10.4.2, and it supports React 18 and 19. The peer range is `>=16.13.0 <20`. React 16.13 and 17 are inside it, but nothing tests them. `@testing-library/react` 16 cannot run on React 17. The smoke test uses React 18 unless React 19 is passed to `use:local`.
- `version` in `packages/main/package.json` is 1.11.0, and 1.11.0 is npm `latest`. Its peer range is `>=16.13.0 <20`.
- `README.md` and `packages/main/README.md` have a Requirements section. Both describe 1.11.0, which is on npm.

### Steps

Step 7 ran right after step 1, ahead of step 2, because `main.yml` failed on every PR and every later step should be checked by CI. The other steps run in numeric order.

1. **pnpm.** Add `pnpm-workspace.yaml` and `packageManager` in the root `package.json`. Delete `yarn.lock`. Turn root scripts into `pnpm --filter`. The workspace holds `packages/main` only. `packages/website` stays out until phase 5 replaces it, so the current docs site cannot be redeployed until then. Drop the root `start` and `deploy` scripts that point at it.
   Done. `lib/` from `pnpm build` is byte-identical to the published 1.10.3. `tslib` was added as a devDependency, and step 2 must remove it together with rollup-plugin-typescript2. `coverage` in `packages/main` is now `jest --coverage`. Steps 8 and 9 were pulled into this step for the parts yarn broke, which were `release.yml` and the Development section of `CONTRIBUTING.md`.
2. **tsdown.** Replace rollup. Emit ESM and CJS, with `.d.mts` for ESM and `.d.ts` beside the CJS `.js`. Keep the `exports` shape from 1.10.3. Delete `rollup.config.js`, `scripts/emit-mts-types.cjs` and the `prebuild` and `postbuild` scripts. Remove `tslib` with rollup-plugin-typescript2. Check `npm pack --dry-run` for the file list.
   Add a `typecheck` script with `tsc --noEmit` and run it in `ci.yml`. rollup-plugin-typescript2 type-checked `src` during the build. tsdown does not.
   Done. rolldown cannot tell a type re-export from a value and failed with `MISSING_EXPORT`. So the type re-exports in `src/index.ts` became `export type`. The emitted JS did not change. The ESM file is 10.96 kB and the CJS file 12.15 kB. Each type file is 7.59 kB. 1.10.3 had 14.3 kB for ESM and 15.2 kB for CJS. The tarball went from 10 files to 6. The lockfile lost 20 packages on the rollup side, and no existing entry changed. arethetypeswrong and the smoke test pass. The runtime export keys are the same as in 1.10.3.
   Differences from 1.10.3:
   - The syntax goes from ES5 to ES2019. IE11 and other old browsers drop out.
   - The types are bundled. `CardWindow.d.*` and `lib/esm/index.d.ts` are gone.
   - `types` points at a new path.
   - The internal `Spacing` type shows as `Spacing$1` in hovers and errors. Its structure is the same.
   - The type files use `export { type X }`, so consumers need TypeScript 4.5 or later.
3. **TypeScript 5.** Update `tsconfig.json`. The current one targets ES5 with `moduleResolution: node`.
   TypeScript 5 removes tsdown's peer warning. tsdown sets the syntax target, so `target` in `tsconfig.json` only affects type checking. Keep `jsx: react`, the classic runtime. The automatic runtime imports `react/jsx-runtime`, and React 16.13 does not have it. Consider `isolatedModules` or `verbatimModuleSyntax`, so typecheck catches the type re-export problem from step 2.
   Done. TypeScript is 5.9.3, the last 5.x. It is inside the peer ranges of tsdown and rolldown-plugin-dts, and `pnpm peers check` passes. 6.0 and 7.0 wait until after step 5. 6.0 turns `strict` on by default, and type checking `src` then reports 1 error. `verbatimModuleSyntax` was not adopted. It reports TS1484 4 times in `CardWindow.tsx` and `index.ts`, and fixing them needs source changes. Phase 2 leaves the source alone. `isolatedModules` is on instead. Turning `export type {` back into `export {` in `src/index.ts` makes `pnpm typecheck` fail with 12 TS1205. `outDir` and `declaration` were rollup leftovers and are gone.
   The JS output is byte-identical to #66. The type files went from 7.59 kB to 7.49 kB, with two differences only. `declare type` became `type`, and `React.RefObject<T>` became `RefObject<T>` with `RefObject` added to the named import. The tsconfig change alone does not change the output. All the differences come from the TypeScript update.
   For consumers, TypeScript 4.4.4 fails with the same error as on #66. 4.5.5 and 5.9.3 pass. arethetypeswrong and the smoke test pass. In the lockfile only `typescript` changed, from 4.6.3 to 5.9.3, plus the entries that depend on it and were re-keyed.
4. **Vitest.** Replace jest and esbuild-jest. Keep jsdom. Move `@testing-library/react` to a version that supports the React used in dev. All 162 tests must pass without changes to what they assert.
   Type-check the test files as well, and have the typecheck step in `ci.yml` cover them.
   With the test files included, the type check reports one TS2304 on `global` in `CardWindow.test.tsx`. It predates step 3, and step 4 fixes it.
   Done. Vitest is 5.0.2 with vite 8.3.1 and jsdom 29.1.1. `pnpm test` reports 2 test files and 162 tests passed. The test files changed in three ways only. They import from `vitest`, the unused `@testing-library/jest-dom` import is gone, and `global` became `globalThis`. No assertion changed.
   jsdom 30.1.1 also passed all 162 tests on my Node 24.14.0. Its engines range sits above the Node floor that tsdown sets, so I stayed on 29. `@testing-library/jest-dom` was removed. No test used its matchers, and v5 assumes jest's types from `@types/jest`. `vite` is a devDependency because vitest 5 lists it as a peer that is not optional. `@testing-library/react` went from 12.1.4 to 12.1.5. `pnpm coverage` reports 80.12% of statements and 84.44% of lines.
   The test patterns left `exclude` in `tsconfig.json`. `pnpm typecheck` now checks the 2 test files and fails with TS2304 if `global` comes back. `ci.yml` did not change, because its typecheck step already runs `pnpm typecheck`.
   `lib/` is byte-identical to #67, and `npm pack` still lists 6 files. `pnpm install --frozen-lockfile` and `pnpm peers check` are clean. The lockfile went from 718 `packages` entries to 395, with 408 removed and 85 added. Of the 310 snapshots that stayed, only `supports-color@8.1.1` changed. It gained `optional: true`. No package that stayed changed its version. Most names on both sides, such as `jsdom`, `parse5` and `@babel/parser`, are old versions that only jest used, replaced by new ones. The `pnpm test`, `pnpm coverage` and `pnpm typecheck` lines in `CONTRIBUTING.md` were updated in this step.
5. **Lint and format.** oxlint and oxfmt replace ESLint, Prettier and all the airbnb configs. Delete `.eslintrc.js`, `tsconfig.eslint.json` and `.prettierrc.js`. Carry over what oxlint supports from the current rules: react-hooks, the TypeScript rules, `sort-imports` and import order with React first. Keep the format close to today, with print width 120, single quotes and semicolons, so the first format run makes a small diff. Update `.vscode/settings.json`.
   In `ci.yml`, move the lint step to oxlint and add the format check.
   Done. oxlint is 1.85.0 and oxfmt 0.70.0. The lockfile went from 395 `packages` entries to 235, with 201 removed and 41 added. `core-js-pure@3.21.1` is among the removed. None of the 194 entries that stayed changed, in `packages` or in `snapshots`. As in step 4, these counts leave out the 15 entries for pnpm itself in the first YAML document of the lockfile. With them it is 410 to 250.
   The rules are the ones listed under "Where things stand". `no-empty-function` was not carried over on purpose, because airbnb-typescript allowed empty functions. oxlint has no `import/order`. So the order of import declarations moved to `sortImports` in oxfmt, and the order of names inside `{ }` stayed with `sort-imports` in oxlint.
   The first format run changed 13 lines in `CardWindow.tsx`. 12 of them got a trailing comma, and one got parentheses around `??` in `getLoadingCardCount`. It changed 1 line in `CardWindow.test.tsx` and rewrapped 1 entry in `.oxlintrc.json`. All of it is formatting only. `lib/` is byte-identical to #68, and `npm pack` still lists 6 files.
   The disable comments in the test file became `oxlint-disable-next-line` with oxlint rule names, one of them `typescript/no-this-alias`. The ones that no longer suppressed anything are gone. No assertion changed. `tsconfig.eslint.json` was deleted, and with it its stale `*.config.js` include.
   `lint` only checks. `format` writes, and `format:check` checks without writing. `fix` runs `oxlint --fix && oxfmt && npx sort-package-json`. The root has `lint`, `format` and `format:check`. CI runs `pnpm lint` and `pnpm format:check`. The `pnpm lint`, `pnpm format` and `pnpm format:check` lines in `CONTRIBUTING.md` were added in this step.
   Recorded as a note only: `npx sort-package-json --check` flags `packages/main/package.json` for the order of `main`, `module` and `types`. That predates step 5. Running `pnpm fix` would reorder them.
   michiharu plans to add lefthook later, so the format and the checks run before each commit. It is not a scheduled step.
6. **React.** Move dev React to 18. Widen the peer range to include React 19, but only after CI runs the unit tests and the smoke test on React 18 and 19 in a matrix and both pass.
   The matrix goes in `ci.yml`.
   Done. Dev React went from 17.0.2 to 18.3.1, `@types/react` to 18.3.31 and `@types/react-dom` to 18.3.7. `@testing-library/react` went from 12.1.5 to 16.3.3, with `@testing-library/dom` 10.4.2 as its peer. 16 is the only line whose peer covers React 18 and 19. 13 to 15 accept `^18` only. No test file changed. `pnpm test` reports 162 passed on React 18 and on React 19.
   React moved into `packages/main`. Before this step, React 17 and its types were devDependencies of the root `package.json`. `packages/main` got React through the peer that pnpm installs on its own, and the lockfile showed `react` 17.0.2 there with the peer range as its specifier. The root `package.json` has no devDependencies any more. The lockfile no longer records the peer range, so widening it left the lockfile unchanged.
   The matrix covers the whole `ci` job. After the frozen install, the 19 leg runs `pnpm --filter @annetaan/card-window add -D react@19 react-dom@19 @types/react@19 @types/react-dom@19`. That changes `package.json` and the lockfile in the CI checkout only. The version floats, so a new React 19 release can turn CI red with no change in the repository.
   In the smoke test, React 19 has to go into the same install as the tarball, through `npm run use:local -- react@19 react-dom@19 @types/react@19 @types/react-dom@19`. A second `npm install --no-save` puts `latest` from the registry back in place of the tarball, and the smoke test still passes. Editing `smoke/package.json` to React 19 before `npm install` fails with ERESOLVE, because the registry package still has the peer `<19`.
   That install prints `npm warn ERESOLVE overriding peer dependency`. It comes from react-dom 18 asking for react `^18.3.1` while both are swapped in place. The peer of card-window plays no part in it. Run 36313898339 printed it, and the step passed.
   The peer was widened last. Run 36313612808 on 82305ba was green on `ci (18)` and `ci (19)` with the range still `<19` and `--legacy-peer-deps` on the 19 leg. Then the range became `>=16.13.0 <20` and the flag went away. Run 36313898339 on 8004027 was green without the flag. With the old range, the same install failed with ERESOLVE. So a passing install shows that the new range accepts 19.
   The lockfile went from 235 `packages` entries to 227, with 20 removed and 12 added. The removed ones are React 17 and its types, `@testing-library/react` 12.1.5, `@testing-library/dom` 8.12.0, `scheduler` 0.20.2, `object-assign`, `chalk` 4.1.2 with its chain down to `supports-color` 7.2.0, and `@babel/helper-validator-identifier` 7.16.7. The added ones are React 18.3.1 and its types, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `scheduler` 0.23.2 and `dequal`. `aria-query`, `@types/aria-query`, `lz-string` and `csstype` appear on both sides in different versions. None of the 215 entries that stayed changed in `packages`. In `snapshots` only `@babel/highlight@7.16.10` changed. It now depends on `@babel/helper-validator-identifier` 7.29.7, which was already there, in place of 7.16.7. As in steps 4 and 5, these counts leave out the 15 entries for pnpm itself in the first YAML document of the lockfile. With them it is 250 to 242.
   `lib/` is byte-identical to #69, and `npm pack` still lists 6 files. The wider peer range reaches consumers only through the packed `package.json`.
7. **CI.** Done, ahead of step 2. `ci.yml` replaced `main.yml`. It runs on pull requests and pushes to `main` with Node 24, and runs install, lint, test, build, `@arethetypeswrong/cli --pack` and the smoke test with `use:local`, on the tooling that exists today. `use:local` now creates `smoke/dist` itself, so it works on a fresh checkout and `npm test` no longer quietly tests `latest` from the registry after it fails. CI does not check where the installed package came from, since a failed step already stops the job. Later steps extend `ci.yml`: typecheck in step 2, test files in that typecheck in step 4, oxlint and the format check in step 5, the React 18 and 19 matrix in step 6.
8. **Release.** Done in step 1. `release.yml` installs and tests with pnpm. It keeps `npm publish` in `packages/main`, because npm 11.5.1 or later is what I verified with Trusted Publishing. It keeps the file name. The 1.11.0 release in step 10 verified it.
9. **Docs in the repo.** Add the commands from steps 4 and 5 to `CONTRIBUTING.md`, for test, lint and format. The pnpm basics landed in step 1. The test, coverage and typecheck lines landed in step 4. The lint and format lines landed in step 5.
10. **Release 1.11.0** from a tag to prove the new pipeline end to end. It is a minor release, because the syntax floor rises to ES2019 and consumers need TypeScript 4.5 or later. Bump `version` in `packages/main/package.json` in this step.
   Done. `version` in `packages/main/package.json` is 1.11.0. Both READMEs got a Requirements section with the React peer range, TypeScript 4.5 or later and ES2019. The usage examples did not change.
   After #71 merged, the `v1.11.0` tag was pushed on 3fe2af6 with michiharu's go-ahead. Run 36319590312 of `release.yml` passed both jobs. `publish` checked the tag against `version`, ran 162 tests and published 1.11.0 with provenance through Trusted Publishing. `smoke` passed against the published 1.11.0. npm `latest` is 1.11.0. The GitHub Release v1.11.0 was created by hand. Its body is the "What changes for consumers" section of #71, with each heading one level up.

### Done when

- `ci.yml` is green on the PR.
- arethetypeswrong reports no problems.
- The smoke test passes against the packed tarball and against the published 1.11.0.

All three hold. The last one held when the smoke job of run 36319590312 passed against the published 1.11.0.

PRs: #64 pnpm, #65 CI, #66 tsdown, #67 TypeScript 5, #68 Vitest, #69 oxlint and oxfmt, #70 React, #71 version 1.11.0 and the READMEs, #72 release record.

## Phase 3. Browser tests before the rewrite (done)

Today's tests run in jsdom and assert the `style` values that JavaScript computes. After phase 4 the browser does the layout, and jsdom cannot see it. Before the rewrite, add tests in Vitest Browser Mode with Playwright that check:

- how many columns render for a given width
- that the last row is left-aligned
- which cards render at a given scroll offset
- that `loadMore` fires when the loading card or row appears
- `onScroll` with `indexesOfVisible`

The tests pass on the source at 1.11.0. Phase 2 kept its runtime behavior equal to 1.10.3. So I know they check behavior, and they should still hold after the rewrite.

### Where things stand

- `packages/main/vitest.config.mts` has two Vitest projects. `unit` runs in jsdom and takes every test file except `*.browser.test.tsx`. `browser` runs those in Vitest Browser Mode, with Playwright and Chromium and `headless: true`. Vitest defaults `headless` to `process.env.CI`, so it is set explicitly.
- `test` runs `unit` only and `test:browser` runs `browser`. `coverage` covers `unit`. The root `package.json` has `test:browser` too.
- New devDependencies in `packages/main`: `@vitest/browser-playwright` ^5.0.2, `playwright` ^1.63.0 and `vitest-browser-react` ^2.3.0.
- `packages/main/tsconfig.json` sets `skipLibCheck`. The types of `vitest/browser` need Node's `BufferEncoding`, and `src` has no Node types.
- `.gitignore` ignores the screenshots Browser Mode writes when a test fails.
- `ci.yml` installs the Chromium headless shell with `--with-deps` and runs `pnpm test:browser` after `pnpm test`, on both React legs. `release.yml` did not change.
- `CONTRIBUTING.md` has the `pnpm test:browser` line, the one-time Chromium install and the two extra steps for the React 19 check.

### Tests

`src/CardWindow.browser.test.tsx` has 19 tests. `columns` has 7, `last row` 7, `scroll offset` 1, `loadMore` 3 and `onScroll` 1. `pnpm test` still reports 2 files and 162 tests passed.

I ran both on the #74 branch. On React 18.3.1, `pnpm test` reports 162 passed and `pnpm test:browser` 19 passed. In a scratch copy switched to React 19.3.0, the same two commands report the same numbers.

While the tests were written, each group except `columns` was checked against a deliberate break, and it failed as expected:

- With the default `lastRowAlign` changed to `'inherit'`, 6 of the 7 last-row cases fail. `left` passes.
- With a `scrollTop` of 800 instead of 1108, the scroll offset test fails.
- Never calling `loadMore` fails all 3 `loadMore` tests. Calling it on every scroll fails the 2 "is not called at the top" cases.
- Dropping the first index from `indexesOfVisible` fails the `onScroll` test.

### The contract the tests rely on

Phase 4 keeps it, or changes it in the test helpers only.

1. The tests import only from the public entry. They never import `functions` or other internals.
2. The card puts `style` on its root element.
3. The root element of CardWindow is the scroll container. It is the first child of the frame that sets the width and the height.
4. Assertions read only `getBoundingClientRect`, whether an element is in the DOM, and the arguments of callbacks. They never read px values from `style`, the `row` and `col` props, or `functions`.

### Notes for phase 4

- The widths in the column tests sit where two rules agree. 1.11.0 gives space-evenly `floor((w - 24) / 108)` columns, and CSS Grid's `auto-fill` gives `floor((w - 8) / 108)`. Phase 4 follows `auto-fill`. See the decisions of 2026-09-28.
- 1.11.0 works out the visible rows in `getRenderFirstRow` and `getRenderLastRow`, and that math ignores `spacing.top`. So the scroll offsets in the tests keep every card edge and every 0.5 threshold at a distance.
- `loadMore` and `onScroll` are asserted without exact call counts, and `onScroll` on its last call only. An `IntersectionObserver` and batching in `requestAnimationFrame` should still pass them.

### Lockfile

The lockfile went from 227 `packages` entries to 246, with 19 added and none removed. The added ones are `@vitest/browser-playwright`, `@vitest/browser`, `@vitest/ui`, `@vitest/utils`, `@vitest/pretty-format`, `playwright`, `playwright-core`, `vitest-browser-react`, `@blazediff/core`, `@polka/url`, `convert-source-map`, `fflate`, `flatted`, `mrmime`, `pathe`, `pngjs`, `sirv`, `totalist` and `ws`. No entry that stayed changed in `packages`. In `snapshots` only `vitest` and `@vitest/coverage-v8` were re-keyed. As in phase 2, these counts leave out the 15 entries for pnpm itself. With them it is 242 to 261.

`lib/` from `pnpm build` is byte-identical to a build of 137324e on `main`, and `npm pack` still lists 6 files.

### Done when

- `ci (18)` and `ci (19)` are green on the PR, with the `pnpm test:browser` step.

It holds. On #74, `ci (18)` and `ci (19)` passed in run 36333552544, the `pnpm test:browser` step included.

PRs: #74 browser tests.

## Phase 4. Performance rewrite (2.0.0) (done)

- Lay cards out with CSS Grid. `grid-template-columns: repeat(auto-fill, <width>)` with `justify-content` keeps the last row left-aligned without any JavaScript. `stretch` maps to `minmax(<width>, 1fr)`. `start` and `end` are new, and they pass through to `justify-content` as `left` and `right` do. `space-evenly` gets the column count `auto-fill` gives, like every other value.
- Remove `lastRowAlign` and the `LastRowAlign` type.
- No grid props in the public API.
- Scroll: a passive listener, work batched in `requestAnimationFrame`, and a state update only when the visible row range changes.
- Resize with `ResizeObserver`. Infinite loading with an `IntersectionObserver` on a sentinel element.
- Measure before and after. Record the numbers in the PR.

### Where things stand

- The DOM has four levels. The root is the scroll container. It sets `scrollbarGutter: 'stable'` before the `root.style` spread. Inside it is the sizer, with `container.className`, `boxSizing: 'border-box'`, `position: 'relative'` and an explicit height. Inside the sizer is the window, moved down with `translateY`. Inside the window is the grid. Its tracks are `repeat(auto-fill, <width>px)`, or `repeat(auto-fill, minmax(<width>px, 1fr))` for `stretch`, with `gridAutoRows`, the gaps and `justify-content`. The loading row is the grid's next sibling. A 1px sentinel sits absolutely positioned at the bottom of the sizer.
- The column count is read back from the resolved `grid-template-columns` in `readColumnCount`. There is no column formula in JavaScript. The count is read in two places. One is the callback of the only `ResizeObserver`, which observes the scroll container and updates state through `flushSync`. The other is the layout effect after every commit.
- Scroll uses a passive listener and one `requestAnimationFrame` per frame. State is set only when the render range changes. `getRenderRange` keys that range on its first row. It spans `ceil((viewHeight + 2 × overScanPx + cardHeight) / pitch)` rows, so it changes only when its first row changes. `getRowRange` still gives the exact rows for `indexesOfVisible`. A `latest` ref is written after each commit, and the range is checked again against the live `scrollTop` after each commit too.
- Cards render through a module-level `React.memo` item and share one empty `style` object. Loading cards follow them in the grid.
- `loadMore` is called from an `IntersectionObserver` on the sentinel, with `rootMargin: <overScanPx>px 0px`. The observer is recreated when `data.length` changes.
- `pnpm bench` runs the benchmark in `packages/main/bench/`. It mounts a 1000×800 frame with 10,000 cards of 200×120, scrolls 600 frames by 40px, does the same with a no-op `onScroll`, and resizes the frame from 1000px to 500px and back in 10px steps. For each scenario it reports CPU time in script, layout and style, the layout and style recalc counts, card renders, DOM nodes, commits and the p95 frame interval. Commits is the number of tasks that changed the DOM during the scenario, counted with a `MutationObserver` on the frame. Chained commits in one task count once.

### What changes for consumers

The release PR copies this list into the GitHub Release.

- Removed: `lastRowAlign`, the `LastRowAlign` type, `maxCols` and the `useResizeObserver` export.
- `justifyContent` gains `start` and `end`.
- The column count follows grid `auto-fill` for every `justifyContent` value. For `space-evenly` that means one column more in a 16px band of widths per column count. At 332 to 347px it shows 3 columns where 1.11.0 shows 2.
- The `ref` now points at the scroll container element. In 1.x it received a function that returned the element, and the type hid that.
- `CardProps.style` and the `style` of a loading card are an empty object. The grid cell sizes the card.
- `OnScrollProps.updateWasRequested` means that this scroll changed the rendered row range.
- `indexesOfVisible` counts `spacing.top`.
- `loadMore` is called when the end comes within `overScanPx`, and again after `data` grows while the end is still that close. It is no longer called on every render.
- The loading row renders only when the last row is in range.
- A container narrower than one card shows one column. 1.11.0 showed nothing.
- The sizer no longer spills 16px past the scroll container.
- The root reserves a scrollbar gutter. `root.style` can override it. Where the platform shows classic scrollbars, the gutter narrows the content by the scrollbar width, so each column count starts at a frame that much wider.
- The mount no longer renders every card twice. In 1.11.0, `useResizeObserver` compared against a stale size and rendered again after the mount.

### Changes from the plan made during the work

- **Literal `auto-fill`, with the count read back.** The first design computed the column count in JavaScript. VirtuosoGrid in react-virtuoso 4.18.15 lets CSS draw the grid but computes the count again in JavaScript from measured sizes. Its issues #1158, #936 and #1023 come from that copy disagreeing with the CSS. card-window already knows the card size and needs only the count, so it reads the count from the browser. `auto-fill` cannot cap the columns, so `maxCols` went. With it went one phase 3 browser test, `columns > stops at maxCols`. That is the only change to the phase 3 tests. The other 18 are unchanged.
- **`scrollbarGutter: 'stable'`**, michiharu's decision. With a classic scrollbar, the first render inside the `ResizeObserver` callback made the scrollbar appear. That resized the observed box, and Chromium reported "ResizeObserver loop completed with undelivered notifications". A stable gutter keeps the content width fixed.
- **The column-change effect starts from the offset the scroll handler last recorded**, in `lastScrollTop`. By the time the effect runs, the browser has already clamped the live `scrollTop` to the shorter sizer, and the view jumped back.
- **The sizer is not observed.** The plan observed it too. A change reported on the sizer, followed by `flushSync`, changes the sizer's own height at the same depth, and that is the loop error again. The read after each commit covers changes to the sizer width. Those only come from CardWindow's props.
- **The sentinel exists only after the first measurement.** Before it the sizer is 0px tall, so `loadMore` would fire on mount for any list.
- **`shownRows`.** A `type: 'row'` loading row taller than the reach can leave the render range past the last card row. The window then starts at the last card row, so the loading row stays inside the sizer and `scrollHeight` does not grow.
- **The render range moves only with its first row.** The first measurement of `ea617c6` showed 336 layouts and style recalcs in the scroll scenarios, where 1.11.0 had 185. A probe counted commits, layouts and scroll events. `ea617c6` made 336 commits and 336 layouts. With the render range keyed on its first row it made 185 and 185. `ea617c6` with the reads and the re-check after each commit skipped still made 336, so those reads were not the cause. All three variants got 600 scroll events. The range from `getRowRange` changed at two offsets per row, once when a row entered at the bottom and once when a row left at the top. So every row cost two commits and two layouts. 1.11.0 re-rendered only when its first row changed. `getRenderRange` now returns `[first, first + span − 1]`, clamped to the last row. The unit sweep and fuzzing checked that this span always covers every row `getRowRange` returns, 4.86M cases in the task and 8M in review. There is a cost. Near the top the window still holds a full span, so the mount renders 44 cards where `ea617c6` rendered 32, and resize renders 122 where it rendered 86. Both stay far below 1.11.0's 64 and 2,400. michiharu accepted this to keep the rule that the range changes only when its first row does.
- **`useResizeObserver` was removed from the exports**, michiharu's decision.
- **The 2.0.0 version bump and the README migration notes go in a separate release PR**, as #71 did for 1.11.0.

### Tests

- `pnpm test` reports 2 files and 93 tests passed.
- `pnpm test:browser` reports 41 tests passed. The phase 3 groups are `columns` with 6, `last row` 7, `scroll offset` 1, `loadMore` 3 and `onScroll` 1. The new groups are `rendering` with 2, `classic scrollbar` 5, `justifyContent start and end` 6, `space-evenly column count` 1, `container style` 2, `resize without loop errors` 1, `loadMore reach` 3, `loading row past the end` 2 and `scroll commits` 1.
- Of the 162 jsdom tests, 95 were deleted with the code they tested: `getColumns` 25, `getRenderFirstRow` 10, `getRows` 12, `getRenderContainerStyle` 6, `getBaseItemProps` 12 and `getItemProps` 30. 67 are unchanged: `range` 8, `getScrollContainerHeight` 39, `getLastRowFromLength` 15, `getNextOffset` 3, the render test and the index test. 26 were added: `getRowRange` 16, `getRenderRange` 4, `getIndexRange` 5 and the export keys test.
- The layout is now asserted in the browser suite only.
- Headless Chromium on macOS hides scrollbars, but on Linux in CI it reserves a classic scrollbar's width in the gutter. So a browser test must not assume a 0px gutter. The first CI run failed `space-evenly column count` at a 340px frame, 2 columns where 3 were expected. That test now pins the gutter at 15px with the `classic-scrollbar` class and uses a 355px frame, which leaves 340px of client width on both platforms.

### Benchmark

I ran `pnpm bench --runs=5` on `9932974` for before and on `e2e564f` for after. `9932974` adds the benchmark to the 1.11.0 source, and `e2e564f` is the last source commit of phase 4. The before tree got `e2e564f`'s `bench/` copied in, so both print the same columns. The two trees alternated for 3 rounds in one session, before first. They ran on Chromium 153.0.8010.12 and Node 24.14.0 at 4x CPU throttle, on an Apple M3 Mac with 16GB of memory.

Counts were the same in all 3 invocations of each tree.

| Scenario | Layouts | Style recalcs | Commits | Card renders | DOM nodes |
| --- | --: | --: | --: | --: | --: |
| mount | 2 → 2 | 2 → 2 | 2 → 2 | 64 → 44 | 41 → 47 |
| scroll | 185 → 185 | 185 → 185 | 185 → 185 | 7400 → 740 | 51 → 47 |
| scroll-onscroll | 185 → 185 | 185 → 185 | 185 → 185 | 7400 → 740 | 51 → 47 |
| resize | 104 → 104 | 104 → 104 | 104 → 104 | 2400 → 122 | 41 → 47 |

Durations are the median of the 3 invocation medians, with the min to max range across the 3 in brackets.

| Scenario | | Script ms | Layout ms | Style ms | Task ms | p95 frame ms |
| --- | --- | --: | --: | --: | --: | --: |
| mount | before | 12.8 (11.9–13.5) | 9.4 (9.3–9.7) | 0.1 (0.1–0.7) | 26.0 (25.9–27.2) | 11.8 (10.4–11.9) |
| mount | after | 11.8 (11.4–12.5) | 9.7 (9.6–9.9) | 0.1 (0.1–0.1) | 26.0 (25.1–26.2) | 16.7 (16.7–16.7) |
| scroll | before | 90.5 (75.9–104.4) | 22.2 (17.8–26.9) | 8.5 (6.0–8.6) | 239.1 (190.2–271.0) | 16.7 (16.7–16.8) |
| scroll | after | 62.2 (58.3–65.4) | 30.2 (29.8–36.8) | 9.3 (8.0–9.7) | 174.9 (158.6–190.8) | 16.7 (16.7–16.7) |
| scroll-onscroll | before | 81.7 (66.4–83.4) | 19.5 (19.2–20.6) | 6.9 (5.3–8.6) | 210.9 (179.9–214.8) | 16.7 (16.7–16.8) |
| scroll-onscroll | after | 63.7 (61.3–121.5) | 35.2 (34.9–51.1) | 10.9 (10.3–20.0) | 188.6 (177.9–368.7) | 16.7 (16.7–16.7) |
| resize | before | 21.2 (19.5–24.2) | 3.7 (3.6–3.8) | 0.8 (0.7–0.8) | 49.9 (49.0–56.8) | 16.7 (16.7–16.8) |
| resize | after | 7.5 (7.2–8.0) | 3.6 (3.6–4.3) | 0.5 (0.4–1.0) | 37.4 (33.4–38.2) | 16.7 (16.7–16.8) |

Card renders fell to a tenth in the scroll scenarios, from 7400 to 740. Resize renders 122 cards where 1.11.0 rendered 2400, and the mount 44 where it rendered 64. The mount no longer renders every card twice. The window now holds 47 elements in every scenario, because it always keeps a full span. That is 6 more than 1.11.0 at the top of the list and 4 fewer while scrolling. Layouts and style recalcs in the scroll scenarios are 185, the same as 1.11.0, and there is one commit per row scrolled. The first measurement of `ea617c6` showed 336 here. That was traced and fixed, as the bullet on the render range above describes. Task time fell in the scroll scenarios, from 239.1ms to 174.9ms and from 210.9ms to 188.6ms, and in resize from 49.9ms to 37.4ms. Layout time in the scroll scenarios went up, from 22.2ms to 30.2ms and from 19.5ms to 35.2ms, for the same number of layouts. I do not know why each layout costs more. Apart from one invocation, durations move between invocations by up to 81ms of task time. That one, scroll-onscroll after in round 1, took 368.7ms, twice the other two. That is why the rounds alternated.

### Known limitations

- A `LoadingComponent` or a card that is wider than its box overflows horizontally. CardWindow does not clip it. If that overflow first appears during the render inside the `ResizeObserver` callback, a classic horizontal scrollbar can trigger the loop error.
- The loop error can also occur when the frame has no set height. That case never virtualized in 1.x either.

### Done when

- `ci (18)` and `ci (19)` are green on the PR. That covers lint with the hooks rules as errors, the format check, typecheck, the unit and browser tests, the build, arethetypeswrong and the smoke test against the packed tarball.

### Next

The 2.0.0 release PR bumps the version, updates the README Requirements, adds the migration notes and settles the `ReactDOM.render` question. Phase 5 follows it.

## Phase 5. Astro docs site

- Astro with Starlight. Live examples as React islands.
- Move `intro.md`, `examples.mdx`, `example-utils.mdx` and the API reference that typedoc generates today.
- Deploy to GitHub Pages at https://annetaan.github.io/card-window/ from Actions.

## Decisions

Decided on 2026-09-27.

- Lint and format: oxlint and oxfmt.
- Peer range: include React 19, verified in CI on 18 and 19.
- Website in phase 2: out of the pnpm workspace until phase 5.
- Package manager: pnpm 12.6.0.
- `release.yml` and `CONTRIBUTING.md` move to pnpm in step 1, so `main` stays releasable.
- CI first: step 7 runs before step 2.
- Typecheck: `src` in CI from step 2, test files from step 4.
- CI does not verify that the smoke test installed the local tarball.
- `src/index.ts` may split its type re-exports into `export type`. It is the only source change in phase 2, and the emitted JS does not change.
- tsdown targets ES2019. tsdown cannot emit ES5.
- CJS types are `.d.ts` beside the `.js`. With `.d.cts`, consumers on TypeScript 4.5 and 4.6 would not see the types.
- TypeScript stays at 4.6.3 in step 2. Step 3 clears tsdown's peer warning.
- TypeScript moves to 5.9.3 in step 3. 6.0 and 7.0 come after step 5 removes ESLint.
- `isolatedModules` yes, `verbatimModuleSyntax` no. The latter needs the type-only imports in `src` rewritten.
- Test runner: Vitest 5 with jsdom 29. jsdom 30 would lift the Node floor above tsdown's.
- Tests import from `vitest` explicitly. `globals` stays off.
- `@testing-library/jest-dom` is removed. No test uses its matchers.
- The `coverage` script stays, on `@vitest/coverage-v8`.
- The next release is 1.11.0, not 1.10.4, because the syntax floor and the TypeScript floor both rise.
- Lint base: oxlint's `correctness` with the `typescript`, `react`, `jsx-a11y` and `import` plugins, plus the rules the old config set by name and the @typescript-eslint/recommended v5 rules that `correctness` misses. The airbnb rules are not ported one by one.
- `react/rules-of-hooks` is an error. `react/exhaustive-deps` and `react/refs` stay warnings until phase 4. Phase 4 made them errors.
- Lint and format cover all of `packages/main`.
- oxfmt uses `trailingComma: "all"`.
- Import declaration order is enforced by the format check, through `sortImports` in oxfmt.
- `lint` only checks. Fixes go through `fix`.
- `.vscode/settings.json` is deleted.
- No `.vscode/extensions.json`. michiharu uses VS Code mostly as a viewer. The MD013 comment in `.markdownlint.jsonc` now names oxfmt.
- Dev React and its types are devDependencies of `packages/main`. The root `package.json` has no devDependencies.
- `@testing-library/react` 16, the only line that supports both React 18 and 19.
- The React matrix covers the whole `ci` job.
- CI tests the latest React 19.x. The version is not pinned.
- React 16.13 and 17 stay in the peer range, untested.
- The peer range was widened to `<20` in the same PR, after `ci (18)` and `ci (19)` passed on the old range.
- Release notes for 1.11.0: a GitHub Release, created by hand after the publish succeeds, with its body taken from the PR. No CHANGELOG file.
- The READMEs get a short Requirements section in 1.11.0. The usage examples stay as they are.
- `release.yml` moves `actions/checkout` and `actions/setup-node` from v4 to v7, the versions `ci.yml` uses. It is a follow-up in its own PR, after phase 2, and does not reopen it. `release.yml` runs only on a tag, so the next release tag verifies the change. Done.
- The checkout in `release.yml` sets `persist-credentials: false`, as `ci.yml` does. Nothing in `release.yml` uses git credentials, so the GitHub token is not left where scripts that run before the publish can read it.

Decided on 2026-09-28.

- Browser tests: Vitest Browser Mode with Playwright, Chromium only, headless.
- The browser tests render with `vitest-browser-react`. It turns the act environment on only inside its own `act`, so real `ResizeObserver` and scroll updates do not warn. The jsdom tests keep `@testing-library/react`.
- `pnpm test` stays jsdom only. `pnpm test:browser` is a separate script. `release.yml` does not run the browser tests.
- `skipLibCheck: true` rather than `@types/node`. With `@types/node`, Node globals would type-check in `src`.
- The browser tests assert behavior only, as the contract in phase 3 says.
- 2.0.0 may behave a little differently from 1.x. Where matching 1.x exactly and a modern, plain spec and implementation pull apart, 2.0.0 takes the plain one. That is why it is a major version. The decisions below follow from it.
- `lastRowAlign` is removed in 2.0.0, together with the exported `LastRowAlign` type.
- `justifyContent` gains `'start'` and `'end'`. `'left'` and `'right'` stay. Grid's `justify-content` takes all four, and `start` and `end` follow the writing direction.
- `space-evenly` gets the column count of grid's `auto-fill`, the same rule as every other value: `floor((contentWidth + x) / (width + x))`. With a 100px card and the default spacing this is `floor((w - 8) / 108)`, where 1.11.0 gives `floor((w - 24) / 108)`. From 2 columns up, each column count has a 16px band of widths where 2.0.0 shows one column more. At 332 to 347px it shows 3 where 1.11.0 shows 2. With the default spacing the edges get the same space as the gaps between cards. In 1.11.0 they are 8px wider.
- No grid props such as `gridTemplateColumns` in the public API. `justifyContent` stays, because its values map one to one onto grid.

Decided during phase 4 on 2026-09-28.

- The grid uses literal `auto-fill`, and CardWindow reads the column count back from the resolved tracks.
- `maxCols` is removed, together with its phase 3 test.
- `useResizeObserver` is removed from the exports.
- The root sets `scrollbarGutter: 'stable'`. `root.style` can override it.
- `ResizeObserver` observes the scroll container only.
- `loadMore` is called from an `IntersectionObserver` on a sentinel, when the end comes within `overScanPx` and again after `data` grows.
- The benchmark is committed as `pnpm bench`. Before and after are measured in alternating rounds.
- `react/exhaustive-deps` and `react/refs` are errors.
- The render range is keyed on its first row and changes only when that row changes. The exact rows are used only for `indexesOfVisible`.
- Near the top the window keeps a full span, so the mount and resize render a few more cards. michiharu accepted this.
- The 2.0.0 version bump and the READMEs go in a separate release PR.

## Open questions

- The README Requirements say React 19 works, but the usage example calls `ReactDOM.render`, which React 19 removed. `createRoot` exists only in React 18 and later. Fix the example before phase 5, or leave it for the Astro docs site. Not decided. The 2.0.0 release PR is where it gets settled.
- Each layout in the scroll scenarios costs 1.4 to 1.8 times what it did in 1.11.0, for the same 185 layouts. Not traced.

## Working conventions

- Talk with michiharu in Japanese. Everything in the repository is in English.
- Write English prose with the `personal:english-voice` skill. Show a Japanese back-translation of PR bodies in chat.
- One branch and one PR per step. michiharu merges.
- Pushing tags and running `npm deprecate` or other npm account actions need michiharu's go-ahead.
