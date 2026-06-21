---
name: how-to-create-a-middleware
description: How to create a middleware in this project. Use when asked to add, create, or scaffold a middleware — global or module-specific.
---

There are two types of middleware: global and module-specific.

## Create a global middleware

1. Create a file named `[middleware-name].middleware.ts` under `src/middlewares/`.
2. Inside it, create two functions: `registerXxxMiddleware` (which should be exported) & `xxxMiddleware` (which should not be exported).
3. The `registerXxxMiddleware` should have 1 argument only - the express `app`.
4. The `registerXxxMiddleware` function should call `app.use(xxxMiddleware);`.
5. Add the `registerXxxMiddleware` function to the `AppFactory.registerMiddleware([...])` inside `buildApp.ts`.

## Module-specific middleware

1. Create a new file named `[middleware-name].middleware.ts` inside its module: `src/modules/[module-name]/middleware/`
2. Inside it, create & export a class named `XxxMiddleware` that implement the `MiddlewareFactory` interface.
3. The class constructor should accept `app` as its first argument. private & readonly. WebSocket middleware class accepts `private readonly wsApp: WebSocketServer` as their first argument.
4. Middleware should have a publich method called `apply`, which has the signature of a middleware function (req,res,next).
5. The middleware class should be instantiated by its own domain module class, and only by its own domain module.
