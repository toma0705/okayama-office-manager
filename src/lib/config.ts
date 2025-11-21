const DEFAULT_DEV_BASE_URL = 'http://localhost:3000/api';
const DEFAULT_PROD_BASE_URL = '/api';

const resolveBrowserBaseUrl = () => {
  if (typeof window === 'undefined') return undefined;
  try {
    return `${window.location.origin}/api`;
  } catch {
    return undefined;
  }
};

const normalizeBaseUrl = (value: string) => value.replace(/\/$/, '');

const resolveEnvBaseUrl = () => {
  const explicit =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_BASE_URL;
  if (explicit) {
    return normalizeBaseUrl(explicit);
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api`;
  }

  if (process.env.NODE_ENV === 'development') {
    return DEFAULT_DEV_BASE_URL;
  }

  return DEFAULT_PROD_BASE_URL;
};

export const API_BASE_URL = resolveBrowserBaseUrl() ?? resolveEnvBaseUrl();

export const apiUrl = (path: string) =>
  `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
