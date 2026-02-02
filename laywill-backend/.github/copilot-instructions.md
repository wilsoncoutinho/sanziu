## Purpose
Short, targeted guidance for AI coding agents working on this Next.js + Prisma app.

---

### Quick start (developer workflows)
- **Run dev:** `npm run dev` (starts Next.js dev server).
- **Build / Start:** `npm run build` and `npm run start`.
- **Lint:** `npm run lint` (ESLint via project config).
- **Database:** repo expects a Postgres `DATABASE_URL` (see `docker-compose.yml` for a local example).
- **Prisma:** use `npx prisma migrate dev` / `npx prisma generate` when schema changes.

### Architecture — big picture
- App Router: code lives under `app/` (Next.js 13+ app router). Server and client components are used.
- API routes: server-only handlers in `app/api/**` export `runtime = "nodejs"` and `dynamic = "force-dynamic"`.
- Persistence: Prisma + Postgres. Central client in `lib/prisma.ts` (singleton pattern to avoid multiple clients in dev).
- Multi-tenant model: `Workspace` + `WorkspaceMember` in `prisma/schema.prisma` provide scoping for accounts/categories/transactions.

### Auth & session patterns (important)
- JWT tokens are in `lib/auth.ts` (helpers: `signToken`, `verifyToken`, `getSessionUserIdFromRequest`).
- Requests accept tokens via either `Authorization: Bearer <token>` or a cookie named `session` — see `lib/auth.ts` and `app/api/auth/login/route.ts`.
- WARNING: authentication uses the env var `AUTH_SECRET` and the cookie `session`. Keep these names consistent across all auth handlers when changing auth behavior.

### Conventions and patterns to follow
- Responses: API handlers return `NextResponse.json(...)` with Portuguese messages (keep language consistent).
- Error handling: handlers log errors with `console.error("<Context> error:", err)` and return a 500 JSON error.
- Input parsing: routes accept both numeric and string amounts (see `app/api/accounts/route.ts` parsing of `initialBal`).
- Decimal handling: Prisma uses `Decimal` for money fields — be careful converting to/from strings/numbers.
- Auth checks: use `getSessionUserIdFromRequest(req)` and then `getWorkspaceIdForUser(userId)` to scope queries to a workspace (see `app/api/accounts/route.ts`).

### Files to inspect when making changes
- Auth flow: `lib/auth.ts`, `app/api/auth/login/route.ts`, `app/api/auth/signup/route.ts`, `app/api/auth/me/route.ts`.
- DB access patterns: `lib/prisma.ts`, `prisma/schema.prisma`, API handlers under `app/api/**` (accounts, categories, transactions).
- Frontend pages: `app/dashboard`, `app/login` — check server/client boundaries when moving logic.

### Integration & environment notes
- Local DB: `docker-compose.yml` provides a Postgres service example (user: `app`, pass: `app123`, db: `financas`).
- Required env vars: `DATABASE_URL`, `AUTH_SECRET` (used by `lib/auth.ts`), `NODE_ENV` for cookie `secure` flag.
- Prisma migrations are present under `prisma/migrations` — run migrations or `prisma migrate deploy` for production.

### Tips for AI agents
- Preserve API contract shapes (JSON keys and status codes). Tests and frontend rely on exact keys like `accounts`, `user`, `token`.
- Keep responses in Portuguese to match existing handlers.
- When changing auth, update cookie name (`session`), header parsing, and env var references across `lib/auth.ts` and `app/api/auth/*.ts`.
- Use the singleton `prisma` import from `lib/prisma.ts` rather than creating new `PrismaClient` instances.

---

If anything here is unclear or you'd like me to expand on a section (auth, Prisma patterns, or CI/dev flows), tell me which area to refine.
