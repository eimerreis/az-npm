# @eimerreis/az-npm

## 0.2.1

### Patch Changes

- 98f74f9: Run Azure CLI through a shell on Windows so `az.cmd` installations work.

## 0.2.0

### Minor Changes

- 7d27ad3: Initial public release of `@eimerreis/az-npm`.

  Highlights:

  - detect npm, pnpm, and Bun projects from lockfiles
  - discover Azure DevOps package feeds from project `.npmrc`
  - resolve credentials from explicit token, CI env, or Azure CLI
  - write user-level npm and Bun auth configuration
  - ship a CLI runnable via `npx @eimerreis/az-npm`
