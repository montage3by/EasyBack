/**
 * Utility to generate and sanitize URLs for guest access, invites, QR codes, and developer testing.
 */

export const SHARED_APP_DEFAULT_ORIGIN =
  'https://ais-pre-bbk5ncqxzlbw4tviiv4n4g-278233906253.europe-west2.run.app';

/**
 * Returns the public root domain intended for external visitors and shared players.
 */
export function getPublicBaseUrl(): string {
  if (typeof window === 'undefined') {
    return SHARED_APP_DEFAULT_ORIGIN;
  }

  const origin = window.location.origin;

  // Transform private AI Studio dev URL to public preview URL
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }

  return origin || SHARED_APP_DEFAULT_ORIGIN;
}

/**
 * Returns the current active session base URL (used for local testing by the current user).
 */
export function getCurrentSessionBaseUrl(): string {
  if (typeof window === 'undefined') {
    return SHARED_APP_DEFAULT_ORIGIN;
  }
  return window.location.origin || SHARED_APP_DEFAULT_ORIGIN;
}

/**
 * Ensures any URL string that accidentally uses ais-dev- is converted to ais-pre-
 */
export function sanitizePublicUrl(url: string): string {
  if (!url) return getPermanentGuestUrl();
  return url.replace('ais-dev-', 'ais-pre-');
}

/**
 * Public permanent guest link for sharing with friends (requires project publication via Share button).
 */
export function getPermanentGuestUrl(): string {
  const base = getPublicBaseUrl().replace(/\/+$/, '');
  return `${base}/?guest=true`;
}

/**
 * Public duel room invite link for external friends.
 */
export function getDuelInviteUrl(roomCode: string): string {
  const base = getPublicBaseUrl().replace(/\/+$/, '');
  const cleanCode = (roomCode || '').trim().toUpperCase();
  return `${base}/?room=${encodeURIComponent(cleanCode)}`;
}

/**
 * Local guest URL for developer testing in the current window/environment.
 */
export function getLocalDevGuestUrl(): string {
  const base = getCurrentSessionBaseUrl().replace(/\/+$/, '');
  return `${base}/?guest=true`;
}

/**
 * Local duel room URL for testing 2 players in developer session.
 */
export function getLocalDevDuelUrl(roomCode: string): string {
  const base = getCurrentSessionBaseUrl().replace(/\/+$/, '');
  const cleanCode = (roomCode || '').trim().toUpperCase();
  return `${base}/?room=${encodeURIComponent(cleanCode)}`;
}

/**
 * Checks whether the current user is running in the private developer workspace
 */
export function isPrivateDevEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.origin.includes('ais-dev-');
}

export interface PublicStatusResponse {
  isLive: boolean;
  statusCode: number;
  publicAppUrl: string;
  devAppUrl: string;
  needsSharePublication: boolean;
}

export async function fetchPublicStatus(): Promise<PublicStatusResponse> {
  try {
    const res = await fetch('/api/public-status');
    if (!res.ok) throw new Error('Status failed');
    return await res.json();
  } catch {
    return {
      isLive: false,
      statusCode: 404,
      publicAppUrl: SHARED_APP_DEFAULT_ORIGIN,
      devAppUrl: '',
      needsSharePublication: true,
    };
  }
}
