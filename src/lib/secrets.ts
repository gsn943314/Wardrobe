import * as SecureStore from 'expo-secure-store';

const DECART_KEY = 'decart-api-key';

/**
 * Demo-only: the key lives in the phone's secure storage and is sent straight to Decart.
 * A public release should mint short-lived client tokens on a server instead.
 */
export async function getDecartKey(): Promise<string | undefined> {
  try {
    return (await SecureStore.getItemAsync(DECART_KEY)) ?? undefined;
  } catch {
    // Secure storage is unavailable on web previews; behave as "no key" (demo mode).
    return undefined;
  }
}

export async function setDecartKey(key: string): Promise<void> {
  if (key.trim()) await SecureStore.setItemAsync(DECART_KEY, key.trim());
  else await SecureStore.deleteItemAsync(DECART_KEY);
}
