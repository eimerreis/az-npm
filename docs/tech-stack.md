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

## Hosting and Distribution

- Source repo hosted on GitHub
- Local execution via `bun run`
- Distributed builds via compiled binaries from `bun build --compile`
- CI can run in GitHub Actions or any environment with Bun available
