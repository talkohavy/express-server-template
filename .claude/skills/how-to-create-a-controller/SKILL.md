---
name: how-to-create-a-controller
description: How to create a controller in this project. Use when asked to add, create, or scaffold a controller.
---

- A controller always lives inside a module: `src/modules/[name]/controllers/`
- File name: `[name].controller.ts`
- Never create a controller as a function — always as a class.
- The class must implement the `ControllerFactory` interface.
- The class always accepts `private readonly app: Application` as its first argument.
- A controller can only be instantiated by its own domain module class.
