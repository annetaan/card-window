# Modernization plan

This is the working plan for bringing card-window up to date. I keep it here so a new session can pick up where the last one stopped. Update the status lines as work lands.

Last updated: 2026-09-27

## Goals

1. Move ownership to the annetaan organization, on GitHub and on npm.
2. Replace the old tooling. pnpm, tsdown, Vitest and a working CI.
3. Make rendering cheaper on the CPU. Let CSS do the layout and handle scroll events with less work. The last row must stay left-aligned.
4. Rewrite the docs site in Astro and move the current content over.

Phases run in this order. Phase 4 changes the API, so the docs wait for it.

| Phase | What | Status |
| --- | --- | --- |
| 1 | Ownership transfer | Done |
| 2 | Tooling and CI | In progress |
| 3 | Browser tests before the rewrite | Not started |
| 4 | Performance rewrite, released as 2.0.0 | Not started |
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

## Phase 2. Tooling and CI (in progress)

Branches: `chore/modern-tooling` for step 1, `chore/ci-workflow` for step 7.

The rule for this phase is to leave the library source alone. The package that comes out should behave exactly like 1.10.3. The smoke test and arethetypeswrong prove that.

### Where things stand

- pnpm 12.6.0 workspace, pinned by `packageManager` in the root `package.json`. It holds `packages/main` only.
- `pnpm-lock.yaml` was imported from `yarn.lock` with `pnpm import`, so every version is unchanged.
- `allowBuilds` in `pnpm-workspace.yaml` denies the build of `core-js-pure`. `esbuild` left the lockfile with esbuild-jest, so step 4 took it out of `allowBuilds`. `core-js-pure` stays through `eslint-plugin-jsx-a11y`, `aria-query@4` and `@babel/runtime-corejs3`. It goes in step 5.
- The pnpm 10 that mise installs locally cannot switch itself to 12. mise older than 2026.9.x cannot install pnpm 12 either, because its aqua registry expects the old asset name `pnpm-macos-arm64` and pnpm 12 ships `pnpm-darwin-arm64.tar.gz`. Upgrade mise first (`brew upgrade mise` for a Homebrew install, which cannot run `mise self-update`), then run `mise upgrade pnpm` and open a new shell. `npx -y pnpm@12.6.0` remains the fallback.
- `packages/main`: tsdown 0.23 (rolldown), TypeScript 5.9.3, Vitest 5 with jsdom 29, ESLint 8 with airbnb and `.eslintrc.js`, Prettier 2. tsdown does not type-check. `pnpm typecheck` runs `tsc --noEmit` on `src`, test files included, and CI runs it too.
- `packages/main/tsconfig.json` sets `target` and the ES part of `lib` to ES2019 to match tsdown's target. They only affect type checking. It uses `moduleResolution: bundler`, `jsx: react` and `isolatedModules`. It sets `noEmit`, so tsdown writes all the output. With `isolatedModules`, a type re-export without `export type` makes `pnpm typecheck` fail with TS1205.
- ESLint's @typescript-eslint 5.17.0 officially supports TypeScript below 4.7.0. So a run in a terminal prints an unsupported-version warning. CI does not print it. The findings are the same as before the update. Step 5 removes ESLint.
- `packages/main/tsdown.config.mts` sets the build output. It writes four files: `lib/esm/index.mjs`, `lib/esm/index.d.mts`, `lib/cjs/index.js` and `lib/cjs/index.d.ts`. Each format gets one type file. The target is ES2019. The syntax target comes from the tsdown config, not from `tsconfig.json`.
- `packages/main/vitest.config.mts` only sets the jsdom environment. `globals` is off, so the tests import `describe`, `test` and `expect` from `vitest`. `test` is `vitest run`. `coverage` is `vitest run --coverage` with `@vitest/coverage-v8`.
- `main`, `module` and `exports` are the same as in 1.10.3. `types` points at `./lib/cjs/index.d.ts`.
- tsdown needs Node `^22.18.0 || ^24.11.0 || >=26.0.0`. Vitest 5 asks for `^22.12.0 || ^24.0.0 || >=26.0.0` and jsdom 29 asks for less, so tsdown still sets the Node floor. jsdom 30 would need `^22.22.2 || ^24.15.0 || >=26.0.0`.
- `packages/website`: Docusaurus 2.0.0-beta.18. It is replaced in phase 5.
- `smoke/`: a standalone npm package outside the pnpm workspace. `npm run use:local` clears `smoke/dist`, packs `packages/main` into it and installs the tarball.
- `.github/workflows/ci.yml` runs on pull requests and pushes to `main`, on Node 24 with pnpm from `pnpm/action-setup@v6.1.0`. It runs lint, typecheck, test, build, arethetypeswrong and the smoke test against the packed tarball. It replaced `main.yml`, which failed on every PR: first on the retired cache service behind `actions/setup-node@v2`, and after step 1 because its `cache: yarn` ran `yarn cache dir`, which rejects `packageManager: pnpm@12.6.0`.
- `.github/workflows/release.yml` installs and tests with pnpm through `pnpm/action-setup@v6.1.0`. The moving `v6` tag predates pnpm 12 support. It still publishes with `npm publish` in `packages/main`. It is untested until the 1.11.0 tag.
- Dev dependencies use React 17. `@testing-library/react` is 12.1.5, the last version for React 17, with the peer `react <18`. Step 6 moves it to a version for React 18. The smoke test uses React 18. The peer range is `>=16.13.0 <19`.

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
6. **React.** Move dev React to 18. Widen the peer range to include React 19, but only after CI runs the unit tests and the smoke test on React 18 and 19 in a matrix and both pass.
   The matrix goes in `ci.yml`.
7. **CI.** Done, ahead of step 2. `ci.yml` replaced `main.yml`. It runs on pull requests and pushes to `main` with Node 24, and runs install, lint, test, build, `@arethetypeswrong/cli --pack` and the smoke test with `use:local`, on the tooling that exists today. `use:local` now creates `smoke/dist` itself, so it works on a fresh checkout and `npm test` no longer quietly tests `latest` from the registry after it fails. CI does not check where the installed package came from, since a failed step already stops the job. Later steps extend `ci.yml`: typecheck in step 2, test files in that typecheck in step 4, oxlint and the format check in step 5, the React 18 and 19 matrix in step 6.
8. **Release.** Done in step 1. `release.yml` installs and tests with pnpm. It keeps `npm publish` in `packages/main`, because npm 11.5.1 or later is what I verified with Trusted Publishing. It keeps the file name. The 1.11.0 release in step 10 verifies it.
9. **Docs in the repo.** Add the commands from steps 4 and 5 to `CONTRIBUTING.md`, for test, lint and format. The pnpm basics landed in step 1. The test, coverage and typecheck lines landed in step 4. Lint and format remain for step 5.
10. **Release 1.11.0** from a tag to prove the new pipeline end to end. It is a minor release, because the syntax floor rises to ES2019 and consumers need TypeScript 4.5 or later. Bump `version` in `packages/main/package.json` in this step.

### Done when

- `ci.yml` is green on the PR.
- arethetypeswrong reports no problems.
- The smoke test passes against the packed tarball and against the published 1.11.0.

## Phase 3. Browser tests before the rewrite

Today's tests run in jsdom and assert the `style` values that JavaScript computes. After phase 4 the browser does the layout, and jsdom cannot see it. Before the rewrite, add tests in Vitest Browser Mode with Playwright that check:

- how many columns render for a given width
- that the last row is left-aligned
- which cards render at a given scroll offset
- that `loadMore` fires when the loading card or row appears
- `onScroll` with `indexesOfVisible`

These tests must pass on 1.10.x first. Then I know they check behavior, and they will still hold after the rewrite.

## Phase 4. Performance rewrite (2.0.0)

- Lay cards out with CSS Grid. `grid-template-columns: repeat(auto-fill, <width>)` with `justify-content` keeps the last row left-aligned without any JavaScript. `stretch` maps to `minmax(<width>, 1fr)`.
- Scroll: a passive listener, work batched in `requestAnimationFrame`, and a state update only when the visible row range changes.
- Resize with `ResizeObserver`. Infinite loading with an `IntersectionObserver` on a sentinel element.
- Measure before and after. Record the numbers in the PR.

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

## Open questions

- `lastRowAlign: 'right'` is hard to express in CSS Grid. Keep it with some JavaScript, or remove it in 2.0.0. Decide in phase 4.

## Working conventions

- Talk with michiharu in Japanese. Everything in the repository is in English.
- Write English prose with the `personal:english-voice` skill. Show a Japanese back-translation of PR bodies in chat.
- One branch and one PR per step. michiharu merges.
- Pushing tags and running `npm deprecate` or other npm account actions need michiharu's go-ahead.
