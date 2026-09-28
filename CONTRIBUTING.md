# Contribution Guide

## Development

- `pnpm install`: installs the workspace, which holds `packages/main` only.
- `pnpm build`: builds card-window.
- `pnpm test`: runs the unit tests with Vitest in jsdom.
- `pnpm test:browser`: runs the browser tests with Vitest Browser Mode in headless Chromium through Playwright.
- `pnpm bench`: builds the page in `packages/main/bench` with Vite and measures mounting, scrolling and resizing in headless Chromium at 4x CPU throttling. It prints a Markdown table of medians over 5 runs, and `--runs=N` changes the count.
- `pnpm coverage`: runs the unit tests with a coverage report.
- `pnpm typecheck`: type-checks `src`, test files included, with `tsc`.
- `pnpm lint`: lints `packages/main` with oxlint.
- `pnpm format`: formats `packages/main` with oxfmt.
- `pnpm format:check`: checks the format without writing, as CI does.

Install Chromium once before the first `pnpm test:browser` or `pnpm bench`.
Run `pnpm --filter @annetaan/card-window exec playwright install --only-shell chromium`.
To watch the tests in a window, pass `--browser.headless=false`.

`packageManager` in the root `package.json` pins pnpm 12.6.0.
pnpm 10 cannot switch itself to 12 and fails with `Unknown system error -8`.
Use pnpm 12, or run `npx -y pnpm@12.6.0`.

Building needs Node 22.18 or a later 22.x, Node 24.11 or a later 24.x, or Node 26 or later, because tsdown requires it.

`packages/website` is outside the workspace until phase 5 replaces it.
Until then, the docs site cannot be run or deployed.

## Smoke test

`smoke/` installs `@annetaan/card-window@latest` from the npm registry and checks the published package.
It sits outside the pnpm workspace on purpose, so it never links the local `packages/main`.

```bash
cd smoke
npm install
npm test
```

To check a build before it is published, pack `packages/main` and install the tarball instead.
`use:local` builds through the `prepack` script of `packages/main`, so run `pnpm install` at the root first.

```bash
cd smoke
npm install
npm run use:local
npm test
```

## React 19

CI runs the unit tests, the browser tests and the smoke test on React 18 from the lockfile, and again on the latest React 19.
To run them on React 19 locally, work in a scratch copy.
The switch rewrites `packages/main/package.json` and `pnpm-lock.yaml`, and `git archive` copies only what is committed.

```bash
mkdir /path/to/scratch
git archive HEAD | tar -x -C /path/to/scratch
cd /path/to/scratch
pnpm install --frozen-lockfile
pnpm --filter @annetaan/card-window add -D react@19 react-dom@19 @types/react@19 @types/react-dom@19
pnpm test
pnpm --filter @annetaan/card-window exec playwright install --only-shell chromium
pnpm test:browser
cd smoke
npm install
npm run use:local -- react@19 react-dom@19 @types/react@19 @types/react-dom@19
npm test
```

Pass React 19 to `use:local` as shown, so it goes into the same install as the packed tarball.
A second `npm install --no-save` replaces the tarball with `latest` from the registry, and the smoke test then checks the wrong package.
`npm warn ERESOLVE overriding peer dependency` during that install is expected.

## Release

Releases are published from GitHub Actions with npm Trusted Publishing.

1. Bump `version` in `packages/main/package.json` and merge it into `main`.
2. Push a tag that matches the version, for example `git tag v1.10.3 && git push origin v1.10.3`.
3. `.github/workflows/release.yml` runs the tests, publishes, waits for the registry and runs the smoke test against the new version.
