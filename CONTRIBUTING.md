# Contribution Guide

## Development

- `yarn`: install packages in root and subdirectories.
- `yarn build`: build card-window.
- `yarn start`: start document server.

## Smoke test

`smoke/` installs `@annetaan/card-window@latest` from the npm registry and checks the published package.
It sits outside the workspaces on purpose, so it never links the local `packages/main`.

```bash
cd smoke
npm install
npm test
```

To check a build before it is published, pack `packages/main` and install the tarball instead.

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
