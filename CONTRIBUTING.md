# Contribution Guide

## Development

- `pnpm install`: installs the workspace, which holds `packages/main` only.
- `pnpm build`: builds card-window.
- `pnpm test`: runs the unit tests with Vitest.
- `pnpm coverage`: runs the unit tests with a coverage report.
- `pnpm typecheck`: type-checks `src` with `tsc`.

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

## Release

Releases are published from GitHub Actions with npm Trusted Publishing.

1. Bump `version` in `packages/main/package.json` and merge it into `main`.
2. Push a tag that matches the version, for example `git tag v1.10.3 && git push origin v1.10.3`.
3. `.github/workflows/release.yml` runs the tests, publishes, waits for the registry and runs the smoke test against the new version.
