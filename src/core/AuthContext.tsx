import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { clearTokens, exchangeCode, loadTokens, useAuthRequest } from './pco/auth';
import { config, isPlaceholder } from '../config';
import { SignInSheet } from './SignInSheet';

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
  // "Sign in" opens a chooser sheet (sign in / set a password / new here)
  // instead of jumping straight to Planning Center's password-only login.
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetTrouble, setSheetTrouble] = useState(false);
  const [sheetSession, setSheetSession] = useState(0);
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

  const showTrouble = useCallback(() => {
    setSheetTrouble(true);
    setSheetSession((n) => n + 1);
    setSheetVisible(true);
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
          showTrouble();
        });
    } else if (response.type === 'error') {
      setAuthError(`OAuth error: ${response.error?.message ?? response.params?.error_description ?? 'unknown'}`);
      showTrouble();
    } else if (response.type === 'dismiss' || response.type === 'cancel') {
      // Usually means they hit the password screen and couldn't get past it.
      showTrouble();
    }
  }, [response, request?.codeVerifier, showTrouble]);

  const startOAuth = useCallback(async () => {
    if (isPlaceholder(config.pcoClientId)) {
      console.warn('PCO client ID not configured — see app.json extra.pcoClientId');
      return;
    }
    setSheetVisible(false);
    setAuthError(null);
    // Let the sheet finish sliding away — iOS won't present the auth
    // browser while a Modal is still on screen.
    await wait(350);
    await promptAsync();
  }, [promptAsync]);

  const signIn = useCallback(async () => {
    setSheetTrouble(false);
    setSheetSession((n) => n + 1);
    setSheetVisible(true);
  }, []);

  // Help pages open in Safari / the system browser while the sheet stays put.
  // (Hiding the sheet to show the in-app browser raced the Modal's dismiss
  // animation on iOS: the browser silently failed to open and the sheet
  // popped right back with the step checked off.) When they switch back to
  // the app, the sheet is still there with their progress.
  const openHelpLink = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.warn('Could not open help link', url, e);
    }
  }, []);

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

  return (
    <Ctx.Provider value={value}>
      {children}
      <SignInSheet
        visible={sheetVisible}
        trouble={sheetTrouble}
        session={sheetSession}
        onSignIn={startOAuth}
        onOpenLink={openHelpLink}
        onClose={() => setSheetVisible(false)}
      />
    </Ctx.Provider>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
