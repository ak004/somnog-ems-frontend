# SomNOG frontend monorepo

This repository is **frontend only**. Students call HTTP APIs. They do not put Nest, Prisma, RabbitMQ, or Docker Compose in this repo.

Backends live in other GitHub projects. The browser talks to **one gateway** (`NEXT_PUBLIC_API_URL`), never to a service database.

---

## Top-level tree

```text
somnog-web/
├── apps/
│   └── web/                          # Next.js shell (routes + layout only)
├── packages/
│   ├── api/                          # axios, base URL, Bearer token
│   ├── auth/                         # AuthProvider, useAuth, login, profile
│   ├── overview/                     # dashboard home
│   ├── events/                       # catalogue, enroll, questions
│   ├── tickets/                      # my tickets
│   ├── notifications/                # inbox + preferences
│   ├── manage-events/                # organiser console
│   ├── users/                        # admin users
│   └── categories/                   # admin category tree
├── .github/
│   └── CODEOWNERS
├── .env.example
├── .env.local                        # gitignored
├── package.json                      # workspaces: apps/* , packages/*
└── README.md
```

`npm` workspaces (or pnpm) at the root. Each `packages/*` folder is its own `package.json` with a name like `@somnog/events`.

---

## `apps/web` — the shell

The Next app **imports** feature packages. It should not grow large screens.

```text
apps/web/
├── app/
│   ├── layout.tsx                    # <AuthProvider> wraps the whole app ONCE
│   ├── providers.tsx
│   ├── page.tsx                      # renders @somnog/auth login
│   └── dashboard/
│       ├── layout.tsx                # sider + header; reads nav registry
│       ├── page.tsx                  # @somnog/overview
│       ├── events/page.tsx           # @somnog/events
│       ├── tickets/page.tsx          # @somnog/tickets
│       ├── notifications/page.tsx
│       ├── profile/page.tsx
│       ├── manage-events/
│       │   ├── page.tsx
│       │   └── [slug]/page.tsx
│       ├── users/page.tsx
│       └── categories/page.tsx
├── nav.ts                            # platform-owned: imports each package nav
└── package.json
```

A dashboard page is a few lines:

```tsx
import EventsList from "@somnog/events";

export default function Page() {
  return <EventsList />;
}
```

---

## `packages/api` — the only HTTP client

```text
packages/api/
├── src/
│   └── client.ts                     # axios instance
├── package.json                      # name: @somnog/api
└── tsconfig.json
```

- `baseURL` from `NEXT_PUBLIC_API_URL` (example: `http://localhost:3000`)
- request interceptor: `Authorization: Bearer ${localStorage.accessToken}`
- 401: clear tokens, send the browser to `/`

Every feature package imports `@somnog/api`. Nobody creates a second axios instance.

---

## `packages/auth` — global session

```text
packages/auth/
├── src/
│   ├── AuthProvider.tsx              # the only AuthContext.Provider
│   ├── useAuth.ts
│   ├── LoginForm.tsx
│   ├── ProfileForm.tsx
│   └── nav.ts
├── package.json                      # name: @somnog/auth
└── tsconfig.json
```

`AuthProvider` is mounted **once** in `apps/web/app/layout.tsx`. Events, tickets, and manage-events call `useAuth()` from `@somnog/auth`. They must not wrap another provider.

Login writes `accessToken` / `refreshToken` and `setUser` / `setIsLoggedIn`. Dashboard layout redirects if `!isLoggedIn`.

---

## Feature packages

Each feature is one folder. That team owns **only** this folder.

```text
packages/events/
├── src/
│   ├── EventsList.tsx
│   ├── index.ts
│   └── nav.ts                        # { order, key, href, label, roles }
├── package.json                      # name: @somnog/events
└── tsconfig.json
```

Same shape for `tickets`, `notifications`, `manage-events`, `users`, `categories`, `overview`.

They only call gateway routes, for example:

| Package | Calls |
|---|---|
| `@somnog/auth` | `/api/auth/login`, `/api/auth/me`, `/api/auth/me/change-password` |
| `@somnog/events` | `/api/events`, `/api/events/:slug`, `POST .../registrations` |
| `@somnog/tickets` | `/api/me/registrations`, `PATCH .../cancel` |
| `@somnog/notifications` | `/api/me/notifications`, preferences |
| `@somnog/manage-events` | `/api/manage/events`, publish, forms, roster, check-in |
| `@somnog/users` | `/api/auth/users` |
| `@somnog/categories` | `/api/categories`, `/api/admin/categories` |

---

## Navbar (avoid Git conflicts)

Do **not** let eight teams edit a `NAV_ITEMS` array in `layout.tsx`.

Each package exports `nav.ts`:

```ts
// packages/events/src/nav.ts
export default {
  order: 20,
  key: "/dashboard/events",
  href: "/dashboard/events",
  label: "Events",
  roles: null,
};
```

```ts
// packages/users/src/nav.ts
export default {
  order: 80,
  key: "/dashboard/users",
  href: "/dashboard/users",
  label: "Users",
  roles: ["ADMIN"],
};
```

The shell owns **one** file that collects them:

```ts
// apps/web/nav.ts  — platform team only
import overview from "@somnog/overview/nav";
import events from "@somnog/events/nav";
import tickets from "@somnog/tickets/nav";
import notifications from "@somnog/notifications/nav";
import profile from "@somnog/auth/nav";
import manageEvents from "@somnog/manage-events/nav";
import users from "@somnog/users/nav";
import categories from "@somnog/categories/nav";

export const NAV_ITEMS = [
  overview,
  events,
  tickets,
  notifications,
  profile,
  manageEvents,
  users,
  categories,
].sort((a, b) => a.order - b.order);
```

Dashboard layout imports `NAV_ITEMS`, then filters with `useAuth().user.role`. After a feature is registered (one import line), that team never opens `layout.tsx` again.

---

## Who may edit what

```text
# .github/CODEOWNERS
apps/web/app/layout.tsx              @platform
apps/web/app/dashboard/layout.tsx    @platform
apps/web/nav.ts                      @platform
packages/api/                        @platform
packages/auth/                       @auth-team
packages/events/                     @events-team
packages/tickets/                    @tickets-team
packages/notifications/              @notify-team
packages/manage-events/              @organiser-team
packages/users/                      @admin-team
packages/categories/                 @admin-team
```

- `main` is protected. Work happens on branches and pull requests.
- Branch names: `events/enroll-questions`, `auth/profile-form`.
- `.env.local`, `node_modules`, `.next` are never committed.

---

## Local setup

```bash
git clone <somnog-web>
cd somnog-web
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3000
npm install
npm run dev --workspace=web
```

Point `NEXT_PUBLIC_API_URL` at any gateway that implements the same routes (lecturer machine, or a student’s deployed API). The UI does not change.

---

## What this repo is not

- Not a Nest monorepo
- Not microservices (those are **running** backends with their own DBs)
- This is a **frontend monorepo**: one Git repo, many packages, **one** Next app in the browser, **only** API calls
