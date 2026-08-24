# DNS setup for api.seeuaround.com

Railway custom domain is configured. Add these records where you manage DNS for **seeuaround.com** (currently `lunar.dns-parking.com` / `solar.dns-parking.com` — your domain registrar panel).

## Required records

| Type | Name / Host | Value |
|---|---|---|
| **CNAME** | `api` | `f4d81p5c.up.railway.app` |
| **TXT** | `_railway-verify.api` | `railway-verify=2d1f30f4ab2ccbdf83df04352e57723ec139d830716e53ce6f209307f29de0c3` |

Some panels want the full host as `_railway-verify.api.seeuaround.com` — use whatever your registrar expects for subdomains.

## Verify

After saving DNS (usually 5–30 minutes):

```bash
curl https://api.seeuaround.com/health
# → {"ok":true}
```

Check status in Railway: **seeuaround** project → **api** service → **Settings → Networking**.

## Mobile app

The app reads `EXPO_PUBLIC_API_URL` (defaults to `https://api.seeuaround.com` in `app.json` and EAS preview/production builds).

Local dev:

```bash
cp apps/mobile/.env.example apps/mobile/.env
npm run dev:mobile
```
