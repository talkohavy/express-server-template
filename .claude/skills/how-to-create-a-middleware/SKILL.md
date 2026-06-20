---
name: how-to-create-a-middleware
description: How to create a middleware in this project. Use when asked to add, create, or scaffold a middleware — global or module-specific.
---

There are two types of middleware: global and module-specific.

## Global middleware

- Lives under `src/middlewares/`
- File name: `[name].middleware.ts`
- Exported as a **function** `registerXxxMiddleware(app: Application)` that calls `app.use(...)`.
- **Never register middleware inside a plugin file (`*.plugin.ts`).** Plugins must not call `app.use(...)` under any circumstances.
- Registered in `buildApp.ts` via `AppFactory.registerMiddleware([...])`, **after** `registerPlugins` and **before** `registerModules`.
- Order matters when middleware depends on plugin-attached services (e.g. logger, config).

## Module-specific middleware

- Lives inside its module: `src/modules/[module-name]/middleware/`
- Never create as a function — always as a class.
- The class must implement the `MiddlewareFactory` interface.
- Methods not on the `MiddlewareFactory` interface spec must be private.
- HTTP middleware class: `private readonly app: Application` as its first argument.
- WebSocket middleware class: `private readonly wsApp: WebSocketServer` as its first argument.
- Can only be instantiated by its own domain module class.
