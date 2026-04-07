# FocusBuddy

🚧 Work in Progress

FocusBuddy is a monorepo for a Pomodoro-based focus tracking app with content logging and learning time insights.

## Status

Implementation has not started yet.

This repository is currently being prepared with:

- shared Copilot workflow settings under `.github`
- a development container
- the initial project overview

## Development Setup

Dev container setup details are documented in [.devcontainer/README.md](.devcontainer/README.md), including:

- SSH-based Git commit signing inside the container
- `gh` authentication with a fine-grained personal access token
- verification and troubleshooting steps for local development

### Commit Message Tooling Demo

This repository includes a small commitlint demo for Issue #14.

Initial setup is wrapped in the Makefile target below. It installs the local tooling, configures the `commit-msg` hook, and runs the commitlint verification steps.

Run this command after cloning the repository:

```bash
make commitlint-setup
```

If dependencies are already installed and you only want to rerun the checks, use:

```bash
make commitlint-check
```

The current demo accepts issue references such as `#14`, `refs #14`, or `fixes #14` in the commit message.

## Goal

FocusBuddy aims to help users:

- track focus sessions with a Pomodoro timer
- record what they worked on
- understand how long learning content takes over time

## Design Notes

- The first public-safe domain design note is available at [docs/domain/mvp-domain-model.md](docs/domain/mvp-domain-model.md).
