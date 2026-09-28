# Contribution Guide

## Development

- `pnpm install`: installs the workspace, which holds `packages/main` and the docs site in `packages/website`.
- `pnpm build`: builds card-window.
- `pnpm test`: runs the unit tests with Vitest in jsdom.
- `pnpm test:browser`: runs the browser tests with Vitest Browser Mode in headless Chromium through Playwright.
- `pnpm bench`: builds the page in `packages/main/bench` with Vite and measures mounting, scrolling and resizing in headless Chromium at 4x CPU throttling. It prints a Markdown table of medians over 5 runs, and `--runs=N` changes the count.
- `pnpm coverage`: runs the unit tests with a coverage report.
- `pnpm typecheck`: type-checks `src`, test files included, with `tsc`.
- `pnpm lint`: lints `packages/main` and `packages/website` with oxlint.
- `pnpm format`: formats `packages/main` and `packages/website` with oxfmt.
- `pnpm format:check`: checks the format without writing, as CI does.
- `pnpm docs:dev`: starts the docs site with Astro's dev server.
- `pnpm docs:build`: builds the docs site into `packages/website/dist`.
- `pnpm docs:check`: type-checks the docs site with `astro check`.

Each `docs:` script builds card-window first, because the site imports it from `packages/main/lib`.
Each `docs:` script also generates the API reference from `packages/main/src` with typedoc into `packages/website/src/content/docs/api/`, which git ignores.
It does not regenerate while `docs:dev` runs, so restart the dev server to see changes to doc comments.
To work on card-window and the site together, run `pnpm watch` alongside `pnpm docs:dev`.

Install Chromium once before the first `pnpm test:browser` or `pnpm bench`.
Run `pnpm --filter @annetaan/card-window exec playwright install --only-shell chromium`.
To watch the tests in a window, pass `--browser.headless=false`.

`packageManager` in the root `package.json` pins pnpm 12.6.0.
pnpm 10 cannot switch itself to 12 and fails with `Unknown system error -8`.
Use pnpm 12, or run `npx -y pnpm@12.6.0`.

Building needs Node 22.18 or a later 22.x, Node 24.11 or a later 24.x, or Node 26 or later, because tsdown requires it.

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

## Docs site

`.github/workflows/docs.yml` builds the site on every pull request, and on a push to `main` it also deploys the site to https://annetaan.github.io/card-window/ through GitHub Pages.
The repository's Pages source is "GitHub Actions", and the `github-pages` environment accepts deployments from `main` only.

## Release

Releases are published from GitHub Actions with npm Trusted Publishing.

1. Bump `version` in `packages/main/package.json` and merge it into `main`.
2. Push a tag that matches the version, for example `git tag v1.10.3 && git push origin v1.10.3`.
3. `.github/workflows/release.yml` runs the tests, publishes, waits for the registry and runs the smoke test against the new version.
