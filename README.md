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
npm run dev:api                           # terminal 1 → http://localhost:3001

cp apps/mobile/.env.example apps/mobile/.env
npm run dev:mobile                        # terminal 2 → Expo (web: http://localhost:8081)
```

Local API URL defaults to `http://localhost:3001` in `apps/mobile/src/lib/config.ts`.

Anonymous users can only open auth screens and `/j/:token` invite previews. Everything else (tabs, overlap, thread, pause, etc.) is gated by `AuthGate` and redirects to email sign-in.

## Product surfaces (recent)

| Feature | Where |
|---|---|
| **Account** (sign out, delete account) | People tab → Account |
| **Add by code** (`SU-XXXX-XXXX`) | Sign-up email screen, People → Add by code, `/add-code?code=…` deep link |
| **Invite link** | Invite tab — share link; uses remaining on API when deployed |

Account deletion requires a fresh email code (App Store requirement). Redeploy the API to Railway after pulling endpoint changes.

## Deploy

**API → Railway** — connect this repo, add Postgres, set env vars from `apps/api/.env.example`, domain `api.seeuaround.com`. See [docs/dns.md](docs/dns.md) for DNS records.

**Mobile → EAS** — see [docs/ship.md](docs/ship.md). App API URL: `https://api.seeuaround.com` (set in `apps/mobile/.env`, `app.json`, and `eas.json`).

## Stack

React Native + Expo SDK 56 · Fastify · Postgres · pg-boss · Railway · Expo Push
