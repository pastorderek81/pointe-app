import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { clearTokens, exchangeCode, loadTokens, useAuthRequest } from './pco/auth';
import { config, isPlaceholder } from '../config';

WebBrowser.maybeCompleteAuthSession();

// Onboarding behavior:
//  - Signed-in users persist via SecureStore tokens — they skip Welcome on
//    every launch as long as the refresh token is still valid.
//  - Guests get a session-only "skipped welcome" flag. Closing the app
//    resets it, so next launch they see the Welcome screen again. By design.
type AuthState = {
  signedIn: boolean;
  hasOnboarded: boolean;
  loading: boolean;
  configured: boolean;
  authError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  clearAuthError: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [guestSession, setGuestSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [request, response, promptAsync] = useAuthRequest();

  useEffect(() => {
    // SecureStore can reject (Keychain locked after restore-from-backup, old
    // iOS biometric edge cases) or — rarely — hang. Either way, never trap
    // the user on Welcome: time the load out and fall back to signed-out.
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (cancelled) return;
      console.warn('loadTokens timed out — proceeding signed-out');
      setSignedIn(false);
      setLoading(false);
    }, 3000);
    loadTokens()
      .then((t) => {
        if (cancelled) return;
        clearTimeout(timeout);
        setSignedIn(!!t);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        clearTimeout(timeout);
        console.warn('loadTokens failed', e);
        setSignedIn(false);
        setLoading(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && request?.codeVerifier) {
      const code = response.params.code;
      setAuthError(null);
      exchangeCode(code, request.codeVerifier)
        .then(() => setSignedIn(true))
        .catch((e) => {
          const msg = e?.message ?? String(e);
          setAuthError(`Token exchange failed: ${msg}`);
          console.warn('PCO exchange failed', e);
        });
    } else if (response.type === 'error') {
      setAuthError(`OAuth error: ${response.error?.message ?? response.params?.error_description ?? 'unknown'}`);
    } else if (response.type === 'dismiss') {
      setAuthError('Sign-in cancelled or redirect did not reach app');
    }
  }, [response, request?.codeVerifier]);

  const signIn = useCallback(async () => {
    if (isPlaceholder(config.pcoClientId)) {
      console.warn('PCO client ID not configured — see app.json extra.pcoClientId');
      return;
    }
    await promptAsync();
  }, [promptAsync]);

  const signOut = useCallback(async () => {
    await clearTokens();
    setSignedIn(false);
    setGuestSession(false); // back to Welcome on next render
  }, []);

  const continueAsGuest = useCallback(() => {
    setGuestSession(true);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const value = useMemo<AuthState>(
    () => ({
      signedIn,
      // Skip Welcome if signed in (persistent) OR guest chose this session.
      hasOnboarded: signedIn || guestSession,
      loading,
      configured: !isPlaceholder(config.pcoClientId),
      authError,
      signIn,
      signOut,
      continueAsGuest,
      clearAuthError,
    }),
    [signedIn, guestSession, loading, authError, signIn, signOut, continueAsGuest, clearAuthError]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
