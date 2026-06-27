# CLAUDE.md

Guidance for Claude Code (and other AI agents) when working in this repository.

## 1. Code Quality Standards

Before making any code changes (edits, new files, or refactors), read ai-agent-docs/code-quality-standards.md.

`ai-agent-docs/code-quality-standards.md`

## 2. Project Knowledge Base

Project knowledge base is found in all the md files under:

`ai-agent-docs/knowledge/`

## 3. What this project is

A TypeScript + Express backend **template** (package manager: `pnpm`), inspired by combining ideas from Nest.js and Fastify: dependency injection, class-based components, plugins, and modules. It can run as a **monolith** or as standalone **micro-services**.

## 4. How to run project locally

Make sure redis server runs locally.
Make sure postgress server runs locally.

Just run:

```bash
pnpm dev
```

## 5. Commands

```bash
pnpm dev                  # run the monolith (watch mode) -> src/initServer.ts
pnpm build                # build the project (build.config.mjs)
pnpm test                 # run jest tests
pnpm run lint             # eslint
pnpm run lint:fix         # eslint --fix
pnpm run tsc              # type-check (tsc -p tsconfig.json)
pnpm run check            # lint + biome format + tsc + test (run before finishing a change / opening a PR)
```
