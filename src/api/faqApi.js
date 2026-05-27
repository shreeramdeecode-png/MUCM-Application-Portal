import { apiUrl } from '../config/baseUrl.js'
import { normalizeFaqRows } from '../utils/faqUtils.js'

async function readJson(response) {
  return response.json().catch(() => ({}))
}

function buildAuthHeaders(token, includeJson = false) {
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function buildApiCandidates(pathSuffix) {
  const suffix = pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`
  const prefixes = ['/api/v1', '/api', '']
  return [...new Set(prefixes)].map((prefix) => `${prefix}${suffix}`.replace(/\/+/g, '/'))
}

async function fetchWith404Fallback(candidates, options, fallbackErrorMessage) {
  let lastPayload = {}
  let lastStatus = 0

  for (const path of candidates) {
    const response = await fetch(apiUrl(path), options)
    const payload = await readJson(response)

    if (response.ok && payload.success !== false) {
      return payload
    }

    lastPayload = payload
    lastStatus = response.status
    if (response.status === 404) {
      continue
    }
    throw new Error(payload.message || fallbackErrorMessage)
  }

  if (lastStatus === 404) {
    throw new Error('Support ticket API endpoint not found. Check backend route mount and VITE_API_BASE_URL.')
  }
  throw new Error(lastPayload.message || fallbackErrorMessage)
}

export async function fetchPublishedFaqs() {
  const response = await fetch(apiUrl('/api/v1/faqs/public'))
  const payload = await readJson(response)

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Failed to load FAQs.')
  }

  return normalizeFaqRows(payload.data)
}

export async function fetchSupportTicketCategories(token) {
  const payload = await fetchWith404Fallback(
    buildApiCandidates('/support-ticket-categories'),
    {
    headers: buildAuthHeaders(token),
    },
    'Failed to load support ticket categories.',
  )

  return Array.isArray(payload.data) ? payload.data : []
}

export async function fetchMySupportTickets({ userId, token }) {
  const payload = await fetchWith404Fallback(
    buildApiCandidates(`/portal-users/${encodeURIComponent(userId)}/support-tickets`),
    {
    headers: buildAuthHeaders(token),
    },
    'Failed to load support tickets.',
  )

  return Array.isArray(payload.data) ? payload.data : []
}

export async function createSupportTicket({ userId, token, categoryId, question }) {
  const subject = String(question ?? '').trim().slice(0, 500)
  const payload = await fetchWith404Fallback(
    buildApiCandidates(`/portal-users/${encodeURIComponent(userId)}/support-tickets`),
    {
      method: 'POST',
      headers: buildAuthHeaders(token, true),
      body: JSON.stringify({
        subject,
        message: question,
        ...(categoryId ? { category_id: categoryId } : {}),
      }),
    },
    'Failed to submit support ticket.',
  )

  return payload.data || null
}
