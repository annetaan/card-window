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
| 2 | Tooling and CI | Next |
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

## Phase 2. Tooling and CI (next)

Branch: `chore/modern-tooling`.

The rule for this phase is to leave the library source alone. The package that comes out should behave exactly like 1.10.3. The smoke test and arethetypeswrong prove that.

### Where things stand

- yarn v1 workspaces with `packages/**`. yarn is not installed globally on the dev machine. Use `npx -y yarn@1.22.22` until pnpm lands.
- `packages/main`: rollup 2 with rollup-plugin-typescript2, TypeScript 4.5, jest 27 with esbuild-jest, ESLint 8 with airbnb and `.eslintrc.js`, Prettier 2.
- `packages/main/scripts/emit-mts-types.cjs` copies ESM types to `.d.mts`. It exists only because of rollup-plugin-typescript2. Delete it once tsdown emits `.d.mts` and `.d.cts`.
- Build output is `lib/cjs/index.js`, `lib/esm/index.mjs` and their types. `exports` maps `import` and `require` with separate `types`.
- `packages/website`: Docusaurus 2.0.0-beta.18. It is replaced in phase 5.
- `smoke/`: a standalone npm package outside the workspaces. `npm run use:local` installs a packed tarball. Keep it outside the pnpm workspace for the same reason.
- `.github/workflows/main.yml` is broken. `actions/setup-node@v2` fails on a retired cache service before install. Node 14.
- `.github/workflows/release.yml` works. It uses yarn today.
- Dev dependencies use React 17. The smoke test uses React 18. The peer range is `>=16.13.0 <19`.

### Steps

1. **pnpm.** Add `pnpm-workspace.yaml` and `packageManager` in the root `package.json`. Delete `yarn.lock`. Turn root scripts into `pnpm --filter`. The website depends on the library with `workspace:*`.
2. **tsdown.** Replace rollup. Emit ESM and CJS with `.d.mts` and `.d.cts`. Keep the `exports` shape from 1.10.3. Delete `rollup.config.js`, `scripts/emit-mts-types.cjs` and the `prebuild` and `postbuild` scripts. Check `npm pack --dry-run` for the file list.
3. **TypeScript 5.** Update `tsconfig.json`. The current one targets ES5 with `moduleResolution: node`.
4. **Vitest.** Replace jest and esbuild-jest. Keep jsdom. Move `@testing-library/react` to a version that supports the React used in dev. All 162 tests must pass without changes to what they assert.
5. **Lint and format.** ESLint 9 flat config with typescript-eslint and react-hooks, Prettier 3. Or Biome. See open questions.
6. **React.** Move dev React to 18. Decide the peer range. See open questions.
7. **CI.** Replace `main.yml` with `ci.yml` on pull requests and pushes to `main`. It runs install, lint, typecheck, test, build, `@arethetypeswrong/cli --pack`, and the smoke test with `use:local`. Node 24.
8. **Release.** Switch `release.yml` to pnpm. Keep `npm publish` in `packages/main`, because npm 11.5.1 or later is what I verified with Trusted Publishing. Keep the file name.
9. **Docs in the repo.** Update `CONTRIBUTING.md` for pnpm.
10. **Release 1.10.4** from a tag to prove the new pipeline end to end.

### Done when

- `ci.yml` is green on the PR.
- arethetypeswrong reports no problems.
- The smoke test passes against the packed tarball and against the published 1.10.4.

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

## Open questions

- Lint: ESLint 9 with Prettier 3, or Biome. The current rules are airbnb plus a few overrides, including import order with React first.
- Peer range: add React 19? I would test it in CI first, with a matrix on React 18 and 19.
- Website during phase 2: keep Docusaurus building under pnpm, or drop it from the workspace until phase 5. Dropping it means the live docs cannot be redeployed until then.
- `lastRowAlign: 'right'` is hard to express in CSS Grid. Keep it with some JavaScript, or remove it in 2.0.0.

## Working conventions

- Talk with michiharu in Japanese. Everything in the repository is in English.
- Write English prose with the `personal:english-voice` skill. Show a Japanese back-translation of PR bodies in chat.
- One branch and one PR per step. michiharu merges.
- Pushing tags and running `npm deprecate` or other npm account actions need michiharu's go-ahead.
