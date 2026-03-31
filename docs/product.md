# Product Spec

## Name

`az-npm-auth`

## Vision

`az-npm-auth` is a zero-config CLI that authenticates local package manager configuration against Azure DevOps Artifacts feeds. It modernizes the current tool into a faster, more maintainable implementation built around Bun and modern TypeScript while preserving the simple developer experience that made the original useful.

## Problem

Developers working with Azure DevOps package feeds often need to manually generate or refresh registry credentials across `npm`, `pnpm`, or `bun`. Existing workflows are error-prone, differ across package managers, and frequently depend on stale setup steps or ad hoc scripts.

## Target Users

- Developers who consume private npm packages from Azure DevOps Artifacts feeds
- Teams standardizing local package-manager authentication across npm, pnpm, and Bun
- CI users who want predictable non-interactive auth behavior without bespoke scripts

## Goals

- Authenticate supported package managers with minimal required input
- Prefer existing Azure CLI identity to avoid duplicate login flows
- Support `npm`, `pnpm`, and `bun` from one tool
- Reduce auth setup failures and repeated credential refresh work
- Provide a maintainable foundation for future improvements and standalone binary distribution

## Success Metrics

- Local auth succeeds for common Azure DevOps feed setups across all supported package managers
- First-time setup completes without manual registry config edits in the common case
- Core auth flow works both from Bun runtime and compiled binary distribution
- Migration preserves the zero-config feel of the original tool for existing users

## Core Features

1. Detect package manager from project files and current environment
2. Discover Azure DevOps feed and registry details from local config
3. Acquire token from the best available source, preferring Azure CLI and CI-friendly inputs
4. Write credentials to the correct user-level config file for `npm`, `pnpm`, or `bun`
5. Offer a clean CLI with reliable exit codes and actionable error messages

## Non-Goals

- Replacing Azure CLI authentication itself
- Managing package publishing workflows in the first version
- Building a long-running service or daemon
- Supporting every registry provider beyond Azure DevOps Artifacts

## Assumptions

- Azure CLI is the primary local authentication source
- The initial migration should favor low-config compatibility over large surface-area expansion
- Config writes should be limited to user-managed package-manager auth files
