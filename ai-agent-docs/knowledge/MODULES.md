# Modules

Modules encapsulate domain logic and route providers. They are classes instantiated by the AppFactory and receive the app in their constructor. Modules run **after** plugins and global middleware, so they can use plugin-attached services.

**Location:** `src/modules/`

---

## Definition

A module is a class that receives the app and optionally exposes services:

```typescript
type ModuleConstructor = new (app: Application) => any;
```

The AppFactory stores each module on the app as `app.modules[ModuleName]` (e.g., `app.modules.BooksModule`).

---

## Module Structure

A typical module has:

1. **Constructor** – Receives `app`, calls `initializeModule()`
2. **initializeModule()** – Creates services, repositories; optionally attaches routes
3. **services** getter (optional) – Exposes internal services for other modules to use

```typescript
export class BooksModule implements ModuleFactory {
  private booksService: BooksService;

  constructor(private readonly app: Application) {
    this.booksService = new BooksService();

    if (process.env.IS_STANDALONE_MICRO_SERVICES) {
      this.attachControllers(this.app);
    }
  }

  get services() {
    return { booksService: this.booksService };
  }
}
```

---

## Module Types

### Main / Domain Modules

Own a business domain and its services. Examples: `BooksModule`, `UsersModule`, `DragonsModule`, `AuthenticationModule`.

- Create services, repositories, and domain logic
- Optionally attach **direct routes** when running as standalone micro-services (`IS_STANDALONE_MICRO_SERVICES`)
- Expose services via the `services` getter for the BackendModule (monolith) or for in-process consumers
- Use plugin-attached resources: `this.app.pg`, `this.app.redis`, `this.app.configService`, etc.

### BFF Module (BackendModule)

The Backend-For-Frontend module owns all public-facing routes and delegates to domain modules. It must be registered **after** the main modules it depends on.

- Does **not** implement domain logic; it orchestrates
- Uses adapters to talk to domain modules (see Adapter Pattern below)
- Always attaches routes (it is the single entry point for HTTP in monolith mode)
- In monolith: uses DirectAdapters to call `app.modules.XModule.services`
- In micro-services: uses HttpAdapters to call other services over HTTP

### Utility Modules

Provide cross-cutting capabilities. Examples: `SwaggerModule`, `HealthCheckModule`.

- May not expose services
- Usually always attach routes (e.g., `/api/docs`, `/api/health-check`)

---

## Accessing Other Modules

Use `app.modules` to access module instances and their services:

```typescript
const { booksService } = this.app.modules.BooksModule.services;
const { usersCrudService } = this.app.modules.UsersModule.services;
```

This is typically done inside the BackendModule when initializing DirectAdapters in monolith mode.

---

## Adapter Pattern: Monolith vs. Micro-Services

The BackendModule uses adapters so the same controllers work in both deployment modes:

| Mode               | Adapter type  | Communication                       |
| ------------------ | ------------- | ----------------------------------- |
| **Monolith**       | DirectAdapter | In-process: `module.services.xyz()` |
| **Micro-services** | HttpAdapter   | HTTP calls to other services        |

Each domain has an interface (e.g., `IBooksAdapter`) and two implementations:

- **DirectAdapter** – Wraps the module’s service, calls it directly
- **HttpAdapter** – Uses `HttpClient` to call the remote service

```typescript
// DirectAdapter – wraps service
export class BooksDirectAdapter implements IBooksAdapter {
  constructor(private readonly booksService: BooksService) {}
  async getBooks(query) { return this.booksService.getBooks(query); }
}

// HttpAdapter – HTTP calls
export class BooksHttpAdapter implements IBooksAdapter {
  constructor(private readonly httpClient: HttpClient) {}
  async getBooks(query) { return this.httpClient.get('/api/books', { params: query }); }
}
```

The BackendModule selects the adapter based on `process.env.IS_STANDALONE_MICRO_SERVICES`.

---

## When to Attach Routes

- **BackendModule** – Always attaches routes (BFF in both modes)
- **Domain modules** – Only when `IS_STANDALONE_MICRO_SERVICES` is set (standalone micro-service)
- **Utility modules** (Swagger, HealthCheck) – Usually always attach routes

This lets domain modules run as standalone services while the monolith uses BackendModule as the single HTTP entry point.

---

## Registration Order

Register modules in dependency order. BackendModule must come **after** all domain modules it uses:

```typescript
appModule.registerModules([
  HealthCheckModule,
  AuthenticationModule,
  UsersModule,
  BooksModule,
  DragonsModule,
  FileUploadModule,
  WsModule,
  BackendModule,  // Depends on all above
  SwaggerModule,
]);
```

---

## When to Create a New Module

Create a new module when:

- You have a new **domain** or vertical slice (e.g., Orders, Payments)
- You need a **standalone micro-service** that will run separately
- You want a clear **boundary** for a feature and its services

Avoid creating modules for small utilities—use shared services or plugins instead.

---

## Adding a New Module Checklist

1. Create the module under `src/modules/<name>/`
2. Implement constructor, initialization, and optional `services` getter
3. Add to `optimizedApp.modules` and `OptimizedApp` type in `src/common/`
4. Register in `buildApp.ts`: `appModule.registerModules([..., NewModule])`
5. If BackendModule uses it: add adapter (Direct + Http) and wire it in BackendModule
