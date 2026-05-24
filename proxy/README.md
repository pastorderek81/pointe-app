# Pointe PCO Proxy

A tiny Cloudflare Worker that holds a Planning Center Personal Access Token and exposes a read-only allowlist of PCO API paths. The Pointe Church app uses this when a user is browsing as a guest, so they can see public events + groups without signing in.

## What it does

- `GET /calendar/v2/event_instances?...` → forwards to PCO, returns events
- `GET /groups/v2/groups?...` → forwards to PCO, returns groups
- `GET /content` → fetches `featured.json` from the public [pointe-content](https://github.com/pastorderek81/pointe-content) repo, validates its shape, and serves it (60s cache). Powers the home screen's hero / featured / sermon-notes URL — edit the JSON in that repo to update the app.
- `POST /push/register` → upserts an Expo push token in the `PUSH_TOKENS` KV namespace. Called by the app on launch (when permission is granted) and when a user opts in via Settings.
- `POST /push/broadcast` → sends a notification to every registered token via Expo's push API. Auth'd by the `PUSH_BROADCAST_SECRET` shared secret (Bearer token). Auto-prunes any token Expo reports as `DeviceNotRegistered`.
- `GET /admin` → admin web UI for sending pushes + editing `featured.json`. HTTP Basic Auth using the `ADMIN_PASSWORD` secret. Edits commit to GitHub via the Contents API using `GITHUB_TOKEN`.
- `GET /admin/api/content` / `POST /admin/api/content` / `POST /admin/api/push` → admin JSON APIs the page calls. Same Basic Auth.
- Anything else → `403` / `405`
- PCO responses cached 5 min, content cached 60s
- Free Cloudflare tier handles way more traffic than you'll see

## One-time setup

### 1. Create a PCO Personal Access Token (~5 min)

1. Go to <https://api.planningcenteronline.com/oauth/applications>
2. Scroll to **Personal Access Tokens** → **Create one**
3. Description: `Pointe App Proxy`
4. Save → copy the **Application ID** and the **Secret**

### 2. Sign up for Cloudflare (~2 min)

1. Go to <https://dash.cloudflare.com/sign-up> (free tier is fine)
2. Verify email

### 3. Install wrangler + log in (~1 min)

```bash
cd "/Users/derekhowell/Pointe App/proxy"
npm install
npx wrangler login
```

A browser opens — authorize wrangler to access your Cloudflare account.

### 4. Set the secrets

```bash
npx wrangler secret put PCO_APP_ID
# paste the Application ID, press Enter

npx wrangler secret put PCO_SECRET
# paste the Secret, press Enter
```

### 5. Set up the push notifications KV namespace + broadcast secret (~3 min)

```bash
npx wrangler kv:namespace create PUSH_TOKENS
```

Wrangler prints something like:

```
🌀 Creating namespace with title "pointe-pco-proxy-PUSH_TOKENS"
✨ Success! Add the following to your configuration file:
[[kv_namespaces]]
binding = "PUSH_TOKENS"
id = "abc123..."
```

Open `wrangler.toml`, find the commented `[[kv_namespaces]]` block, **uncomment it**, and replace `REPLACE_WITH_KV_NAMESPACE_ID` with the actual ID Wrangler printed.

Then set the broadcast secret (any long random string — this is the password that lets you send pushes):

```bash
npx wrangler secret put PUSH_BROADCAST_SECRET
# paste a long random string, press Enter — save it somewhere safe
```

### 6. Set up the admin web UI (~5 min)

The `/admin` route lets staff send pushes and edit content from a browser instead of curl. Two secrets to set:

**a. Pick an admin password** — any strong string. Share it with staff who should have admin access. Rotate it whenever the team changes.

```bash
npx wrangler secret put ADMIN_PASSWORD
# paste your chosen password, press Enter
```

**b. Create a GitHub fine-grained Personal Access Token** so the admin UI can commit to the [pointe-content](https://github.com/pastorderek81/pointe-content) repo:

1. Go to <https://github.com/settings/personal-access-tokens/new>
2. **Token name:** `Pointe Admin`
3. **Expiration:** 1 year (or pick a date, but not "no expiration")
4. **Repository access:** *Only select repositories* → pick `pointe-content`
5. **Repository permissions:** under *Contents* → **Read and write** (Metadata is auto-included)
6. Click **Generate token**, copy the value
7. Save it to the Worker:

```bash
npx wrangler secret put GITHUB_TOKEN
# paste the GitHub token, press Enter
```

### 7. Deploy

```bash
npx wrangler deploy
```

Wrangler prints the deployed URL, e.g. `https://pointe-pco-proxy.YOURNAME.workers.dev`. Copy that — it goes into the app's `app.json` as `extra.proxyUrl`.

### 8. Verify

```bash
curl "https://pointe-pco-proxy.YOURNAME.workers.dev/calendar/v2/event_instances?per_page=1"
```

You should see PCO event JSON. If you see `{"errors": ...}` from PCO it means the secret isn't right — re-run step 4.

## Updating

If the worker code changes, just `npx wrangler deploy` again. No app rebuild needed.

## Logs

`npx wrangler tail` — streams live logs from the worker. Useful when debugging.

## Notes

- Cloudflare Workers free tier: 100,000 requests/day. Way more than this app will use.
- The PAT scope determines what the proxy can read. Set it to read-only when you create the token.
- This proxy is intentionally narrow — only events + groups paths. To add more, edit `ALLOWED_PATH_PREFIXES` in `src/index.ts` and redeploy.
