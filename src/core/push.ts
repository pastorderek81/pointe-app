// Expo Push Notifications. Single API for iOS + Android — Expo's push
// service handles APNs and FCM for us.
//
// Two entry points:
//   - syncPushRegistration(): silent. Run on every app launch. If permission
//     is already granted, fetches the current Expo push token and POSTs it
//     to the proxy's /push/register so a fresh token is on file (handles
//     token rotation). Never prompts the user.
//   - requestAndRegisterPush(): interactive. Run when the user opts in via
//     Settings or the soft prompt. Prompts for permission if needed, then
//     registers.
//
// Tokens are stored server-side in Cloudflare KV; broadcasts are triggered
// via /push/broadcast (auth'd by a shared secret). See SETUP.md for the
// broadcast workflow.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { config } from '../config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function getExpoToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  await ensureAndroidChannel();
  try {
    const t = await Notifications.getExpoPushTokenAsync();
    return t.data;
  } catch {
    return null;
  }
}

async function postToBackend(token: string): Promise<void> {
  if (!config.proxyUrl) return;
  try {
    await fetch(`${config.proxyUrl}/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch {
    // Best-effort. Worker will see this token again on next launch.
  }
}

export async function getPushPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const res = await Notifications.getPermissionsAsync();
  return res.status;
}

// Silent on-launch sync. Only acts if the user has already granted
// permission. Updates the token on file so broadcasts always reach
// up-to-date devices.
export async function syncPushRegistration(): Promise<void> {
  if (!Device.isDevice) return;
  const status = await getPushPermissionStatus();
  if (status !== 'granted') return;
  const token = await getExpoToken();
  if (token) await postToBackend(token);
}

// Interactive opt-in. Returns the token if successful, null otherwise.
export async function requestAndRegisterPush(): Promise<string | null> {
  if (!Device.isDevice) return null;
  let status = await getPushPermissionStatus();
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;
  const token = await getExpoToken();
  if (token) await postToBackend(token);
  return token;
}
