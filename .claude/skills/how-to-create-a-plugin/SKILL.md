---
name: how-to-create-a-plugin
description: How to create a plugin in this project. Use when asked to add, create, or scaffold a plugin or attach a core service to the app.
---

1. Create a file named `[name].plugin.ts` under `src/plugins/`.
2. Inside it, create and export a function named `[name]Plugin` that receives `app: Application` as its only argument. Make it `async` only if setup requires it (e.g. opening a DB connection).
3. Inside the function, augment `app` with a core/infra service (e.g. `app.configService`, `app.logger`, `app.pg`, `app.redis`). Plugins are for infrastructure services shared across modules — never for middleware.
4. Never call `app.use(...)` inside a plugin file. Middleware registration belongs in `registerMiddleware` in `buildApp.ts`.
5. Register the plugin in `buildApp.ts` via `AppFactory.registerPlugins`. Plugins execute sequentially in registration order — order matters when one plugin depends on another, and they all run before `registerMiddleware` and `registerModules`.
6. When the plugin attaches a new property to `app`, also update `optimizedApp` in `src/common/constants/optimizedApp.ts` and the `OptimizedApp` type in `src/common/types/optimizedApp.ts`.
