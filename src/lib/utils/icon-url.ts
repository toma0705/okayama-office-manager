// Public base URL for R2
// Prefer the client-exposed env var so this works in browser bundles
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || '';

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

  // If this is a storage public URL (storage/v1/object/public), rewrite to R2 public URL so next/image host check passes
  const rewritten = rewriteStoragePublicToR2(url);
  if (rewritten) return rewritten;

  // Storage path like 'user-icons/...' or '/user-icons/...'
  if (url.startsWith('/user-icons/') || url.startsWith('user-icons/')) {
    const path = url.replace(/^\/+/, '');
    return `${R2_PUBLIC_URL}/${path}`;
  }

  // Already an R2 URL
  if (url.startsWith(R2_PUBLIC_URL)) {
    if (url.includes('/user-icons/')) return url;
    const rest = url.slice(R2_PUBLIC_URL.length).replace(/^\/+/, '');
    const uuidImageRe =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.(jpg|jpeg|png|gif|webp)$/i;
    if (uuidImageRe.test(rest)) {
      return `${R2_PUBLIC_URL}/user-icons/${rest}`;
    }
    return url;
  }

  return url;
}

// Rewrite public storage URLs (path contains `/storage/v1/object/public/`) to R2 public URL when possible
// Example URL:
// https://<host>/storage/v1/object/public/<bucket>/user-icons/<file>
export function rewriteStoragePublicToR2(url?: string | null): string | null {
  if (!url || !R2_PUBLIC_URL) return null;
  try {
    const u = new URL(url);
    if (u.pathname.includes('/storage/v1/object/public/')) {
      const parts = u.pathname.split('/');
      const idx = parts.indexOf('user-icons');
      if (idx !== -1) {
        const rest = parts.slice(idx).join('/');
        return `${R2_PUBLIC_URL}/${rest}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}
