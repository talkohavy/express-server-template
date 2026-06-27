# AppFactory

The `AppFactory` is the central class that composes the Express application. It registers plugins, global middleware, modules, and error handlers on the app in the correct order.

**Location:** `src/lib/lucky-server`

---

## 1. Purpose

- Bootstrap the app by registering plugins, middleware, and modules in sequence
- Ensure proper initialization order (plugins attach services first; middleware and modules can use them)
- Provide a consistent composition pattern across monolithic and micro-service apps

---

## 2. API

### Constructor

```typescript
constructor(app: Application, optimizedApp = {})
```

- **app** – The raw Express application (cast as `Application`)
- **optimizedApp** – Optional object merged into the app via `Object.assign(this.app, optimizedApp)`

### registerPlugins

```typescript
async registerPlugins(plugins: (PluginFn | PluginAsyncFn | NullishFalsy)[]): Promise<void>
```

Registers plugins and executes them sequentially. Each plugin receives the app and attaches **core services** (e.g., `app.configService`, `app.logger`, `app.pg`).

- Plugins run **before** middleware and modules
- Order matters: plugins that provide dependencies for other plugins must be registered earlier
- Supports both sync `(app) => void` and async `(app) => Promise<void>`
- After all plugins run, the app object is frozen (`Object.freeze(this.app)`)

### registerMiddleware

```typescript
async registerMiddleware(middlewares: (MiddlewareFn | MiddlewareAsyncFn | NullishFalsy)[]): Promise<void>
```

Registers global Express middleware. Each entry is a function that receives the app and calls `app.use(...)` (or equivalent).

- Middleware runs **after** plugins (so it can use `app.configService`, `app.logger`, etc.)
- Middleware runs **before** modules (so it applies to all routes modules attach)
- Order matters: e.g. body parsing before route handlers that read the body
- Location: `src/middlewares/` — files named `[name].middleware.ts`, exported as `registerXxxMiddleware(app)`

```typescript
type MiddlewareFn = (app: Application) => void;
type MiddlewareAsyncFn = (app: Application) => Promise<void>;
```

### registerModules

```typescript
async registerModules(modules: (ModuleConstructor | NullishFalsy)[]): Promise<void>
```

Instantiates each module with the app, calls `init()`, and stores it on `app.modules[ModuleName]`.

- Each module is a class: `new Module(this.app)`
- Module instances are accessible via `app.modules.BooksModule`, `app.modules.UsersModule`, etc.
- Modules run **after** plugins and global middleware

### registerErrorHandler

```typescript
registerErrorHandler(errorHandler: MiddlewareFn | MiddlewareAsyncFn): void
```

Registers the global error-handling middleware. Must be registered **after** all routes so it can catch unhandled errors.

### registerPathNotFoundHandler

```typescript
registerPathNotFoundHandler(pathNotFoundHandler: MiddlewareFn): void
```

Registers the 404 handler for requests that don’t match any route. Must be registered **after** all routes.

---

## 3. OptimizedApp and V8 Shape Optimization

The `optimizedApp` object in `src/common/constants.ts` pre-defines the shape of properties the app will have (e.g., `modules`, `configService`, `logger`). This helps V8 create optimized object shapes and can improve performance.

**When adding new plugins or modules that extend the app:**

1. Add the property to `optimizedApp` in `src/common/constants.ts`
2. Add the corresponding type to `OptimizedApp` in `src/common/types.ts`

---

## 4. Typical Usage Pattern

```typescript
export async function buildApp(app: Application) {
  const appModule = new AppFactory(app, optimizedApp);

  await appModule.registerPlugins([
    configServicePlugin,
    callContextPlugin,
    loggerPlugin,
    postgresPlugin,
    redisPlugin,
    // ... infrastructure plugins only
  ]);

  await appModule.registerMiddleware([
    registerAddRequestIdHeaderMiddleware,
    registerCorsMiddleware,
    registerHelmetMiddleware,
    registerBodyLimitMiddleware,
    registerUrlEncodedMiddleware,
    registerCookieParserMiddleware,
    registerFetchPermissionsMiddleware,
    // ... global middleware
  ]);

  await appModule.registerModules([
    HealthCheckModule,
    UsersModule,
    BooksModule,
    BackendModule,
    // ...
  ]);

  appModule.registerErrorHandler(errorHandler);
  appModule.registerPathNotFoundHandler(pathNotFoundHandler);
}
```

---

## 5. Registration Order Summary

1. **Plugins** – Core services on `app` (config, logger, DB, Redis, Socket.IO, etc.)
2. **Middleware** – Global Express middleware (CORS, helmet, body parsing, etc.)
3. **Modules** – Domain logic and route providers
4. **Error handler** – Global error handling
5. **Path-not-found handler** – 404 responses
