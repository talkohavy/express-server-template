---
name: how-to-create-a-server
description: How to create a server in this project. Use when asked to add, create, or scaffold a new server entry point or micro-service.
---

A server is always a pair of files: `initServer.ts` and `buildApp.ts`.

## initServer.ts

Responsible for:
- Creating the raw Express app.
- Calling `buildApp(app)` to compose the app.
- Reading the port from config.
- Starting the HTTP server listening.
- Registering global handlers for `unhandledRejection` and `uncaughtException`.

## buildApp.ts

Responsible for:
- Exporting an async function called `buildApp`.
- Accepting the raw Express app.
- Instantiating `AppFactory` with the `app` and `optimizedApp`.
- Registering in strict order:
  1. Plugins (core services) via `registerPlugins`
  2. Global middleware via `registerMiddleware`
  3. Modules via `registerModules`
  4. Error handler
  5. Path-not-found (404) handler

Plugins run first. Modules run **after** plugins and global middleware so they can use plugin-attached services.
