// Planning Center OAuth (PKCE) for native app login.
// Member signs in with their PCO account — same as Church Center.
//
// Setup required (Derek): register an OAuth application at
// https://api.planningcenteronline.com/oauth/applications
// Redirect URI: pointeapp://auth (matches `scheme` in app.json)
// Scopes: people groups calendar services check_ins
// Then drop the client ID into app.json `extra.pcoClientId`.
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { config } from '../../config';

const DISCOVERY = {
  authorizationEndpoint: 'https://api.planningcenteronline.com/oauth/authorize',
  tokenEndpoint: 'https://api.planningcenteronline.com/oauth/token',
  revocationEndpoint: 'https://api.planningcenteronline.com/oauth/revoke',
};

export const PCO_SCOPES = [
  'people',
  'groups',
  'calendar',
  'services',
  'check_ins',
  'registrations', // for sign-ups (Events tab)
];

const TOKEN_KEY = 'pco_tokens_v1';

export type PcoTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // ms epoch
};

export async function loadTokens(): Promise<PcoTokens | null> {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PcoTokens;
  } catch {
    return null;
  }
}

export async function saveTokens(t: PcoTokens) {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(t));
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function buildRedirectUri() {
  return AuthSession.makeRedirectUri({ scheme: 'pointeapp', path: 'auth' });
}

export function useAuthRequest() {
  return AuthSession.useAuthRequest(
    {
      clientId: config.pcoClientId,
      scopes: PCO_SCOPES,
      redirectUri: buildRedirectUri(),
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    DISCOVERY
  );
}

export async function exchangeCode(code: string, codeVerifier: string): Promise<PcoTokens> {
  const result = await AuthSession.exchangeCodeAsync(
    {
      clientId: config.pcoClientId,
      code,
      redirectUri: buildRedirectUri(),
      extraParams: { code_verifier: codeVerifier },
    },
    DISCOVERY
  );
  const tokens: PcoTokens = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: Date.now() + (result.expiresIn ?? 7200) * 1000,
  };
  await saveTokens(tokens);
  return tokens;
}

export async function refreshIfNeeded(t: PcoTokens): Promise<PcoTokens> {
  if (Date.now() < t.expiresAt - 60_000) return t;
  if (!t.refreshToken) throw new Error('No refresh token; user must re-login');
  const r = await AuthSession.refreshAsync(
    { clientId: config.pcoClientId, refreshToken: t.refreshToken },
    DISCOVERY
  );
  const next: PcoTokens = {
    accessToken: r.accessToken,
    refreshToken: r.refreshToken ?? t.refreshToken,
    expiresAt: Date.now() + (r.expiresIn ?? 7200) * 1000,
  };
  await saveTokens(next);
  return next;
}
