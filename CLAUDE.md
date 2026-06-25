# CLAUDE.md

Guidance for Claude Code (and other AI agents) when working in this repository.

## 1. Code Quality Standards

Code quality standard are found under:

`ai-agent-helpers/code-quality-standard.md`

## 2. Project Knowledge Base

Project knowledge base is found in all the md files under:

`ai-agent-helpers/knowledge/`

## 3. What this project is

A TypeScript + Express backend **template** (package manager: `pnpm`), inspired by combining ideas from Nest.js and Fastify: dependency injection, class-based components, plugins, and modules. It can run as a **monolith** or as standalone **micro-services**.

## 4. Commands

```bash
pnpm dev                  # run the monolith (watch mode) -> src/initServer.ts
pnpm build                # build the project (build.config.mjs)
pnpm test                 # run jest tests
pnpm run lint             # eslint
pnpm run lint:fix         # eslint --fix
pnpm run tsc              # type-check (tsc -p tsconfig.json)
pnpm run check            # lint + biome format + tsc + test (run before finishing a change / opening a PR)
```
