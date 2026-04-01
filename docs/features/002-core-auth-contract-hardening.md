# Feature: Core Auth Contract Hardening

## Overview
Harden the existing `az-npm` authentication flow so the public product contract matches the implementation. This feature does not expand the product surface. It aligns package-manager resolution, registry discovery, credential writing, and CLI behavior around the current v0 scope.

## User Stories
- As a developer using `az-npm`, I want one clear public product identity so the package name, CLI output, and docs all describe the same tool.
- As a developer in a Bun project, I want Bun-native registry discovery to work from project `bunfig.toml` so Bun support is real rather than implied.
- As a developer in a mixed-lockfile repo, I want the CLI to fail clearly instead of guessing the package manager so I do not authenticate the wrong toolchain.
- As a Bun user with an unscoped Azure feed, I want the CLI to fail clearly when the current Bun writer cannot represent that feed so I can correct the project setup.
- As a script author, I want help text, version output, and exit codes to be explicit and stable so automation can rely on them.

## Technical Approach

| Module | Responsibility |
| --- | --- |
| Package-manager resolution | Detect a single package manager from project lockfiles and fail on ambiguity across npm, pnpm, and Bun |
| Registry discovery | Discover Azure Artifacts registries from project config using Bun config first for Bun projects, then fall back to `.npmrc` |
| Credential writers | Keep user-level credential writes, preserve `_authToken` auth for npm-compatible config, and fail clearly for unsupported unscoped Bun feeds |
| CLI contract | Align public naming, version output, and exit-code behavior with the supported v0 contract |

Key design decisions:
- Keep the public product identity as `az-npm`
- Treat Bun as the maintainer toolchain and Node as the default runtime for npm distribution
- Limit zero-config discovery to explicit project configuration files
- Keep credential writes scoped to user-level config files only
- Preserve the current `_authToken` model for `.npmrc`
- Fail on ambiguous package-manager detection rather than using implicit precedence
- Fail on unscoped Bun feeds until Bun support is intentionally broadened

## Implementation Checklist
- [ ] Update docs to reflect `az-npm` as the public product and document the runtime/exit-code contract
- [ ] Add ambiguity-aware package-manager detection
- [ ] Extend feed discovery to support Bun project config with `.npmrc` fallback
- [ ] Make Bun credential writing fail clearly when no scopes are available
- [ ] Align CLI help text and version output with the package contract
- [ ] Add or update tests for the detection, discovery, writing, and CLI changes
- [ ] Verify lint and test suites pass

## Acceptance Criteria
- [ ] The public docs consistently describe the product as `az-npm`
- [ ] `--version` reports the package version without duplicating it manually in the CLI code
- [ ] Package-manager detection fails clearly when multiple package-manager indicators are present
- [ ] Bun projects discover Azure registries from project `bunfig.toml` before falling back to project `.npmrc`
- [ ] npm and pnpm auth continue to write `_authToken` entries into user-level `.npmrc`
- [ ] Bun auth fails clearly when a discovered Azure feed is unscoped
- [ ] Exit codes remain stable and documented: token failures use one non-zero code and other user-facing failures use another
- [ ] Existing tests are updated to reflect the hardened contract and all checks pass
