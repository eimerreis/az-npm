# az-npm-auth

Zero-config CLI that authenticates npm, pnpm, and bun registries against Azure DevOps Artifacts feeds using the Azure CLI.

## Docs

- [Product spec](docs/product.md)
- [Tech stack](docs/tech-stack.md)
- [Architecture](docs/architecture.md)
- [Feature specs](docs/features/)

## Commands

```bash
# Install dependencies
bun install

# Run
bun run src/cli.ts

# Test
bun test

# Test (watch mode)
bun test --watch

# Lint + format check
bun run check

# Lint + format fix
bun run check:fix

# Build (bundled)
bun run build

# Build (standalone binary)
bun run build:bin
```

## Project Structure

```text
src/
├── cli.ts
├── index.ts
└── lib/
    ├── auth.ts
    ├── detect.ts
    ├── feed.ts
    ├── npmrc.ts
    ├── bunfig.ts
    └── token.ts
```

## Coding Conventions

- TypeScript strict mode
- ESM only
- Biome for linting and formatting
- No `any`; use `unknown` and narrow types explicitly
- Prefer functions and plain objects over classes
- Throw typed errors, never raw strings
- Keep `console` usage in `src/cli.ts`; library code returns data
- Colocate tests as `*.test.ts`
- Use `node:` imports for built-ins where applicable

## Feature Development

Feature specs live in `docs/features/`.

Create a feature spec before implementing any non-trivial feature. Each spec should include:

- user stories
- technical approach
- implementation checklist
- acceptance criteria
