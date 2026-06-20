---
name: how-to-create-a-plugin
description: How to create a plugin in this project. Use when asked to add, create, or scaffold a plugin or attach a core service to the app.
---

- Always located under `src/plugins/`
- File name: `[name].plugin.ts`
- A plugin is a **function** that receives `app: Application` and augments it with core/infra services (e.g. `app.configService`, `app.logger`, `app.pg`, `app.redis`).
- Create a plugin when you need to attach an infrastructure service used across multiple modules, or set up shared resources that modules depend on before they initialize.
- **Never call `app.use(...)` inside a plugin file.** Middleware registration is strictly owned by `registerMiddleware` in `buildApp.ts`.
- Plugins are registered in `buildApp.ts` via `AppFactory.registerPlugins`.
- Plugins execute **sequentially** in registration order — order matters when one plugin depends on another.
- Plugins run **before** `registerMiddleware` and `registerModules`.
- When adding a plugin that augments `app`, also update `optimizedApp` in `src/common/constants/optimizedApp.ts` and the `OptimizedApp` type in `src/common/types/optimizedApp.ts`.
