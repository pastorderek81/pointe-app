# The Pointe Church App — Setup

Built with **Expo (React Native, TypeScript)**. Single codebase → iOS + Android.

## What's already built (v1)

- Brand theme matching the website (Coastal Peach palette, Inter font)
- Tab navigation: Home / Media / Groups / Events / More
- **Home** — next service time, sermon teaser, give CTA, plan-your-visit, parking copy
- **Media** — pulls latest videos from your YouTube channel (`@thepointechurch4274`)
- **Groups** — pulls from Planning Center Groups API
- **Events** — pulls from Planning Center Calendar API
- **Give** button — deep links to `pushpay.com/g/thepointechurchcb`
- **PCO OAuth** sign-in (PKCE) — members log in with their Planning Center account, same as Church Center
- **Push notifications** scaffolding via Expo Push (single API for iOS + Android)

## What you need to do before this can run end-to-end

Three credentials need to be filled into `app.json` under `expo.extra`:

### 1. Planning Center OAuth client ID

1. Go to <https://api.planningcenteronline.com/oauth/applications>
2. Click **Create one**
3. Name: `The Pointe Church App`
4. Redirect URI: `pointeapp://auth`
5. Scopes: `people groups calendar services check_ins`
6. Copy the **Client ID** → paste into `app.json` → `extra.pcoClientId`

> Note: PKCE flow doesn't require the client secret in the app, so it stays server-side only.

### 2. YouTube Data API key

1. Go to <https://console.cloud.google.com/apis/credentials>
2. Create or select a project
3. Enable **YouTube Data API v3**
4. Create credentials → **API key**
5. **API restrictions:** restrict to YouTube Data API v3
6. **Application restrictions:** add four entries
   - HTTP referrer: `https://www.thepointe.online/*`
   - HTTP referrer: `https://thepointe.online/*`
   - iOS bundle ID: `online.thepointe.app`
   - Android package: `online.thepointe.app`
7. Paste the same key into **two** places:
   - `app.json` → `extra.youtubeApiKey` (for the app)
   - `<meta name="yt-api-key" content="…">` on `index.html`, `messages/index.html`, and `linktree/index.html` of the website (for the site)

The same key powers both clients. The restrictions above prevent anyone else from using the key elsewhere.

### 3. Pushpay URL

Already set: `https://pushpay.com/g/thepointechurchcb` (pulled from your website).

## Running locally

```bash
cd "/Users/derekhowell/Pointe App"
npm install            # already done
npm start              # opens Expo dev tools
```

Then either:
- Press `i` for iOS simulator (needs Xcode)
- Press `a` for Android emulator (needs Android Studio)
- Scan the QR with **Expo Go** on your iPhone for fastest iteration

## Activating sign-in (development build)

OAuth with a custom scheme (`pointeapp://`) doesn't work in Expo Go — it needs a real signed build. The good news: a "development build" is a one-time setup, then you get hot-reload just like Expo Go but with real sign-in working.

```bash
npm install -g eas-cli
eas login                                       # uses your Apple Dev account (Team ID D3HNM5YDJ5)
eas build --profile development --platform ios  # ~10-15 min, builds in the cloud
```

When the build finishes, EAS sends you an install link. Open it on your iPhone, install, then back in Terminal:

```bash
npm start --dev-client
```

Open the new "Pointe Church (dev)" app on your phone — same QR-scan flow as Expo Go, but now `pointeapp://` works and sign-in completes. From here on, any code you change hot-reloads instantly.

(Same flow for Android with `--platform android`.)

## Shipping to the stores

1. `eas build --profile preview --platform ios` → uploads to TestFlight for elders/staff to test
2. `eas build --profile production --platform ios` → store-ready build
3. `eas submit --platform ios` (and `--platform android`)

EAS auto-provisions APNs (iOS push) and FCM (Android push) credentials on first build.

## Sending push notifications

Once you have a real device with the app installed, you'll get an Expo push token. To broadcast:

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{"to": "ExponentPushToken[xxx]", "title": "This Sunday", "body": "9:30 + 11 AM. See you there."}'
```

Phase 2 should add a tiny admin tool that stores tokens server-side so you can broadcast to everyone at once.

## Updating the current sermon series

**One spot updates everything: YouTube.**

When a new series launches:
1. Create a new playlist on YouTube
2. **Title format:** `Series Name — Subtitle` (em-dash separator, e.g., `Faith in Action — 1st Corinthians`)
3. **Description:** first line is the tagline used on linktree + the website's "Now Playing" subtitle (e.g., `A study of 1st Corinthians — what it actually looks like to live out faith when life gets messy.`)
4. **Custom thumbnail:** upload your designed series art in YouTube Studio → Playlist → Edit (1280×720 16:9)
5. Add sermons to the playlist as you record them

Within an hour:
- The app's hero pulls the new title, subtitle, and thumbnail
- The website's `/messages/`, `/`, and `/linktree/` pages all update
- "Watch the Latest" links update to the new playlist URL

The hardcoded HTML in the website pages stays as a fallback — it's what shows for users with JS disabled, search engines, or if YouTube is unreachable. Worth updating it manually when you launch a new series so the SEO/og:image stays current. (Or skip — the dynamic version will overwrite for live visitors.)

## Phase 2 ideas (not built yet)

- Group messaging (PCO doesn't expose this via API — needs a custom backend or third-party chat)
- Event RSVPs (PCO Calendar supports RSVPs)
- Serving schedules from PCO Services
- Kids check-in (PCO Check-Ins API)
- Member directory
- Sermon notes / archive search
- A small admin tool to broadcast push notifications

## File map

```
src/
  theme.ts            — brand tokens (mirrors website brand.css)
  config.ts           — reads credentials from app.json extra
  AuthContext.tsx     — PCO sign-in/out state for the whole app
  push.ts             — Expo push registration
  series.ts           — current series fetch + cache + bundled fallback
  youtube.ts          — YouTube channel videos + playlist (current series)
  pco/
    auth.ts           — OAuth (PKCE) + secure token storage + refresh
    api.ts            — events, groups, /me — auto-refreshes token
  navigation/
    RootTabs.tsx      — bottom tab navigator
  components/
    Hero.tsx          — full-bleed cinematic hero with gradient
    LiveBadge.tsx     — pulsing LIVE pill (active during service hours)
    ActionChipRow.tsx — horizontally scrollable chips
    SectionHeader.tsx — eyebrow + title + action link
    MessageCard.tsx   — Netflix-style sermon card
    Card.tsx          — surface card
    PrimaryButton.tsx — sky / peach / ghost variants
  utils/
    services.ts       — service schedule + isServiceLive logic
  screens/
    HomeScreen.tsx
    MediaScreen.tsx
    GroupsScreen.tsx
    EventsScreen.tsx
    MoreScreen.tsx
```
