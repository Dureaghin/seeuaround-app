# Ship checklist — iOS + Android

Run these on your machine after accounts are set up. Builds cannot run from CI without your Expo/Apple/Google credentials.

## 1. One-time setup

```bash
npm install -g eas-cli
eas login
cd apps/mobile
eas init                    # replaces placeholder projectId in app.json
```

Fill in `eas.json` → `submit.production`:
- `appleId`, `ascAppId`, `appleTeamId` (Apple Developer)
- `google-play-service-account.json` path (Play Console → API access)

## 2. Railway API (required before push works)

Deploy Postgres + API from this repo. Set env vars in `apps/api/.env.example`.

Point `api.seeuaround.com` at Railway. Confirm:

```bash
curl https://api.seeuaround.com/health
```

## 3. Development builds (test push on real phones)

Push does **not** work in Expo Go for production APNs/FCM.

```bash
cd apps/mobile
eas build --profile development --platform all
```

Install the builds on a physical iPhone and Android device. Sign in, allow notifications, verify overlap push + deep link.

## 4. Internal testing

```bash
eas build --profile preview --platform all
eas submit --platform ios       # TestFlight
eas submit --platform android   # Play internal track
```

### iOS
- App Store Connect: create app `com.seeuaround.app`
- Age rating 17+, privacy: email + availability only (no location/calendar)
- TestFlight: invite your 40-person pocket

### Android
- Play Console: create app, internal testing track
- Data safety: email, availability; no location
- Target API 34+

## 5. Production

```bash
eas build --profile production --platform all
eas submit --platform all
```

OTA updates (JS-only fixes):

```bash
eas update --branch production --message "describe fix"
```

## 6. Verify push receipt logging

After sending test notifications, query Postgres:

```sql
SELECT platform,
  COUNT(*) FILTER (WHERE sent_at IS NOT NULL) AS sent,
  COUNT(*) FILTER (WHERE received_at IS NOT NULL) AS received
FROM notifications
GROUP BY platform;
```

Gap between `sent` and `received` on Android is normal (Doze). Device-side receipt is the ground truth.
