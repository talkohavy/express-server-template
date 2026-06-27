# Plugins

Plugins attach **core infrastructure services** to the Express app (e.g. `app.configService`, `app.logger`, `app.pg`). They run **before** global middleware and modules, and provide services that the rest of the app depends on.

**Location:** `src/plugins/`

For **global middleware** (CORS, body parsing, security headers, etc.), use `AppFactory.registerMiddleware()` and place registrars under `src/middlewares/`. See `APP_FACTORY.md`.

---

## Definition

A plugin is a function that receives the app and augments it with services:

```typescript
type PluginFn = (app: Application) => void;
type PluginAsyncFn = (app: Application) => Promise<void>;
```

Plugins attach services to the app, e.g. `app.configService`, `app.logger`, `app.pg`. They do **not** call `app.use()` for request middleware—that belongs in `registerMiddleware`.

---

## When to Create a Plugin

Create a plugin when you need to:

- Attach an **infrastructure service** used across multiple modules (config, logger, DB clients, Redis, Socket.IO)
- Set up **shared resources** that modules depend on before they initialize

**Do not** create plugins for:

- **Global middleware** — use `registerMiddleware` and `src/middlewares/` instead
- **Domain logic** — use modules instead

---

## Plugins vs Middleware

| Concern                   | Mechanism                                                  | Location                          |
| ------------------------- | ---------------------------------------------------------- | --------------------------------- |
| Core services on `app`    | `registerPlugins()`                                        | `src/plugins/*.plugin.ts`         |
| Global Express middleware | `registerMiddleware()`                                     | `src/middlewares/*.middleware.ts` |
| Error / 404 handlers      | `registerErrorHandler()` / `registerPathNotFoundHandler()` | `src/middlewares/`                |

---

## Plugin Dependencies and Order

Plugins execute **sequentially** in registration order. Order matters when one plugin depends on another.

**Common dependency chain:**

1. `configServicePlugin` – Always first; many plugins need config
2. `callContextPlugin` – Request-scoped context
3. `loggerPlugin` – Depends on: configService, callContextService
4. `postgresPlugin`, `redisPlugin` – Depend on: configService
5. `socketIOPlugin`, `wsPlugin` – Depend on: configService (when enabled)

Document dependencies in a JSDoc block when a plugin uses other plugins:

```typescript
/**
 * @dependencies
 * - config-service plugin
 * - call-context plugin
 */
export function loggerPlugin(app: Application) {
  const { configService, callContextService } = app;
  // ...
}
```

After all plugins run, `AppFactory` freezes the app object shape (`Object.freeze(this.app)`).

---

## Error Handler and Path Not Found Handler

These are **not** plugins. They are registered via dedicated `AppFactory` methods (not `registerPlugins` or `registerMiddleware`):

- **Error handler** – `registerErrorHandler()` – Global error middleware, must run after all routes
- **Path not found** – `registerPathNotFoundHandler()` – 404 handler for unmatched routes

They live in `src/middlewares/` and are registered separately to preserve the correct middleware order.

---

## Configurable Plugins (Factories)

For micro-services or environments with different config, use a **factory** that returns a plugin:

```typescript
// Returns a plugin with baked-in config
export function configServicePluggable(configSettings: Record<string, any>) {
  return function configServicePlugin(app: Application) {
    const configService = new ConfigService(configSettings);
    app.configService = configService;
  };
}

// Usage in micro-service app:
await appModule.registerPlugins([
  configServicePluggable(configSettings),  // Custom config per service
  // ...
]);
```

This pattern lets each app (monolith vs. micro-service) use different settings without changing the plugin implementation.

---

## Example: Minimal Plugin

```typescript
import type { Application } from 'express';

export function configServicePlugin(app: Application) {
  const configService = new ConfigService(configuration());
  app.configService = configService;
}
```

---

## Example: Plugin with Dependencies

```typescript
/**
 * @dependencies
 * - config-service plugin
 */
export async function postgresPlugin(app: Application) {
  const { connectionString } = app.configService.get(ConfigKeys.Postgres);
  const dbClient = PostgresConnection.getInstance(connectionString);
  await dbClient.connect();
  app.pg = dbClient.getClient();
}
```

---

## Existing Plugins (Reference)

| Plugin              | Purpose                      | Dependencies        |
| ------------------- | ---------------------------- | ------------------- |
| configServicePlugin | App-wide configuration       | None                |
| callContextPlugin   | Request-scoped async context | None                |
| loggerPlugin        | Structured logging           | config, callContext |
| postgresPlugin      | PostgreSQL client            | config              |
| redisPlugin         | Redis pub/sub clients        | config              |
| socketIOPlugin      | Socket.IO server             | config              |
| wsPlugin            | WebSocket client             | config              |

Global middleware (CORS, helmet, body limits, fetch-permissions, etc.) is registered via `registerMiddleware` in `buildApp.ts` — see `src/middlewares/`.
