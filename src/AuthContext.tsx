import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { clearTokens, exchangeCode, loadTokens, useAuthRequest } from './pco/auth';
import { config, isPlaceholder } from './config';

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
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [guestSession, setGuestSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [request, response, promptAsync] = useAuthRequest();

  useEffect(() => {
    loadTokens().then((t) => {
      setSignedIn(!!t);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (response?.type === 'success' && request?.codeVerifier) {
      const code = response.params.code;
      exchangeCode(code, request.codeVerifier)
        .then(() => setSignedIn(true))
        .catch((e) => console.warn('PCO exchange failed', e));
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

  const value = useMemo<AuthState>(
    () => ({
      signedIn,
      // Skip Welcome if signed in (persistent) OR guest chose this session.
      hasOnboarded: signedIn || guestSession,
      loading,
      configured: !isPlaceholder(config.pcoClientId),
      signIn,
      signOut,
      continueAsGuest,
    }),
    [signedIn, guestSession, loading, signIn, signOut, continueAsGuest]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
