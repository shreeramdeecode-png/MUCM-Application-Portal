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
      if (source.startsWith('data:image')) {
        const parsed = dataUrlToBytes(source)
        if (parsed) return parsed
      }
      if (/^https?:\/\//i.test(source)) {
        return await fetchImageBytes(source, fetchHeaders)
      }
    } catch {
      // try next source
    }
  }

  return null
}
