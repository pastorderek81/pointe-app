# Pointe PCO Proxy

A tiny Cloudflare Worker that holds a Planning Center Personal Access Token and exposes a read-only allowlist of PCO API paths. The Pointe Church app uses this when a user is browsing as a guest, so they can see public events + groups without signing in.

## What it does

- `GET /calendar/v2/event_instances?...` → forwards to PCO, returns events
- `GET /groups/v2/groups?...` → forwards to PCO, returns groups
- Anything else → `403 Path not allowed`
- Caches responses for 5 minutes to reduce load
- ~50 lines of code, free Cloudflare tier handles way more traffic than you'll see

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

### 5. Deploy

```bash
npx wrangler deploy
```

Wrangler prints the deployed URL, e.g. `https://pointe-pco-proxy.YOURNAME.workers.dev`. Copy that — it goes into the app's `app.json` as `extra.proxyUrl`.

### 6. Verify

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
