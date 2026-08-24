# See U Around — App

Mobile app (iOS + Android) and API for See U Around.

Website and marketing site live in **[seeuaround](https://github.com/Dureaghin/seeuaround)**.

## Layout

| Path | What |
|---|---|
| `apps/mobile/` | Expo SDK 56 app (iOS + Android) |
| `apps/api/` | Fastify API + Postgres jobs |
| `packages/shared/` | Shared Zod schemas and types |
| `docs/plan.md` | Product + build plan |
| `docs/ship.md` | TestFlight / Play Store checklist |

## Quick start

```bash
npm install

cp apps/api/.env.example apps/api/.env    # set DATABASE_URL
npm run migrate
npm run dev:api                           # terminal 1

cp apps/mobile/.env.example apps/mobile/.env
npm run dev:mobile                        # terminal 2
```

## Deploy

**API → Railway** — connect this repo, add Postgres, set env vars from `apps/api/.env.example`, domain `api.seeuaround.com`.

**Mobile → EAS** — see [docs/ship.md](docs/ship.md).

## Stack

React Native + Expo SDK 56 · Fastify · Postgres · pg-boss · Railway · Expo Push
