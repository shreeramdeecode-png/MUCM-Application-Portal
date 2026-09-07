import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ApplicationPage from '../pages/ApplicationPage.jsx'
import BeforeYouBeginPage from '../pages/BeforeYouBeginPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import ProfilePage from '../pages/ProfilePage.jsx'
import SettingsPage from '../pages/SettingsPage.jsx'
import SubmittedApplicationsPage from '../pages/SubmittedApplicationsPage.jsx'
import { usePersistentState } from '../hooks/usePersistentState.js'
import { apiUrl } from '../config/baseUrl.js'
import {
  AUTH_SESSION_STORAGE_KEY,
  clearAuthSession,
  isAuthSessionValid,
  isTokenExpired,
  shouldSkipBeforeYouBegin,
} from '../utils/applicantStorageKeys.js'

/** How often to re-check the stored token's expiry while the app is open in a tab. */
const SESSION_EXPIRY_CHECK_MS = 60 * 1000

function AuthenticatedHomeRedirect({ authSession }) {
  const sessionPayload = {
    email: authSession.email,
    token: authSession.token,
    userId: authSession.userId,
  }
  const target = shouldSkipBeforeYouBegin(sessionPayload) ? '/application' : '/before-you-begin'
  return <Navigate to={target} replace />
}

function AppRouter() {
  const [authSession, setAuthSession] = usePersistentState(AUTH_SESSION_STORAGE_KEY, {
    isAuthenticated: false,
    email: '',
    token: '',
    userId: '',
  })
  const authPrefixRef = useRef(import.meta.env.VITE_AUTH_PREFIX || '/api/auth')
  const isAuthenticated = isAuthSessionValid(authSession)

  // Force logout as soon as the stored token expires, whether that happens while the tab is
  // open (poll) or was already true from a previous visit (checked once on mount).
  useEffect(() => {
    if (!authSession.isAuthenticated) return undefined

    function checkExpiry() {
      if (isTokenExpired(authSession.token)) {
        clearAuthSession(authSession)
        setAuthSession({ isAuthenticated: false, email: '', token: '', userId: '' })
      }
    }

    checkExpiry()
    const intervalId = window.setInterval(checkExpiry, SESSION_EXPIRY_CHECK_MS)
    return () => window.clearInterval(intervalId)
  }, [authSession, setAuthSession])

  function getAuthPaths(endpoint) {
    const preferredPrefix = authPrefixRef.current || '/api/auth'
    const candidates = [preferredPrefix, '/api/auth', '/auth', '']
    const uniquePrefixes = [...new Set(candidates)]
    return uniquePrefixes.map((prefix) =>
      prefix ? `${prefix}/${endpoint}`.replace(/\/+/g, '/') : `/${endpoint}`,
    )
  }

  async function postAuthEndpoint(endpoint, body, fallbackErrorMessage) {
    let lastError = null

    for (const path of getAuthPaths(endpoint)) {
      let response
      let payload = {}
      try {
        response = await fetch(apiUrl(path), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        payload = await response.json().catch(() => ({}))
      } catch {
        throw new Error(
          'API server is unreachable. Start your backend server and verify VITE_API_BASE_URL in .env.',
        )
      }

      if (response.ok && payload.success !== false) {
        authPrefixRef.current = path.slice(0, -(`/${endpoint}`.length)) || ''
        return payload
      }

      // Keep trying alternative mount paths when the endpoint is not found.
      if (response.status === 404) {
        lastError = new Error(payload.message || fallbackErrorMessage)
        continue
      }

      throw new Error(payload.message || fallbackErrorMessage)
    }

    throw lastError || new Error(fallbackErrorMessage)
  }

  async function handleRequestOtp(email) {
    await postAuthEndpoint(
      'request-otp',
      { email: email.trim().toLowerCase() },
      'Failed to send OTP. Please try again.',
    )
  }

  async function handleLogin(email, otp) {
    const normalizedEmail = email.trim().toLowerCase()
    const payload = await postAuthEndpoint(
      'verify-otp',
      { email: normalizedEmail, otp: otp.trim() },
      'Invalid OTP. Please try again.',
    )

    const token = payload.token || payload.data?.token || payload.accessToken || ''
    const userId = payload.data?.user?.id || payload.user?.id || ''
    const nextSession = { isAuthenticated: true, email: normalizedEmail, token, userId }
    setAuthSession(nextSession)
    return nextSession
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <AuthenticatedHomeRedirect authSession={authSession} />
          ) : (
            <LoginPage
              onRequestOtp={handleRequestOtp}
              onLogin={handleLogin}
            />
          )
        }
      />
      <Route
        path="/login"
        element={
          <LoginPage
            onRequestOtp={handleRequestOtp}
            onLogin={handleLogin}
          />
        }
      />
      <Route
        path="/before-you-begin"
        element={
          isAuthenticated ? (
            <BeforeYouBeginPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/application"
        element={
          isAuthenticated ? (
            <ApplicationPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/profile"
        element={
          isAuthenticated ? (
            <ProfilePage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/settings"
        element={
          isAuthenticated ? (
            <SettingsPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/submitted-applications"
        element={
          isAuthenticated ? (
            <SubmittedApplicationsPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <AuthenticatedHomeRedirect authSession={authSession} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  )
}

export default AppRouter
