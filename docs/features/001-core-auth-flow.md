# Feature: Core Auth Flow

## Overview
End-to-end authentication pipeline: detect the project's package manager, discover Azure DevOps Artifacts feed URLs from project config, acquire a token (via Azure CLI, CI env var, or explicit input), and write credentials to the appropriate config file (`.npmrc` or `bunfig.toml`). This is the foundational feature that makes the tool functional.

## User Stories
- As a developer with Azure CLI signed in, I want to run `az-npm-auth` in my project and have my `.npmrc` or `bunfig.toml` credentials updated automatically so I can install private packages without manual token management.
- As a CI pipeline operator, I want `az-npm-auth` to pick up `SYSTEM_ACCESSTOKEN` or similar env vars and authenticate non-interactively so builds work without interactive Azure CLI login.
- As a developer overriding defaults, I want to pass an explicit token via flag or env var so I can authenticate in environments where Azure CLI isn't available.

## Technical Approach
This feature maps directly to the planned architecture:

| Module | Responsibility |
| --- | --- |
| `src/lib/detect.ts` | Detect package manager from lockfiles: `bun.lock` or `bun.lockb` -> bun, `pnpm-lock.yaml` -> pnpm, `package-lock.json` -> npm |
| `src/lib/feed.ts` | Parse Azure DevOps registry URLs from project `.npmrc`; support both `pkgs.dev.azure.com` and `*.pkgs.visualstudio.com` patterns |
| `src/lib/token.ts` | Resolve token in priority order: explicit `--token`, CI env vars, Azure CLI |
| `src/lib/npmrc.ts` | Read and write `.npmrc` auth entries for npm and pnpm |
| `src/lib/bunfig.ts` | Read and write `bunfig.toml` auth entries for bun |
| `src/lib/auth.ts` | Orchestrate detect -> feed -> token -> writer and return structured results |
| `src/cli.ts` | Parse args, print output, and set exit codes |
| `src/index.ts` | Re-export the library entry points for programmatic use |

Config location strategy:
- Discover registry settings from project-level config first (`.npmrc` for npm/pnpm, `bunfig.toml` for bun when applicable)
- Default credential writes to user-level config (`~/.npmrc`, `~/.bunfig.toml`) to preserve the original tool's low-risk behavior
- Leave room for an explicit future override to write credentials to project config when requested

Key design decisions:
- Keep library code side-effect free except for the explicit config write step
- Preserve existing non-auth config entries when updating files
- Prefer user-level auth writes so project config continues to describe registries while user config holds secrets
- Base64-encode Azure DevOps token values for `.npmrc` password fields

Key libraries:
- `ini` for `.npmrc` parsing and writing
- `smol-toml` for `bunfig.toml` parsing and writing
- `jose` for token inspection if expiry metadata is needed

## Implementation Plan
- [ ] Task 1: Project scaffold — initialize `package.json`, `tsconfig.json`, `biome.json`, install dependencies, create `src/` structure, and add build/check/test scripts.
- [ ] Task 2: `detect.ts` — implement lockfile-based package manager detection, including legacy `bun.lockb` support, with unit tests.
- [ ] Task 3: `feed.ts` — parse Azure DevOps registry URLs from `.npmrc` and extract structured feed information with unit tests.
- [ ] Task 4: `token.ts` — implement token acquisition priority chain: explicit token -> CI env vars -> Azure CLI, with unit tests.
- [ ] Task 5: `npmrc.ts` — implement a user-level `.npmrc` credential writer that preserves unrelated settings and merges auth for discovered registries, with unit tests.
- [ ] Task 6: `bunfig.ts` — implement a user-level `bunfig.toml` credential writer that preserves unrelated settings and merges auth for discovered registries, with unit tests.
- [ ] Task 7: `auth.ts` — wire detection, feed discovery, token resolution, and config writing into one orchestrated flow with integration-style tests.
- [ ] Task 8: `cli.ts` and `index.ts` — implement CLI flags, output, exit codes, and public exports with CLI integration tests.

## Dependencies
None. This is the foundational feature for the project, and its first task is the project scaffold itself.

## Acceptance Criteria
- [ ] Running `bun run src/cli.ts` in a project with an Azure DevOps registry configured and Azure CLI signed in writes credentials successfully and exits with code 0.
- [ ] Detects npm, pnpm, and bun from their respective lockfiles, including legacy `bun.lockb`.
- [ ] Parses both `pkgs.dev.azure.com` and `*.pkgs.visualstudio.com` registry URL formats.
- [ ] Token resolution falls through in priority order: explicit flag -> CI env -> Azure CLI.
- [ ] `.npmrc` auth entries are written correctly, including base64-encoded password fields.
- [ ] `bunfig.toml` auth entries are written correctly for Bun registries.
- [ ] Existing non-auth config entries are preserved when credentials are written.
- [ ] Registry discovery uses project-level config, while credential writes target user-level config by default.
- [ ] Clear errors are returned when no lockfile is found, no Azure DevOps registry is configured, Azure CLI is not authenticated, or token acquisition fails.
- [ ] All unit and integration tests pass with `bun test`.
- [ ] Lint and format checks pass with `bun run check`.
- [ ] Bundled build succeeds with `bun run build`.
