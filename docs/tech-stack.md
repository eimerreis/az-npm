# Tech Stack

## Recommendation

Use Bun + TypeScript for a small, fast CLI with minimal tooling overhead.

## Core Stack

- Runtime: `bun`
- Language: TypeScript 5 in strict mode
- Module system: ESM only
- Formatter and linter: `biome`
- Test runner: `bun:test`
- Build tool: `bun build`

## Libraries

- `ini` for `.npmrc` parsing and writing
- `smol-toml` for `bunfig.toml` parsing and writing
- `jose` for lightweight JWT inspection when token metadata is needed

## Architecture Fit

- Bun keeps CLI startup and build tooling simple
- TypeScript strict mode helps preserve correctness during migration from older implementation patterns
- Biome gives one fast tool for linting and formatting
- `bun:test` is sufficient for module-level unit tests and integration-style CLI coverage
- `bun build --compile` supports standalone binary output for distribution

## Hosting and Distribution

- Source repo hosted on GitHub
- Local execution via `bun run`
- Distributed builds via compiled binaries from `bun build --compile`
- CI can run in GitHub Actions or any environment with Bun available

## Commands

```bash
bun install
bun run src/cli.ts
bun test
bun run check
bun run check:fix
bun run build
bun run build:bin
```

## Alternatives Considered

### Node.js + tsx

Pros:
- More conventional ecosystem path
- Broader compatibility with existing CLI guidance

Cons:
- More moving pieces for runtime, test runner, and build setup
- Less aligned with the modernization goal centered on Bun

### Go or Rust rewrite

Pros:
- Strong standalone binary story
- Good performance and distribution characteristics

Cons:
- Higher migration cost
- Harder to preserve existing JS ecosystem behavior and package-manager config handling quickly

## Decision

Choose Bun-first TypeScript for the migration. It is the smallest modern stack that materially improves maintainability, build ergonomics, and distribution without turning the rewrite into a full platform change.
