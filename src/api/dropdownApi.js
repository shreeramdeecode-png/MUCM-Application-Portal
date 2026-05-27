import { apiUrl } from '../config/baseUrl.js'

async function readJson(response) {
  return response.json().catch(() => ({}))
}

export async function fetchDropdownCategories() {
  try {
    const response = await fetch(apiUrl('/api/v1/public/dropdown-categories'))
    const payload = await readJson(response)
    if (!response.ok || payload.success === false) {
      console.warn('Failed to load dropdown categories:', payload.message)
      return []
    }
    return Array.isArray(payload.data) ? payload.data : []
  } catch (error) {
    console.error('Error fetching dropdown categories:', error)
    return []
  }
}

export async function fetchPrograms() {
  try {
    const response = await fetch(apiUrl('/api/v1/public/programs'))
    const payload = await readJson(response)
    if (!response.ok || payload.success === false) {
      console.warn('Failed to load programs:', payload.message)
      return []
    }
    return Array.isArray(payload.data) ? payload.data : []
  } catch (error) {
    console.error('Error fetching programs:', error)
    return []
  }
}

export async function fetchDocumentRequirements() {
  try {
    const response = await fetch(apiUrl('/api/v1/public/document-requirements'))
    const payload = await readJson(response)
    if (!response.ok || payload.success === false) {
      console.warn('Failed to load document requirements:', payload.message)
      return []
    }
    return Array.isArray(payload.data) ? payload.data : []
  } catch (error) {
    console.error('Error fetching document requirements:', error)
    return []
  }
}
