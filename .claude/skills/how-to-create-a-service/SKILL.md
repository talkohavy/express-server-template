---
name: how-to-create-a-service
description: How to create a service in this project. Use when asked to add, create, or scaffold a service.
---

- A service always lives inside a module: `src/modules/[name]/services/`
- File name: `[name].service.ts`
- Never create a service as a function — always as a class.
- Receives its **specific dependencies** as constructor arguments (e.g. a repository, `TopicPublisherService`, `LoggerService`). Do **not** inject `app: Application` — that is reserved for controllers and middlewares.
- Can only be instantiated by its own domain module class.
