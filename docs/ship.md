# Make See U Around live on iPhone and Android

This is the path from this repo to a build people can install. Do it in order. A store listing with no working sign-in is not live.

The Expo project already exists. Owner `sympals`, project id `e3d892bc-2e77-4280-8ac5-a12f8ee06641` in `apps/mobile/app.json`. Do not run `eas init` again unless that Expo project is gone.

Bundle id and Android package are both `com.seeuaround.app`. The app talks to `https://api.seeuaround.com`.

## 0. Sign-in emails are not sent yet

`RESEND_API_KEY` and `USE_PRODUCTION_AUTH` only flip a flag in `apps/api/src/config.ts`. `issueAuthCode` in `apps/api/src/routes/index.ts` stores a code and never calls Resend. In production the code is not logged either, because `NODE_ENV=production` turns off `DEV_AUTH_CODE`.

Until a sender is wired, a phone build cannot sign in, cannot delete an account, and will fail App Review. Finish that before TestFlight:

1. Create a Resend account and verify the domain `seeuaround.com` (SPF and DKIM records Resend shows you).
2. Send the six-digit code from `issueAuthCode` when `config.authEmailEnabled` is true. Use it for both `/auth/send-code` and `/me/delete/send-code`.
3. Do not log the code in production.
4. Deploy that API, then send yourself a code to a real inbox before you build the apps.

`DEV_AUTH_CODE=123456` is for this machine only. Never set it on Railway.

## 1. Accounts

| Account | Why | Cost |
|---|---|---|
| Apple Developer Program | iPhone builds, push, TestFlight, App Store | $99 / year |
| Google Play Console | Android builds and the store | $25 once |
| Expo (owner `sympals`) | EAS build, push tokens | free tier is enough to start |
| Railway | API + Postgres, already the host for `api.seeuaround.com` | existing project |
| Resend | Sign-in and delete-account codes | free tier is enough to start |

You need a physical iPhone and a physical Android phone. Push, the microphone, Declared Age Range, and Play Age Signals do not work in a simulator or in the browser.

## 2. Put this code on the API

`https://api.seeuaround.com/health` can return `{"ok":true}` while running an older deploy. The phone will use whatever is on Railway, not the code on this Mac.

From the Railway project **seeuaround**, service **api**:

1. Connect this git repo and deploy the branch you intend to ship.
2. Attach Postgres if it is not already attached.
3. Set the variables below. Railway injects `PORT`. Set `NODE_ENV` yourself.
4. Confirm the start command matches `railway.json`: `npm run start -w @seeuaround/api`. The build command is `npm run build:api`.
5. Wait until the deploy is healthy, then:

```bash
curl https://api.seeuaround.com/health
```

You want `{"ok":true}` from the new deploy, then a real email code when you hit sign-in.

### Railway variables

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | the Railway Postgres URL |
| `RUN_MIGRATIONS` | `true` |
| `WEB_URL` | `https://seeuaround.com` |
| `APP_URL` | `https://api.seeuaround.com` |
| `USE_PRODUCTION_AUTH` | `true` |
| `RESEND_API_KEY` | from Resend, after step 0 is actually sending |
| `EXPO_ACCESS_TOKEN` | an Expo access token for the `sympals` account. Push works without it at low volume; set it before a real pocket. |
| `GOOGLE_PLACES_API_KEY` | optional. Without it, place search uses OpenStreetMap. |

Leave `DEV_AUTH_CODE` unset.

`RUN_MIGRATIONS=true` applies `apps/api/src/schema.sql` on boot. That includes hangout checks, voice audio on messages, and the rest of the current schema.

## 3. DNS

The API hostname is already chosen. At the registrar for `seeuaround.com`:

| Type | Host | Value |
|---|---|---|
| CNAME | `api` | `f4d81p5c.up.railway.app` |
| TXT | `_railway-verify.api` | the verify string in the Railway networking panel |

Details are in `docs/dns.md`. After DNS settles:

```bash
curl https://api.seeuaround.com/health
```

Railway → api → Settings → Networking should show the custom domain as active, with a certificate.

## 4. Apple

1. Enroll in the Apple Developer Program with the account that should own the app.
2. Identifiers → App IDs → register `com.seeuaround.app` if EAS has not created it yet.
3. On that App ID, enable:
   - **Push Notifications**
   - **Declared Age Range** (`com.apple.developer.declared-age-range`). The app already requests this entitlement in `app.json`. A build fails if the capability is missing from the App ID.
4. App Store Connect → Apps → New App.
   - Platform: iOS
   - Name: See U Around
   - Bundle ID: `com.seeuaround.app`
   - SKU: anything unique, for example `seeuaround-ios`
5. Copy the Apple ID (numeric) of that app. That is `ascAppId`.
6. Membership details shows the Team ID. That is `appleTeamId`.
7. Put those into `apps/mobile/eas.json` under `submit.production.ios`, replacing the placeholders:
   - `appleId` — the Apple ID email
   - `ascAppId` — the numeric App Store Connect app id
   - `appleTeamId` — the 10-character team id

Export compliance is already answered in the app: `ITSAppUsesNonExemptEncryption` is false. The binary uses HTTPS only. In App Store Connect, answer that you do not use non-exempt encryption.

## 5. Google Play

1. Create the app in Play Console. Package name `com.seeuaround.app`. This cannot be changed later.
2. Play Console → Setup → API access → link a Google Cloud project → create a service account with permission to release to testing tracks.
3. Download the JSON key and save it as `apps/mobile/google-play-service-account.json`. That path is already in `eas.json` and in `.gitignore`. Do not commit it.
4. The first upload cannot be the internal-track submit alone. Play requires you to create the app and finish the dashboard tasks (privacy policy, data safety, content rating, target audience) before a release is available to testers. You can build the AAB before those forms are done, and submit after.

Play Age Signals (`com.google.android.play:age-signals:0.0.4`) is already a dependency of the local module `apps/mobile/modules/declared-age-range`. Set the target audience to 18 and over. Do not declare the app as designed for children.

## 6. EAS credentials

On your machine:

```bash
npm install -g eas-cli
eas login
cd apps/mobile
```

Log in as a member of the Expo account `sympals`.

iOS push key (APNs), once:

```bash
eas credentials -p ios
```

Choose the production profile when asked. Let EAS create the distribution certificate, provisioning profile, and an APNs key. Reuse them on later builds.

Android push (FCM), once. This is a different JSON file from the Play Console submit key:

```bash
eas credentials -p android
```

Set up a Google Service Account key for FCM V1 and upload it when EAS asks. Expo’s push service uses that key to talk to Firebase. Without it, Android notification delivery fails even though iOS works.

## 7. First install on real phones

`eas.json` → `build.development` sets `"ios": { "simulator": true }`. That profile does not produce an iPhone install. Use **preview** for the first devices.

```bash
cd apps/mobile
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

Preview is `distribution: internal`.

- Android: EAS gives an APK link. Open it on the phone and allow install.
- iPhone: internal distribution is ad hoc. Register the phone’s UDID when EAS asks (it can open a registration link). Then install from the EAS build page. Ad hoc is capped at 100 devices a year. TestFlight (next section) is the one you send to the pocket.

The preview build already points at `https://api.seeuaround.com` via `EXPO_PUBLIC_API_URL` in `eas.json`. You do not point a store build at localhost.

### What to prove on each phone before you invite anyone

Sign in with a real inbox. Then:

1. Allow notifications. Quit the app. Have a second account create an overlap. The banner should arrive between 8:00 and 22:00 in that phone’s timezone, and the tap should open the overlap.
2. Record a voice note in a thread. Play it back on the other phone.
3. Age: on iOS 26 the system sheet should appear (Declared Age Range). On Android, Play’s age-signals sheet should appear where the region shares an age band. On an older OS the honest “I am 18 or older” line is the fallback. Under 18 must not get in.
4. People → Account → Delete account. Request the code, enter it, confirm the account is gone and cannot sign back in. Use a throwaway account, not your own.
5. Camera: scan a friend’s code. Microphone permission should mention voice notes, camera permission should mention scanning a code.

If sign-in email never arrives, stop. The API in step 0 is not done. Do not keep building.

## 8. TestFlight and Play internal testing

These are the builds reviewers and the first pocket install. They are store builds, not the preview APK.

```bash
cd apps/mobile
eas build --profile production --platform all
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

`submit.production.android.track` is `internal`, so the Android submit goes to Play’s internal testing track, not production.

iOS: App Store Connect → TestFlight. Wait for processing. Answer the export-compliance prompt if it still asks (no non-exempt encryption). Add internal testers by their Apple ID email. External testers need a short Beta App Review the first time.

Android: Play Console → Testing → Internal testing → the release EAS uploaded. Add tester emails. They opt in through the Play link. Internal testing can take a few hours to appear.

## 9. Store listing, before the public release

Fill these in both consoles. Use the same answers.

**Age.** App Store age rating 17+. Play target audience 18+. Content rating questionnaire: user-generated messages, no unrestricted web, no location sharing, no ads. The product rule is 18+.

**Privacy policy.** Public URL `https://seeuaround.com/privacy`. That page is the policy. Open it in a private window before you submit. The sign-in screen links to that URL.

**Account deletion URL (Play).** `https://seeuaround.com/delete`. Apple uses the in-app path only. Play's form wants this web page as well.

**Data the app actually collects.**

- Email address, used to sign in and to confirm account deletion.
- First name.
- The nights someone marked free.
- Messages and voice notes, deleted when the thread expires.
- A push token.
- An age check that stores yes or no and the date, not a birthday.

**Data the app does not collect.** Location, contacts, calendar, photos, advertising id, birthday, government id.

**Permissions to declare.** Notifications. Microphone (“Leave a voice note for the people on this night.”). Camera (“Scan a friend’s code to connect.”).

**Account deletion.** Both stores require it.

- Apple: the in-app path is People → Account → Delete account. It emails a code, then deletes the user. Say that in App Review notes.
- Google: Play also asks for a web deletion URL. Point it at a page on `seeuaround.com` that explains the in-app steps, or add a web form. A store listing with no deletion URL is rejected.

**Screenshots.** Real phone screens, not the browser and not the marketing prototype. At least a 6.7-inch iPhone set and a phone Android set: People, an overlap, and a thread. Take them from the preview or TestFlight build. This repo cannot generate them.

**Review notes for Apple.** Paste this, and replace the inbox with one you can open while the review is in progress:

```
See U Around is invite-only. There is no password and no social feed.

Sign-in is a six-digit code emailed to the address typed on the first screen. Please use reviewer@seeuaround.com — we read that inbox and the code arrives within a minute.

Account deletion: People tab → person icon at the top right → Delete account → enter the six-digit code emailed to the same address → Delete account. The account is removed immediately.

Privacy policy: https://seeuaround.com/privacy
Account deletion page: https://seeuaround.com/delete
```

Do not submit `reviewer@seeuaround.com` until that mailbox exists and you can read it. Apple will wait on the code.

**Support URL.** A page or mailto on `seeuaround.com` that you actually read.

## 10. Public release

Only after the pocket has used TestFlight and Play internal testing, and push has arrived on both platforms.

- iOS: add the build to the App Store version, submit for review.
- Android: promote the release from internal testing to production (or to closed testing first, if you want another ring). Change `eas.json` `track` from `internal` to `production` before `eas submit` if you want EAS to upload straight to production later.

`production` builds set `autoIncrement`, so the build number goes up on each EAS build. You do not edit it by hand.

## 11. After it is out

JavaScript-only fixes, with no native change:

```bash
cd apps/mobile
eas update --branch production --message "what changed"
```

A new native module, permission, or Expo SDK upgrade needs a new `eas build` and a new store submit. `eas update` cannot ship those.

Push ground truth, in Postgres:

```sql
SELECT platform,
  COUNT(*) FILTER (WHERE sent_at IS NOT NULL) AS sent,
  COUNT(*) FILTER (WHERE received_at IS NOT NULL) AS received
FROM notifications
GROUP BY platform;
```

A gap on Android is normal. The phone’s receipt is what counts, not the send.

Pushes stay inside 8:00–22:00 in each person’s timezone. A night saved at 1 AM waits until morning. Two nights for the same person go out as one push.

## What not to do

- Do not test push in Expo Go or on the iOS simulator.
- Do not ship the `development` profile to a phone. It is a simulator client.
- Do not set `DEV_AUTH_CODE` on Railway.
- Do not assume a green `/health` means this week’s API is deployed.
- Do not commit `google-play-service-account.json` or the FCM key.
