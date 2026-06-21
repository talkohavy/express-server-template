---
name: how-to-create-a-module
description: How to create a module in this project. Use when asked to add, create, or scaffold a module or domain feature.
---

1. Either choose a meaningful name or you were already given a name, and create a new folder under `src/modules/[module-name]`.
2. Under that new folder, create:
   - a file named: `[module-name].module.ts`
   - a file named: `index.ts`
3. Inside the `[name].module.ts` file, create and export a class called `[NewName]Module` which implements the `ModuleFactory` interface (imported from `@src/lib/lucky-server`).
4. The module class constructor should accept `private readonly app: Application` as its only argument.
5. The constructor body of the module class must remain empty.
6. The module class should implement a method called `async init(): Promise<void>`. All initialization logic goes inside it. There you may instantiate services, attach controllers, etc.
7. Module-specific services are stored as private fields on the module class with definite-assignment assertion: `private booksService!: BooksService`.
8. The module class should expose services via a `services` getter for other modules to consume.
9. If module services are in need of global services that are attached onto the `this.app`, destruct those global service from `this.app` on the first line of the `init` method's body, destruct whatever you need from `this.app` (e.g. `this.app.pg`, `this.app.redis`, `this.app.configService`, `this.app.logger`) and pass them to service constructors.
10. The `index.ts` file should re-export the module class from `[module-name].module.ts`.
11. Register the module using the `appModule.registerModules` inside the `buildApp.ts` file.
12. In additinion, a module folder is also allowed to have these sub-folders & files: `controllers`, `services`, `repositories`, `middlewares`, `logic`, `types.ts`. Any class, function, constant, type, must fall within those files & folders. No other files/folders are allowed.
