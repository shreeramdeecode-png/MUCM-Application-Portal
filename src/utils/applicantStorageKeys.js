export const AUTH_SESSION_STORAGE_KEY = 'mucm-auth-session'

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4 || 4)) % 4)}`
    const json = window.atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

function decodeJwtSub(token) {
  return String(decodeJwtPayload(token)?.sub ?? '').trim()
}

/** True when the JWT carries an `exp` claim that has already passed. Tokens without `exp` are treated as non-expiring here. */
export function isTokenExpired(token) {
  const exp = decodeJwtPayload(token)?.exp
  if (!Number.isFinite(exp)) return false
  return Date.now() >= exp * 1000
}

/** A session only counts as authenticated when it has a token and that token has not expired. */
export function isAuthSessionValid(session = {}) {
  const token = String(session?.token ?? '').trim()
  return Boolean(session?.isAuthenticated && token && !isTokenExpired(token))
}

export function readAuthSession() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

/**
 * Single source of truth for logging out: clears the auth session, tab-scoped hydration
 * flags, and the support-center tab preference. Draft/application progress is kept so the
 * same applicant sees it again after logging back in (scoped storage keeps accounts isolated).
 */
export function clearAuthSession(session = readAuthSession()) {
  if (typeof window === 'undefined') return
  const scope = getApplicantStorageScope(session)
  clearApplicantHydrationSessionFlags(scope)
  clearJustSubmitted()
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
  window.localStorage.removeItem('mucm-support-center-tab')
}

/**
 * Stable id for namespacing applicant-specific localStorage (draft form, submissions snapshot).
 * Prefer normalized email (always present after OTP login) so the same person hits the same keys every session.
 * Fall back to backend user id, then JWT sub.
 */
export function getApplicantStorageScope(session = {}) {
  const email = String(session.email ?? '').trim().toLowerCase()
  if (email) return email

  const uid = String(session.userId ?? '').trim() || String(session.id ?? '').trim()
  if (uid) return uid

  const sub = decodeJwtSub(String(session.token ?? '').trim())
  if (sub) return sub

  return 'anonymous'
}

/**
 * If drafts were saved under userId/JWT scope (older logic), copy them to email-scoped keys once.
 * Also lifts unscoped legacy keys into email scope when still empty.
 */
export function migrateApplicantDraftStorage(session = {}) {
  const email = String(session.email ?? '').trim().toLowerCase()
  if (!email || typeof window === 'undefined') return

  const token = String(session.token ?? '').trim()
  const uid = String(session.userId ?? '').trim() || String(session.id ?? '').trim()
  const sub = decodeJwtSub(token)

  const targetForm = draftFormStorageKey(email)
  if (window.localStorage.getItem(targetForm)) return

  const sourceScopes = [...new Set([uid, sub].filter(Boolean))]
  for (const scope of sourceScopes) {
    const rawForm = window.localStorage.getItem(draftFormStorageKey(scope))
    if (!rawForm) continue

    window.localStorage.setItem(targetForm, rawForm)

    const rawStep = window.localStorage.getItem(draftStepStorageKey(scope))
    if (rawStep) window.localStorage.setItem(draftStepStorageKey(email), rawStep)

    const rawAct = window.localStorage.getItem(activeApplicationStorageKey(scope))
    if (rawAct) window.localStorage.setItem(activeApplicationStorageKey(email), rawAct)

    const rawSubmissions = window.localStorage.getItem(submissionsStorageKey(scope))
    if (rawSubmissions) window.localStorage.setItem(submissionsStorageKey(email), rawSubmissions)
    break
  }

  if (!window.localStorage.getItem(targetForm)) {
    const legacyForm = window.localStorage.getItem('mucm-application-form')
    if (legacyForm) {
      window.localStorage.setItem(targetForm, legacyForm)
      const legacyStep = window.localStorage.getItem('mucm-current-step')
      if (legacyStep) window.localStorage.setItem(draftStepStorageKey(email), legacyStep)
      const legacyAct = window.localStorage.getItem('mucm-active-application')
      if (legacyAct) window.localStorage.setItem(activeApplicationStorageKey(email), legacyAct)
    }
  }
}

export function draftFormStorageKey(scope) {
  return `mucm-application-form:${scope}`
}

export function draftStepStorageKey(scope) {
  return `mucm-current-step:${scope}`
}

export function activeApplicationStorageKey(scope) {
  return `mucm-active-application:${scope}`
}

export function submissionsStorageKey(scope) {
  return `mucm-submitted-applications:${scope}`
}

export function beforeYouBeginSeenStorageKey(scope) {
  return `mucm-before-you-begin-seen:${scope}`
}

/** Call when the applicant clicks through from Before You Begin (so future logins skip it). */
export function markBeforeYouBeginSeen(session = {}) {
  const scope = getApplicantStorageScope(session)
  try {
    window.localStorage.setItem(beforeYouBeginSeenStorageKey(scope), '1')
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Returning applicants: draft in progress, active application row, step beyond first,
 * or they already dismissed Before You Begin once for this account.
 */
export function shouldSkipBeforeYouBegin(session = {}) {
  const email = String(session.email ?? '').trim().toLowerCase()
  const token = String(session.token ?? '').trim()
  if (!email && !token) return false

  migrateApplicantDraftStorage(session)

  const scope = getApplicantStorageScope(session)

  try {
    if (window.localStorage.getItem(beforeYouBeginSeenStorageKey(scope)) === '1') {
      return true
    }

    const activeRaw = window.localStorage.getItem(activeApplicationStorageKey(scope))
    if (activeRaw) {
      const active = JSON.parse(activeRaw)
      if (String(active?.id ?? '').trim() || String(active?.applicationId ?? '').trim()) {
        return true
      }
    }

    const stepRaw = window.localStorage.getItem(draftStepStorageKey(scope))
    if (stepRaw) {
      const step = JSON.parse(stepRaw)
      const n = typeof step === 'number' ? step : Number.parseInt(String(step), 10)
      if (Number.isFinite(n) && n > 0) return true
    }

    const formRaw = window.localStorage.getItem(draftFormStorageKey(scope))
    if (formRaw) {
      const form = JSON.parse(formRaw)
      if (form && typeof form === 'object') {
        const touched = [
          'firstName',
          'surname',
          'email',
          'phoneMobile',
          'citizenship',
          'title',
          'contactName',
        ].some((k) => String(form[k] ?? '').trim())
        if (touched) return true
      }
    }
  } catch {
    return false
  }

  return false
}

const LEGACY_DRAFT_KEYS = ['mucm-application-form', 'mucm-current-step', 'mucm-active-application']

/** Remove local draft progress for this applicant (scoped + legacy draft keys). Submissions archive is kept. */
export function clearApplicantLocalDrafts(session = {}) {
  const scope = getApplicantStorageScope(session)
  window.localStorage.removeItem(draftFormStorageKey(scope))
  window.localStorage.removeItem(draftStepStorageKey(scope))
  window.localStorage.removeItem(activeApplicationStorageKey(scope))
  window.localStorage.removeItem(beforeYouBeginSeenStorageKey(scope))
  LEGACY_DRAFT_KEYS.forEach((k) => window.localStorage.removeItem(k))
}

const JUST_SUBMITTED_STORAGE_KEY = 'mucm-just-submitted'
/** How long after submit we restore the success screen on reload (same browser tab). */
export const JUST_SUBMITTED_DISPLAY_MS = 30 * 60 * 1000

export function markJustSubmitted(scope) {
  if (!scope || typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(
      JUST_SUBMITTED_STORAGE_KEY,
      JSON.stringify({ scope: String(scope), at: Date.now() }),
    )
  } catch {
    // ignore
  }
}

export function clearJustSubmitted() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(JUST_SUBMITTED_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function readJustSubmitted(scope) {
  if (!scope || typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(JUST_SUBMITTED_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (String(parsed?.scope ?? '') !== String(scope)) return null
    const at = Number(parsed?.at)
    if (!Number.isFinite(at) || Date.now() - at > JUST_SUBMITTED_DISPLAY_MS) {
      window.sessionStorage.removeItem(JUST_SUBMITTED_STORAGE_KEY)
      return null
    }
    return { at }
  } catch {
    return null
  }
}

/** Allow server re-hydration after logout/login (tab session flags only). */
export function clearApplicantHydrationSessionFlags(scope) {
  const prefix = `mucm-hydrated:${scope}:`
  try {
    for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
      const k = window.sessionStorage.key(i)
      if (k && k.startsWith(prefix)) {
        window.sessionStorage.removeItem(k)
      }
    }
  } catch {
    // ignore
  }
}
