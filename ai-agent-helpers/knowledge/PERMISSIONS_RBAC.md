# Permissions & RBAC

This guide describes the RBAC (Role-Based Access Control) system used for authorization checks across the application.

---

## Overview

The permissions system is **permission-based** (action-based per resource):

- **Action-based** – Each permission is a string identifier (e.g. `users:create`, `users:read`, `users:update`, `users:delete`)
- **Resource-scoped** – Permissions are namespaced by resource (e.g. `users.*`, `books.*` for future modules)
- Users have a `userPermissions` array; routes require at least one of the specified permissions to proceed (OR logic)

---

## Architecture

```
src/
├── common/constants/permissions.ts   # Permission string constants (extend per module)
├── middlewares/
│   ├── fetch-permissions.middleware.ts      # Populates req.userPermissions (registered globally in buildApp)
│   ├── require-permission.middleware.ts     # Checks req.userPermissions vs required permissions
│   ├── require-user-auth.middleware.ts      # Optional: ensures req.user exists (throws UnauthorizedError)
│   └── attach-user-from-headers.middleware.ts  # Populates req.user from X-User-Id, X-User-Role
└── global.d.ts                       # Express Request extends: user?, userPermissions?
```

---

## Permission Constants

Located in `src/common/constants/permissions.ts`:

```typescript
export const Permissions = {
  users: {
    create: 'users:create',
    read: 'users:read',
    update: 'users:update',
    delete: 'users:delete',
  },
};
```

Add new resource permissions when creating modules:

```typescript
export const Permissions = {
  users: { ... },
  books: {
    create: 'books:create',
    read: 'books:read',
    update: 'books:update',
    delete: 'books:delete',
  },
};
```

---

## Middlewares

### 1. `requirePermissionMiddleware(requiredPermissions: string[])`

Checks that `req.userPermissions` contains at least one of the required permissions. Throws `ForbiddenError` otherwise.

```typescript
import { requirePermissionMiddleware } from '@src/middlewares/require-permission.middleware';
import { Permissions } from '@src/common/constants/permissions';

app.post(API_PATHS.users, requirePermissionMiddleware([Permissions.users.create]), handler);
app.get(API_PATHS.users, requirePermissionMiddleware([Permissions.users.read]), handler);
app.patch(API_PATHS.userById, requirePermissionMiddleware([Permissions.users.update]), handler);
app.delete(API_PATHS.userById, requirePermissionMiddleware([Permissions.users.delete]), handler);
```

### 2. `requireUserAuthMiddleware`

Ensures `req.user` exists. Throws `UnauthorizedError` if not set. Use when a route must be authenticated in addition to having permissions.

```typescript
import { requireUserAuthMiddleware } from '@src/middlewares/require-user-auth.middleware';

app.patch('/api/users/:userId', requireUserAuthMiddleware, requirePermissionMiddleware([Permissions.users.update]), handler);
```

### 3. `attachUserFromHeadersMiddleware`

Populates `req.user` from request headers. Used by modules (e.g. `UsersMiddleware`) to reconstruct user data when requests are forwarded from a BFF or another service.

Headers used (from `src/common/constants/headers.ts`):

- `X-User-Id`
- `X-User-Role`

---

## Populating `req.user` and `req.userPermissions`

### `req.userPermissions`

Populated by **`registerFetchPermissionsMiddleware`** (registered via `registerMiddleware` in `buildApp.ts`). It runs on every request and sets `req.userPermissions`. Currently mocks all permissions; implement database or cache lookup per user/role as needed.

### `req.user`

Populated by module-level middleware (e.g. `UsersMiddleware` uses `attachUserFromHeadersMiddleware` on the users routes). For forwarded requests, ensure the BFF or gateway sets `X-User-Id` and `X-User-Role`.

---

## Users Module Example

The Users module demonstrates RBAC:

1. **Permission constants** – `Permissions.users.*` in `permissions.ts`
2. **Fetch middleware** – `registerFetchPermissionsMiddleware` populates `req.userPermissions`
3. **User from headers** – `UsersMiddleware` applies `attachUserFromHeadersMiddleware` on `API_PATHS.users`
4. **Route protection** – Each CRUD route uses `requirePermissionMiddleware([Permissions.users.<action>])`

---

## Extending for New Modules

1. Add permission constants in `src/common/constants/permissions.ts`
2. Add `requirePermissionMiddleware([Permissions.<resource>.<action>])` to route handlers
3. Ensure `registerFetchPermissionsMiddleware` is registered (already in `buildApp.ts` via `registerMiddleware`)
4. If the route needs `req.user`, ensure `attachUserFromHeadersMiddleware` (or equivalent) runs on the relevant path
