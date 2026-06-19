# CLAUDE.md

Guidance for Claude Code (and other AI agents) when working in this repository.

## Source of truth

All coding rules, guidelines, and architecture docs are maintained in shared files so every agent (Claude Code, Cursor, Copilot) stays consistent:

- **`ai-agent-helpers/AI_CODING_RULES.md`** — the canonical coding rules. Read this first.
- **`README.md`** — project overview, technology stack, and project structure.
- **`ai-agent-helpers/guides/`** — detailed feature guides:
  - `INIT_SERVER_AND_APP.md` — `initServer.ts` & `buildApp.ts`, the two entry files every server has.
  - `APP_FACTORY.md` — the `AppFactory` that registers plugins, middleware, and modules in order.
  - `PLUGINS.md` — plugins (core services on `app`) vs. global middleware (`registerMiddleware`).
  - `MODULES.md` — the module system, BFF/adapter pattern, and monolith vs. micro-services.
  - `PERMISSIONS_RBAC.md` — RBAC permission guards, config, and how to extend them.

The "Key conventions" section below is an inline summary kept here because `CLAUDE.md` is always loaded into context. When it ever diverges from `AI_CODING_RULES.md`, **`AI_CODING_RULES.md` wins** — update both if you change a rule.

## What this project is

A TypeScript + Express backend **template** (package manager: `pnpm`), inspired by combining ideas from Nest.js and Fastify: dependency injection, class-based components, plugins, and modules. It can run as a **monolith** or as standalone **micro-services**.

## Commands

```bash
pnpm dev                  # run the monolith (watch mode) -> src/initServer.ts
pnpm build                # build the project (build.config.mjs)
pnpm test                 # run jest tests
pnpm run lint             # eslint
pnpm run lint:fix         # eslint --fix
pnpm run tsc              # type-check (tsc -p tsconfig.json)
pnpm run check            # lint + biome format + tsc + test (run before finishing a change / opening a PR)
```

## Architecture at a glance

The app is composed by `AppFactory` (in `src/lib/lucky-server`) in a strict order:

1. **Plugins** (`src/plugins/`) — attach core services to `app` (e.g. `app.configService`, `app.logger`, `app.pg`, `app.redis`). Run first; order matters for dependencies. App is frozen after plugins register.
2. **Global middleware** (`src/middlewares/`) — CORS, helmet, body parsing, RBAC fetch-permissions, etc. Registered via `registerMiddleware`.
3. **Modules** (`src/modules/`) — domain logic + route providers. Each is a class `new Module(app)`, stored at `app.modules.XModule`. The `BackendModule` (BFF) owns public routes and delegates to domain modules via Direct/Http adapters (monolith vs. micro-services).
4. **Error handler** then **path-not-found (404) handler**.

Entry files: `src/initServer.ts` (listen) + `src/buildApp.ts` (compose). Micro-services mirror this under `src/initAsMicroServices/<name>/`.

Key directories:

- `src/common/` — shared utils and global constants (use absolute `@src/common/...` imports). Check `src/common/utils` before writing new utilities.
- `src/core/` — platform services: config, logging, messaging, DB connections (use `@src/core/...`).
- `src/lib/` — extractable building blocks: `lucky-server` (AppFactory), `logger`, errors (use `@src/lib/...`).
- `src/databases/` — schemas, migrations, seeds.

When you add a plugin/module that extends `app`, also update `optimizedApp` in `src/common/constants/optimizedApp.ts` and the `OptimizedApp` type in `src/common/types/optimizedApp.ts`.

## Creating building blocks (recipes)

Hard rules for the common things you'll create. (Cursor mirrors these in `.cursor/rules/how-to-*.mdc`, which Claude Code does not load — so they're summarized here.)

- **Naming:** files are `[name].module.ts`, `[name].plugin.ts`, `[name].service.ts`, `[name].controller.ts`, `[name].middleware.ts`.
- **Plugin** — a **function** `(app: Application)` placed in `src/plugins/`. Augments `app` with **core/infra services only** (config, logger, DB, redis). Not for middleware. Registered via `registerPlugins`, runs before middleware/modules, order matters.
- **Module** — a **class** in `src/modules/[name]/`, implements `ModuleFactory` (from `@src/lib/lucky-server`), takes `private readonly app: Application` as its only constructor arg. **Constructor body must be empty**; do all setup in `async init(): Promise<void>` (instantiate services, attach controllers). Expose services via a `services` getter. Store services as `private booksService!: BooksService`. Sub-folders: `controllers`, `services`, `repositories`, `middleware`, `logic`. Add an `index.ts` to the module root and to those sub-folders.
- **Service** — a **class** in `src/modules/[name]/services/`. Receives its **specific** dependencies in the constructor (repo, logger, etc.); **never inject the whole `app`**. Only instantiated by its own module.
- **Controller** — a **class** in `src/modules/[name]/controllers/`, implements `ControllerFactory`, takes `app` as first arg. Only instantiated by its own module.
- **Middleware** — global ones live in `src/middlewares/` as a **function** `registerXxxMiddleware(app)` calling `app.use(...)` (registered via `registerMiddleware`, after plugins / before modules). Module-specific ones live in `src/modules/[name]/middleware/` as a **class** implementing `MiddlewareFactory` (HTTP takes `app`; WebSocket takes `wsApp: WebSocketServer`).
- **Server** — a pair of files: `initServer.ts` (create raw app, call `buildApp(app)`, read port, listen, register `unhandledRejection`/`uncaughtException`) and `buildApp.ts` (instantiate `AppFactory`, then register plugins → middleware → modules → error handler → 404 handler).

## Key conventions (summary — see `AI_CODING_RULES.md` for the full list)

**TypeScript / JavaScript**

- Prefer `type` over `interface`.
- Prefer the `function` keyword over arrow/`const` function expressions.
- Prefer `async/await` over `.then()/.catch()`.
- Prefer `Array.forEach` over `for...of` (unless you need `await` in the loop body).
- Prefer optional chaining (`registration?.sync`) over `a && a.b`.
- Every function takes exactly **one** parameter named `props`; destructure it **inside the body**, never in the signature.
- Don't pass a function's return value directly into another call — store it in a variable first.
- Never return a promise directly — `await` it into a variable, then return that variable.

**Imports**

- Default to relative imports.
- Absolute imports use the `@src/` prefix.
- **Always** use absolute imports for `src/common`, `src/core`, and `src/lib` (e.g. `@src/common/...`).

**Testing**

- Write unit tests for new code; update existing tests when logic changes.
- Co-locate tests next to the code as `*.test.ts` / `*.spec.ts`.
- Follow Arrange-Act-Assert; one logical assertion per test; keep tests isolated.
- For object results, build `expectedResult` and `actualResult` variables and assert `expect(actualResult).toEqual(expectedResult);`.

**Reuse**

- Check `src/common/utils` for an existing helper before creating a new one.
