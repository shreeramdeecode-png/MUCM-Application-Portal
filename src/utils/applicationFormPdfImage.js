import { apiUrl } from '../config/baseUrl.js'
import { asText } from './pdfDrawHelpers.js'

function dataUrlToBytes(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/i)
  if (!match) return null
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return { bytes, mime: match[1].toLowerCase() }
}

async function fetchImageBytes(url, fetchHeaders = {}) {
  const response = await fetch(url, { headers: fetchHeaders })
  if (!response.ok) {
    throw new Error(`Could not load image (${response.status})`)
  }
  const mime = (response.headers.get('content-type') || '').toLowerCase()
  const buffer = await response.arrayBuffer()
  return { bytes: new Uint8Array(buffer), mime }
}

async function resolveImagePayload(source, fetchHeaders) {
  if (!source) return null
  if (source.startsWith('data:image')) {
    const parsed = dataUrlToBytes(source)
    if (parsed) return { kind: 'image', ...parsed }
  }
  if (/^https?:\/\//i.test(source)) {
    const fetched = await fetchImageBytes(source, fetchHeaders)
    return { kind: 'image', ...fetched }
  }

  const looksLikeImage = /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(source)
  if (looksLikeImage) {
    const path = source.startsWith('/') ? source : `/${source}`
    const fetched = await fetchImageBytes(apiUrl(path), fetchHeaders)
    return { kind: 'image', ...fetched }
  }

  return null
}

/**
 * Resolve passport photo bytes from form value, API document list, or URL.
 */
export async function loadPassportPhotoPayload(formValues, options = {}) {
  const fetchHeaders = options.fetchHeaders ?? {}
  const uploadedDocuments = options.uploadedDocuments ?? []

  const candidates = [
    asText(formValues?.passportPhoto),
    ...uploadedDocuments
      .filter((d) => d.key === 'passport_photo' || d.formKey === 'passportPhoto')
      .flatMap((d) => [asText(d.url), asText(d.value)]),
  ].filter(Boolean)

  for (const source of candidates) {
    try {
      const payload = await resolveImagePayload(source, fetchHeaders)
      if (payload) return payload
    } catch {
      // try next source
    }
  }

  return null
}

async function loadReviewSignaturePayload(v, fetchHeaders) {
  const method = asText(v.reviewSignatureMethod).toLowerCase()
  const upload = asText(v.reviewSignatureUpload)
  const typed = asText(v.reviewSignatureTyped)

  if (method === 'upload' || upload) {
    const imagePayload = await resolveImagePayload(upload, fetchHeaders)
    if (imagePayload) return imagePayload
  }

  if (typed) {
    return { kind: 'typed', text: typed }
  }

  return null
}

async function loadStudentSignaturePayload(v, fetchHeaders) {
  const method = asText(v.studentSignatureMethod).toLowerCase()
  const upload = asText(v.studentSignatureUpload)
  const typed = asText(v.studentSignatureTyped)

  if (method === 'upload' || upload) {
    const imagePayload = await resolveImagePayload(upload, fetchHeaders)
    if (imagePayload) return imagePayload
  }

  if (typed) {
    return { kind: 'typed', text: typed }
  }

  return null
}

/**
 * Resolve applicant signature for PDF overlay (upload image or typed script name).
 * Prefers Review & Submit signature, then financial-step signature.
 */
export async function loadSignaturePayload(formValues, options = {}) {
  const fetchHeaders = options.fetchHeaders ?? {}
  const v = formValues ?? {}

  const reviewPayload = await loadReviewSignaturePayload(v, fetchHeaders)
  if (reviewPayload) return reviewPayload

  return loadStudentSignaturePayload(v, fetchHeaders)
}
