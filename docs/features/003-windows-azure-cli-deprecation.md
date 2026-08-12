# Feature: Windows Azure CLI Deprecation Warning

## Overview

Remove Node.js `DEP0190` warnings produced when `az-npm` launches Azure CLI through a Windows shell, without regressing support for Azure CLI installations exposed as `az.cmd`.

## User Stories

- As a Windows developer, I want `az-npm` to authenticate through my `az.cmd` Azure CLI installation without a Node.js deprecation warning.
- As a macOS or Linux developer, I want Azure CLI invocation to remain a direct process spawn.

## Technical Approach

On Windows, construct the fixed Azure CLI token command as the shell command and pass no separate argument array to `spawn`. This retains the shell compatibility path required for `az.cmd` while avoiding the deprecated `shell: true` plus arguments combination. On other platforms, continue invoking `az` directly with its argument array.

The Azure CLI arguments used by this path are fixed by the application; no user-controlled input is concatenated into the Windows shell command.

## Implementation Checklist

- [x] Add a platform-aware Azure CLI invocation builder.
- [x] Use the invocation builder when spawning Azure CLI.
- [x] Add unit tests for Windows and non-Windows invocation shapes.
- [x] Verify tests, lint, and build pass.

## Acceptance Criteria

- [x] On Windows, Azure CLI is spawned with `shell: true`, a complete fixed command string, and no separate arguments.
- [x] On macOS and Linux, Azure CLI is spawned directly as `az` with its arguments unchanged.
- [x] Windows support for `az.cmd` remains intact.
- [x] The test suite, lint check, and bundled build pass.
