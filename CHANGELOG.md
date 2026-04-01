# @eimerreis/az-npm

## 0.2.0

### Minor Changes

- 7d27ad3: Initial public release of `@eimerreis/az-npm`.

  Highlights:

  - detect npm, pnpm, and Bun projects from lockfiles
  - discover Azure DevOps package feeds from project `.npmrc`
  - resolve credentials from explicit token, CI env, or Azure CLI
  - write user-level npm and Bun auth configuration
  - ship a CLI runnable via `npx @eimerreis/az-npm`
