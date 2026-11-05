# tool-backend

NestJS + Prisma + Postgres API for the OmniTools platform.

## Setup

```bash
npm install
cp .env.example .env
# Fill DATABASE_URL (Postgres). Everything else can stay blank until its phase.
npm run prisma:generate
npm run prisma:migrate --name init
npm run start:dev
```

Health check: `curl http://localhost:4000/health`

## Scripts

| Script | Purpose |
|---|---|
| `npm run start:dev` | Watch mode for development |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:generate` | Regenerate Prisma Client |
| `npm run prisma:migrate` | Run `prisma migrate dev` |

## Structure

```
src/
├── main.ts              # bootstrap (helmet, cors, cookie-parser, compression, pino, validation)
├── app.module.ts        # root module
├── config/              # Zod env schema + typed config service
├── common/              # filters + interceptors (shared cross-cutting concerns)
├── database/            # PrismaModule + PrismaService
└── modules/
    └── health/          # /health endpoint
```

Later phases add: `auth`, `users`, `categories`, `tools`, `favorites`, `usage`,
`subscriptions`, `plans`, `payments`, `blogs`, `contact`, `newsletter`, `admin`, `settings`.
