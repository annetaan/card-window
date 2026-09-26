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
