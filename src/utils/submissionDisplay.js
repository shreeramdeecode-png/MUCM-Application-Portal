import { normalizeSelectOptions } from './formVisibility.js'

/**
 * Human-readable value for a single form field (read-only), aligned with StepForm review.
 */
export function getSingleFieldDisplayValue(field, rawValue) {
  if (field.type === 'text' && field.signaturePreview) {
    if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
      return 'Not provided'
    }
    return 'Typed signature on file'
  }

  if (field.type === 'file') {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return 'Not uploaded'
    }
    if (typeof rawValue === 'string' && (rawValue.startsWith('data:image/') || /signature/i.test(String(field.name ?? '')))) {
      return 'Signature image attached'
    }
    return String(rawValue)
  }

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return 'Not provided'
  }

  if (field.type === 'checkbox') {
    return rawValue ? 'Yes' : 'No'
  }

  if (field.type === 'select' || field.type === 'radioGroup') {
    const normalized = normalizeSelectOptions(field.options ?? [])
    const match = normalized.find((opt) => String(opt.value) === String(rawValue))
    return match?.label ?? String(rawValue)
  }

  return String(rawValue)
}
