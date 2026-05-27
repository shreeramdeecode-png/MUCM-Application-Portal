/**
 * Production portal URL (no trailing slash).
 */
export const LIVE_APP_ORIGIN = 'https://newapply.muantigua.org'

/**
 * Backend / API origin (used by `apiUrl()`).
 *
 * Set `VITE_API_BASE_URL` in the project root **`.env`** — live URL and localhost are listed there;
 * comment one and uncomment the other, then restart Vite.
 *
 * If unset: dev uses `''` (relative URLs); production build uses LIVE_APP_ORIGIN.
 */
const raw = import.meta.env.VITE_API_BASE_URL

export const API_BASE_URL = (() => {
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw.replace(/\/+$/, '')
  }
  if (import.meta.env.PROD) {
    return LIVE_APP_ORIGIN
  }
  return ''
})()

/**
 * Join API_BASE_URL with a path that starts with `/`.
 * @param {string} path - e.g. `/v1/applications`
 */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return API_BASE_URL ? `${API_BASE_URL}${p}` : p
}
