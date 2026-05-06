// Pointe Church PCO read-only proxy.
//
// Holds a Planning Center Personal Access Token in env (set as a Cloudflare
// secret) and forwards a small allowlist of PCO API paths to the app, so
// guest users can see public events + groups without signing in.
//
// Signed-in users hit PCO directly with their OAuth token — this proxy is
// only used when the user is browsing as a guest.
//
// Auth: PCO Personal Access Tokens use HTTP Basic Auth with `app_id:secret`.

export interface Env {
  PCO_APP_ID: string;
  PCO_SECRET: string;
}

const ALLOWED_PATH_PREFIXES = [
  '/calendar/v2/event_instances',
  '/groups/v2/groups',
  '/registrations/v2/signups', // sign-ups (events people RSVP to)
];

const CACHE_SECONDS = 300; // 5 minutes — events/groups don't change often

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    if (!ALLOWED_PATH_PREFIXES.some((p) => url.pathname.startsWith(p))) {
      return new Response('Path not allowed', { status: 403, headers: CORS_HEADERS });
    }

    const target = `https://api.planningcenteronline.com${url.pathname}${url.search}`;

    // Try the cache first.
    const cacheKey = new Request(target, { method: 'GET' });
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) {
      return withCors(hit);
    }

    // Forward to PCO with Basic Auth.
    const auth = btoa(`${env.PCO_APP_ID}:${env.PCO_SECRET}`);
    const upstream = await fetch(target, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    });

    // Pass through, but with our cache-control + CORS headers.
    const body = await upstream.text();
    const response = new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
      },
    });

    if (upstream.ok) {
      // Only cache successful responses.
      await cache.put(cacheKey, response.clone());
    }

    return withCors(response);
  },
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}
