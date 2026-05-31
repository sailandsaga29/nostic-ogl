/** API base URL — `/api` when proxied; full URL in production (e.g. https://api.yourdomain.com/api) */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

/** Inactivity timeout before auto-logout (ms) */
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
