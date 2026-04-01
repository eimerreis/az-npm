# @eimerreis/az-npm

[![npm version](https://img.shields.io/npm/v/%40eimerreis%2Faz-npm)](https://www.npmjs.com/package/@eimerreis/az-npm)
[![npm downloads](https://img.shields.io/npm/dm/%40eimerreis%2Faz-npm)](https://www.npmjs.com/package/@eimerreis/az-npm)
[![Release](https://github.com/eimerreis/az-npm/actions/workflows/release.yml/badge.svg)](https://github.com/eimerreis/az-npm/actions/workflows/release.yml)

Zero-config CLI that authenticates npm, pnpm, and bun against Azure DevOps Artifacts private feeds using the Azure CLI.

`az-npm` is published for the Node runtime and built with a Bun-based maintainer toolchain.

## Usage

```bash
npx @eimerreis/az-npm
```

Optional flags:

```bash
npx @eimerreis/az-npm --token <token>
npx @eimerreis/az-npm --cwd <path>
```

Exit codes:

```text
0  Authentication succeeded
1  Token acquisition failed
2  Detection, discovery, or write failed
```

## Development

```bash
bun install
bun test
bun run check
bun run build
```

## Releasing

```bash
bun run changeset
```

Push to `master`. The release workflow versions the package from pending changesets, publishes only when `package.json` changes, and creates a matching GitHub release using npm trusted publishing.
