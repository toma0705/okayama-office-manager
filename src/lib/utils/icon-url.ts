// Prefer the public NEXT env var so this works in the browser bundle too
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;

/**
 * Normalize icon URL to an absolute public URL on R2 when possible.
 * Behaviors:
 * - `user-icons/...` or `/user-icons/...` -> `${R2_PUBLIC_URL}/user-icons/...`
 * - Already-R2 URLs are returned as-is; if missing `user-icons/` but filename
 *   looks like a UUID image, `user-icons/` is inserted.
 */
export function convertIconUrl(url?: string | null): string {
  if (!url) return '';
  if (!R2_PUBLIC_URL) return url;

  // Storage path like 'user-icons/...' or '/user-icons/...'
  if (url.startsWith('/user-icons/') || url.startsWith('user-icons/')) {
    const path = url.replace(/^\/+/, '');
    return `${R2_PUBLIC_URL}/${path}`;
  }

  // Already an R2 URL
  if (url.startsWith(R2_PUBLIC_URL)) {
    if (url.includes('/user-icons/')) return url;
    const rest = url.slice(R2_PUBLIC_URL.length).replace(/^\/+/, '');
    const uuidImageRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.(jpg|jpeg|png|gif|webp)$/i;
    if (uuidImageRe.test(rest)) {
      return `${R2_PUBLIC_URL}/user-icons/${rest}`;
    }
    return url;
  }

  return url;
}
