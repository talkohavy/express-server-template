---
name: how-to-create-a-controller
description: How to create a controller in this project. Use when asked to add, create, or scaffold a controller.
---

# Create a controller

1. A controller always lives inside a module: `src/modules/[module-name]/controllers/`.
2. Create a controller file named: `[controller-name].controller.ts`, where `[controller-name]` is the actual name of the controller.
3. Inside `[controller-name].controller.ts` create and export a class based controller named `ControllerNameController`, which implements the `ControllerFactory` interface.
4. The controller's constructor should always accepts `private readonly app: Application` as its first argument.
5. Create an adjacent file called `index.ts` which would export the controller class from the controller file.
6. The controller can only be instantiated by its own domain module class (a file named `[module-name].module.ts`).
