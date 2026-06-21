---
name: how-to-create-a-service
description: How to create a service in this project. Use when asked to add, create, or scaffold a service.
---

1. Create a file named `[name].service.ts` inside its module's services folder: `src/modules/[module-name]/services/`.
2. Inside it, create and export a class named `[Name]Service`. Never create a service as a function.
3. The constructor receives specific dependencies as arguments (e.g. a repository, `LoggerService`, `TopicPublisherService`). Never inject `app: Application` — that is reserved for controllers and middlewares.
4. A service can only be instantiated by its own domain module class.
