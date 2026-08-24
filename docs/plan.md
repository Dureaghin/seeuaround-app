# Around — build plan

Working name. An app that tells you when you and your friends are free on the same night.

---

## 1. What it is

Around is not a messenger. It is a presence layer for people you already know.

You say which nights you are free. Your friends do the same. When you overlap, the app tells all of you. A short thread opens. It disappears after the night passes.

There is no feed. No follower count. No message history. No profile photo.

The app has one job: turn "we should hang out sometime" into a real plan, without anyone having to do the awkward asking.

---

## 2. The rule the product lives by

**Stating availability must cost almost nothing. Everything else is secondary.**

Every presence app in history died the same way: people stopped updating their status, the app went empty, and two empty opens killed it forever.

So the design rule is: **the user corrects, the user never authors.**

The app guesses your availability. You tap to fix it. You are never asked to write anything.

---

## 3. How it works — the loop

**Sunday, 6 PM.** One push notification. "Which nights are you free this week?"

You see seven bars, one per night. You tap the ones you're up for. Two seconds. Done.

There is no calendar to connect and no permission to grant. A calendar knows when you are *busy*; it cannot know you are up for going out on a Thursday. Only the user can say that.

**During the week.** The matching job runs. It compares your free nights against your friends' free nights.

**When there is an overlap.** Everyone involved gets one push. "Thursday. You, Sam and Marco are all free."

Two buttons: **I'm in** / **Not this time.**

**If two or more say yes.** A thread opens with just those people. It has a countdown. It disappears the morning after the night in question.

**That's the whole product.**

The app never opens itself for a browse. There is no home screen full of people. If there is no lit room, there is no empty room to walk into.

---

## 4. The screens

There are four. That is the whole app.

| Screen | Job |
|---|---|
| **Sunday** | Set your week. Seven bars, tap to light. |
| **Overlap** | The payoff. Who is free, when. Two buttons. |
| **Thread** | Short, ephemeral, voice-first. Has a visible countdown. |
| **People** | Your circle. Add by short code. See who is free tonight. |

---

## 4b. Notification timing

The app is notifications. Get the timing wrong and people turn them off, which kills the product silently — this is the single most common way apps in this category die.

**Three rules, all resolved in the recipient's own timezone.**

1. **Nothing before 8:00 AM or after 10:00 PM.** A queued push waits for the window; it is never dropped.
2. **The Sunday prompt goes at 6:00 PM local.** One per week. This is the only scheduled notification.
3. **Overlap pushes are held to the window, not sent on write.** Someone setting their week at 1 AM must not wake three other people. The matching job can run whenever; delivery is what gets gated.

**Recipient's timezone, not the sender's.** An overlap can span zones. Each person's push is scheduled against their own clock, so one send can produce three different delivery times.

**Collapse, don't queue up.** If two overlaps land overnight, the 8 AM push says so in one message. Never deliver a backlog.

**Deliberately not built:** a quiet-hours setting. If the defaults are right, nobody needs to configure them — and a settings screen is an admission that the defaults are wrong.

**Note on scope:** New York's SAFE for Kids Act restricts notifications to minors between midnight and 6 AM, but only for platforms with an algorithmic feed. With no feed, the app is outside that law. These rules are a product decision, not a compliance one.

---

## 4c. What opens when you open the app

There is no home screen. The app resolves to whichever state you're actually in.

**A notification always wins.** If the app was opened from a push, go straight to what the push was about and ignore everything below. This rule has no exceptions — a person who taps "Thursday. You, Sam and Marco are all free" must land on that overlap, not on a routing decision.

**Otherwise, first match wins:**

| # | If | Open |
|---|---|---|
| 1 | Not signed in | Email → code |
| 2 | Not age-confirmed | 18+ |
| 3 | Fewer than 5 connections | **Invite** |
| 4 | An overlap is unanswered | **Overlap** |
| 5 | A night you accepted is today or tomorrow | **Thread** |
| 6 | Your week isn't set | **Sunday** |
| 7 | You're paused | Pause status, with one tap to come back |
| 8 | Anything else | **People** |

**Rule 3 outranks everything but auth.** Below five people the app cannot work, so nothing else is worth showing. This is also where most churn happens — a user who lands anywhere else while empty concludes the product is broken rather than unfinished.

**"Did Thursday happen?" is a banner, not a destination.** It is your metric, not the user's errand. Blocking someone's app open to collect your own data is the wrong trade — put it at the top of whatever screen they landed on, one tap either way, gone once answered or once the day ends.

**Rule 8 is the quiet one.** Most opens land on People: who's lit tonight, and nothing else. No feed, no suggestions, no activity, no "people you may know." If the honest answer on a dead Tuesday is "nobody's around," the screen says that and offers a way to fix it.

**The test for any future addition to this list:** if what it shows on a dead Tuesday is anything other than a way to fix the dead Tuesday, it doesn't belong.

---

## 5. Identity

No phone number.

- **Email plus a six-digit code.** No password. The email is the only identifier stored, and it is what makes account recovery possible. Passkeys come later as a convenience, never as the only key.
- **Short code.** Every user gets one, like `AR-4417-92`. This is the ICQ idea, updated. You share it to add someone. It is not searchable and not guessable.
- **Mutual only.** A connection needs both sides to accept. There is no one-way follow, ever.
- **No discovery.** You cannot browse for strangers. There is nothing to browse.

---

## 6. Privacy design

This matters because you are asking people to publish when they are alone and free. Get it wrong and the app is a stalking tool.

- Availability is visible **only** to mutual connections.
- Nights only. Never precise times or locations by default.
- No location tracking. City-level at most, and only if the user turns it on.
- **No calendar integration at all.** Nothing to connect, no permission prompt, no OAuth token, no free/busy read. This removes an entire class of privacy risk and the scariest permission dialog in the signup flow.
- Threads and voice notes auto-delete. Storage lifecycle rules do it, not a cron you might forget.
- Blocking is silent and total. A blocked person sees you as permanently unavailable, with no signal that anything changed.

---

## 6b. Invite security

The invite link is the only unauthenticated surface in the product. It is where an attack starts.

### The token

- **16 characters, base62, from a CSPRNG.** Roughly 95 bits. Not sequential, not derived from a user id, not a short number. A 4-digit code is 10,000 possibilities — half the space walks in under a minute at 100 requests per second, which yields a list of real first names and confirmation they use the app.
- **Store a hash of the token, never the token.** Same discipline as a password. A database leak must not hand over working invite links.
- **Constant-time comparison** on lookup.

### Lifetime and scope

| Rule | Why |
|---|---|
| Expires in 7 days | A forwarded link has a shelf life |
| Capped uses, default 5 | One leak cannot become a hundred connections |
| Revocable instantly, and revoking issues a new link | The "switch it off" promise needs a button behind it |
| Bound to the inviter | It grants a *request*, never a connection |
| A link never auto-connects | Mutual accept stays the backstop, always |

### The permanent short code

`SU-XXXX-XXXX` in Crockford base32 — no I, L, O or U, so it survives being read aloud or written down. Eight characters is 40 bits.

It is permanent, so treat it as the weaker of the two: **rate-limit lookups hard, let the user rotate it at any time, and never let it skip mutual accept.** If abuse ever appears, drop it and keep only expiring links.

### Endpoint rules

- **Rate limit per IP, per token and globally** on the `/j/` route. Hard-fail after a small number of misses from one source.
- **Identical response for invalid, expired and revoked.** Different errors are an oracle that tells an attacker when a guess was close.
- **`Referrer-Policy: no-referrer`** on the invite page, or the token leaks in the `Referer` header the moment anyone clicks out.
- **`X-Robots-Tag: noindex, nofollow`** plus the meta tag. An indexed invite page is a permanent public record that a named person uses the app.
- **Keep the token out of logs and analytics.** Strip it at the edge; do not let it reach an events pipeline.
- **Serve the page statically**, with only a first name injected from a short-lived token — never a user id.

### What the page shows

A first name and nothing else. No surname, no photo, no availability, no count of who else joined. The page is written on the assumption that a stranger is reading it, because eventually one is.

---

## 7. Age and compliance

Plan for this before writing code, not after. But do not overbuild it.

Age rules are tightening fast. France bars under-15s from social apps starting September 2026. Texas, Utah and Louisiana now require app developers to verify age and get parental approval for minors. Roughly half of US states have some mandate in force or advancing. Any app with user profiles and messaging generally needs a 17+ rating.

You cannot skip this. Your product facilitates real-world meetings between people who have signalled they are alone and free. That is the highest-scrutiny category there is.

But you can stage it.

### Phase 0 — nothing

Forty adults you recruited yourself. No app, no store listing, no signup. Zero compliance surface.

### Phase 1 — free, about a day of work

1. **Declare 18+** in the store listing and terms. Rate the app 17+.
2. **Use the platform age APIs.** Apple's Declared Age Range and Google Play's equivalent return an age band with no friction and no cost. This is most of your compliance for zero dollars.
3. **Build a takedown path** so a reported underage account can be removed fast.

**Ship 18+ only.** Minors triple your compliance surface and this product does not need them.

### Phase 3 — only when a jurisdiction forces it

A paid vendor — Persona, Veriff, or Yoti — at roughly $0.50 to $2.00 per check. Document or face-estimation flows. Add this when you are operating at scale somewhere that demands a stronger standard, not before.

### What you store, at every phase

A boolean and a timestamp. Never the document, the face scan, or the date of birth.

The mistake is treating this either as optional or as a $20,000 problem before you have a single user. It is neither.

---

## 8. Data model

Six tables. That is genuinely all.

```
users            id, handle, short_code, created_at, age_verified_at
credentials      id, user_id, kind, passkey_public_key, counter   -- kind: 'passkey' (optional, added later)
connections      user_a, user_b, status, created_at
windows          id, user_id, span (tstzrange), source, created_at
overlaps         id, span (tstzrange), created_at, expires_at
overlap_members  overlap_id, user_id, response
threads          id, overlap_id, expires_at
messages         id, thread_id, user_id, body, audio_key, created_at
```

`source` on a window is `manual` or `default` — whether the user tapped it or a learned default set it. That ratio is your passive-supply number, and it is the one to watch.

---

## 9. The core engine

This is the one piece of real technical cleverness, and PostgreSQL does it for you.

Availability is a time range, not a date. Store it as `tstzrange`. Index it with GiST. Then overlap is a single operator: `&&`.

```sql
-- Find every friend whose free time overlaps mine by 90+ minutes
SELECT
  b.user_id,
  a.span * b.span AS shared_window
FROM windows a
JOIN connections c
  ON c.user_a = a.user_id AND c.status = 'accepted'
JOIN windows b
  ON b.user_id = c.user_b
 AND b.span && a.span
WHERE a.user_id = $1
  AND upper(a.span * b.span) - lower(a.span * b.span)
      >= interval '90 minutes';
```

```sql
CREATE INDEX windows_span_idx ON windows USING GIST (span);
```

**The important realisation: this is not a chat app.** It is a scheduling-overlap engine with push notifications attached. Chat is a small feature at the end of the funnel, used by a handful of people for a few hours.

That means you do not need WebSockets, a realtime infrastructure, or a message broker at launch. Threads are rare and short. Polling on open is fine. This keeps the build small enough for a very small team.

---

## 10. Tech stack

Chosen to sit close to what you already know.

**Mobile app — React Native + Expo (pin SDK 56)**
You know React. Expo handles builds, over-the-air updates, and push for you. SDK 56 (May 2026) carries React Native 0.85 and Hermes v1; the New Architecture is mandatory from SDK 55 on, so the old bridge and its performance complaints are gone. SDK 57 lands around September — **do not chase it mid-build**; upgrade one SDK at a time, never skip versions. You need native, not web, for two reasons: push notifications and passkeys. Push is the entire product, so this is not negotiable.

**Backend — Node + Fastify, TypeScript**
Small, fast, boring. Nothing here justifies a heavier framework.

**Database — PostgreSQL**
You already run it. And `tstzrange` plus GiST is exactly the tool this problem needs. Nothing else comes close for this.

**Jobs — pg-boss**
Runs the matching job and the Sunday notification. It uses your existing Postgres as the queue, so you avoid adding Redis at launch. Swap to BullMQ later only if volume demands it.

**Push — Expo Push Notifications**
Wraps APNs and FCM behind one API. Free, no per-message fee, no volume cap. The one hard limit is 600 notifications per second per project; above that, batch with `expo-server-sdk-node`. You are nowhere near it, and Sunday sends spread across timezones anyway.

**No lock-in.** `getDevicePushTokenAsync` returns the native device token, so you can send via FCM and APNs directly whenever you want. Keep that escape hatch documented.

### Instrument device-side receipt from day one

This is the most important instrumentation decision in the build, because the product *is* notifications.

Expo, FCM and APNs all return a successful ticket long before anything appears on a lock screen. Measured gaps between ticket-success and device-received run roughly **12–18% on Android and 4–8% on iOS** — mostly Doze and App Standby on Android, Low Power Mode and Focus filters on iOS.

Read that as a product problem, not an infrastructure one. **Roughly one in seven Android users may never see an overlap you successfully sent.** Your dashboard says delivered; their evening says nothing happened. You would conclude the matching is bad or that people do not care, when the push simply never landed.

**The only reliable signal is the app reporting its own received-listener firing.** Log that, compare it against tickets sent, and split the rate by platform. Without it you will spend months debugging Doze while thinking you are debugging your product.

Also: keep payloads under 4 KB. Send only what the OS displays and let the app fetch the rest on tap.

**Auth — email plus a six-digit code**
This is the primary path. No password to store, reset or leak, and it solves account recovery: a lost phone does not mean a lost circle.

Passkeys are a **convenience layer added later** — "skip the code next time" — not the mechanism. Putting them first would have meant an unrecoverable account for anyone who wiped a phone or switched platforms.

Three server-side rules the login form depends on:
- **Never reveal whether an address exists.** Same message, same timing, known or not — otherwise the form is a membership directory.
- **Rate limit per address, per IP, per device.** Five wrong codes kills the code, not just the attempt.
- **Block disposable domains at signup**, or the recovery purpose is defeated on day one.

**Voice notes — Cloudflare R2**
Set object lifecycle rules so files delete themselves. Ephemerality should be enforced by infrastructure, not by code you have to remember to write.

**Hosting — Railway**
You already use it. API plus Postgres in one place. Move to Fly.io only if you need multi-region.

**Analytics — PostHog**
Self-host it. You are storing sensitive availability data; do not hand behavioural events to a third party you don't control.

**Errors — Sentry.**

### Rough monthly infrastructure cost

At a few thousand users: **$50 to $150.** This is not an expensive app to run. The cost is your time and the age checks.

---

## 11. What we deliberately do not build

Cutting these is the plan, not an oversight.

- No feed
- No stranger matching or discovery
- No public profiles
- No message history or search
- No group larger than about twelve
- No read receipts
- No typing indicators
- No streaks, badges, or engagement mechanics
- No web app at launch

Every one of these has a reason to exist and every one would kill the product.

---

## 12. Metrics

**Do not measure DAU.** This is a background app. If you grade it like a messenger you will bolt on a feed to lift opens, and the feed will kill it.

**Primary:** hangouts caused per user per month.
**Second:** days from signup to first real hangout. Over seven days and they churn.

Supporting numbers:

| Metric | Why |
|---|---|
| Percent of users with availability set this week | Your supply. The whole thing rests on this. |
| Percent of windows from `default` vs `manual` | Are learned defaults reducing the weekly effort? |
| Overlaps per user per week | Density health. |
| Overlap → "I'm in" rate | Are the matches any good? |
| "I'm in" → confirmed hangout | The real conversion. |
| **Percent of threads that set a place** | Whether a venue business could ever exist. See below. |
| **Device-side push receipt rate, split by platform** | The one that will mislead you if you skip it. Expect a 12–18% gap on Android. A dip here looks exactly like people losing interest. |

### The place picker, and the venue question

The thread has a plain place picker: anyone suggests a name, others tap to back it, the leader gets pinned. No partners, no discounts, no listings, no commerce of any kind.

It is there to answer one question cheaply: **do groups actually make this decision in the app, or do they say "the usual" and never touch it?**

If well over half of threads set a place, a venue relationship is worth exploring — and you can sell it with evidence instead of a pitch. If they don't, the marketplace was never there, and you found out for the cost of one panel rather than a year of sales calls.

**If it does prove out, build the distribution side first, not the commission side.** A bar promoting the app to its regulars solves density inside a pocket, which is the harder problem. Ten percent of a bill is worth far less than a card on the counter with a join code — and it costs the venue nothing, needs no POS work and no staff training.

**Three things to keep in mind before any deal:**

- Restaurant net margins run roughly 3–9%. A 10–15% discount can exceed the entire net margin. Venues accept that only for genuinely incremental traffic on dead nights — and your users want Friday.
- Attribution is the operational failure mode. Staff turn over, codes get forgotten, and this app splits bills across separate people, so "10% of the bill" has no obvious subject.
- The privacy page promises no advertising, and that any charge will be for something visible. A booking fee stays inside that. **Paid placement does not** — the moment ranking is bought, the list is an ad and that page needs rewriting.

You will need to ask people whether the hangout happened. A single push the next morning: "Did Thursday happen?" Two buttons. That is your ground truth.

---

## 13. Build phases

### Phase 0 — no code (4 weeks)

Forty people. One dense pocket: an office building, a campus, a gym, a neighbourhood.

You send the Sunday text yourself. You do the matching in a spreadsheet. You send the "you're both free Thursday" message by hand.

**Count the hangouts you caused.**

If you cannot cause hangouts by hand at forty people, software will not fix it. It will just make the failure faster and more expensive. Cost: one month, zero dollars.

### Phase 1 — MVP (8 weeks)

Only if Phase 0 worked.

Passkey signup, short codes, the week strip, the Sunday push, the matching job, the overlap push, the ephemeral thread. iOS first. One pocket only.

### Phase 2 — make supply passive (6 weeks)

Learned defaults from the user's own history — "you have been free most Wednesdays" — pre-set from *their* past answers, never from another source. Voice notes. Android.

This phase is where the product either becomes durable or does not.

**Note the consequence of dropping calendar.** Supply is now entirely manual, forever. The original plan leaned on a calendar read to make it passive; that option is gone by choice. Learned defaults are the only remaining lever, and they can only ever pre-fill from what the user has already told you. If seven taps a week is too much, nothing else will save it — which makes the Phase 0 retention number more important, not less.

### Phase 3 — density and money (ongoing)

Paid age verification, if and only if a jurisdiction demands more than the platform APIs. A second pocket. The venue test: does a bar pay for filled seats on a slow Tuesday?

### Maybe — live ETA (Phase 3 at the earliest, possibly never)

**The idea:** when a plan is confirmed and you're within about 30 minutes of it, a button appears — *share my ETA*. Your two or three people watch each other get closer. It switches itself off once you arrive.

**Why it's tempting.** Watching dots converge is genuinely delightful. Zenly proved people love it; Snap shut it down for business reasons, not lack of affection.

**Why it isn't in the plan.** Three things, in order of seriousness:

1. **It contradicts the promises other screens make.** The invite page and the accept step both say "not your location." Those lines are load-bearing — they're why a person trusts a forwarded link from someone they half-know. Persistent location means taking them down.
2. **The combination is the danger, not the location.** This app already publishes *when I'm free and probably alone*. Add *where I am* and you've built both halves of a stalking tool in one product. Most location apps carry only the second half.
3. **It changes the competition.** Today nobody does availability overlap. Add a live map and you're against Find My, Snap Map and Life360.

Plus the practical tax: always-on location is the most-denied iOS permission and the top cause of battery complaints.

**The only shape worth building.** Not a map you can open. **ETA scoped to one evening** — location flows to the people in that one thread, only in the window before the meeting, nothing stored, no history, off automatically afterwards. Copy stays honest with one clause added: *not your location, unless you turn it on for one evening.*

**The condition for building it.** Only after hangouts-caused is proven and growing. It teaches you nothing about whether the core loop works, and it's among the hardest features to do well — background permissions, accuracy, battery, an entirely new privacy model. If it ever ships, it ships as an off-by-default per-plan toggle, never as an account setting.

---

## 14. Money

**Never charge for presence.** Charging for presence kills the density the product runs on.

Charge at conversion instead — the moment an overlap becomes a plan.

- Booking the table
- Splitting the tab
- Holding the spot

And sell to venues, not users: a bar pays for filled seats on a dead Tuesday, and that revenue never touches the user.

Messaging users expect free. This is why nearly every successful chat platform ended up in payments, business accounts, or commerce. Plan the paid layer now, ship it later.

---

## 15. The three risks that decide this

**1. Supply.** People will not update a status. If Phase 2 cannot make availability mostly passive, the app dies quietly around week six. This is the one to solve first.

**2. Geography.** Overlap is worthless if your friends live in other cities. After twenty-five, most people's close friends are scattered. This is the killer nobody talks about. It is why you launch inside one dense pocket and expand pocket by pocket, not city by city.

**3. No moat.** Ephemerality is the feature and the weakness. No history means zero switching cost. A user can leave on a Tuesday and lose nothing. The only defensibility is a graph of who is actually free — which nobody else has, but which is thin. Do not tell yourself it is more than that.
