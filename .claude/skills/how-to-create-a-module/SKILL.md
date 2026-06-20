---
name: how-to-create-a-module
description: How to create a module in this project. Use when asked to add, create, or scaffold a module or domain feature.
---

- File name: `[name].module.ts`, lives under `src/modules/[name]/`
- Never create a module as a function — always as a class.
- Must implement the `ModuleFactory` interface (imported from `@src/lib/lucky-server`).
- Constructor: `private readonly app: Application` as its only argument. **Constructor body must be empty.**
- All initialization logic goes in `async init(): Promise<void>`: instantiate services, attach controllers, etc.
- Services are stored as private fields with definite-assignment assertion: `private booksService!: BooksService`.
- Expose services via a `services` getter for other modules to consume.
- Inside `init`, destructure what you need from `this.app` (e.g. `this.app.pg`, `this.app.redis`, `this.app.configService`) and pass them to service constructors.
- Modules are registered **after** plugins and global middleware.
- Allowed sub-folders: `controllers`, `services`, `repositories`, `middlewares`, `logic`.
- Module root must include `[name].module.ts` and `index.ts`. Sub-folders (`controllers`, `services`, `repositories`) must each include an `index.ts` that re-exports their contents.
