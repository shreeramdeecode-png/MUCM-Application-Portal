export const REQUIRED_FIELD_MESSAGE = 'This field is required.'

export const DOCUMENT_UPLOAD_REQUIRED_MESSAGE = 'Please upload this document.'

/** Keys like `educationEntries__0__institution` → map for RepeatableBlock. */
export function collectRepeatableFieldErrors(fieldName, allErrors) {
  const nested = {}
  if (!fieldName || !allErrors || typeof allErrors !== 'object') {
    return nested
  }
  const prefix = `${fieldName}__`
  for (const [key, message] of Object.entries(allErrors)) {
    if (key.startsWith(prefix) && typeof message === 'string' && message) {
      nested[key] = message
    }
  }
  return nested
}

/**
 * Whether a field has no meaningful value (required-field check).
 * Keep in sync with validateField / Save & Continue in ApplicationPage.
 */
export function isFieldValueEmpty(field, value) {
  if (field?.disabled) {
    return false
  }

  switch (field.type) {
    case 'checkbox':
      return !value
    case 'yesNo': {
      const choice = typeof value === 'string' ? value.trim() : value
      return choice !== 'Yes' && choice !== 'No'
    }
    case 'tel': {
      const raw = typeof value === 'string' ? value.trim() : ''
      if (!raw) return true
      return /^\+\d{1,4}\s*$/.test(raw)
    }
    case 'file':
      return value === undefined || value === null || String(value).trim() === ''
    case 'select':
    case 'radioGroup': {
      const choice = typeof value === 'string' ? value.trim() : value
      return choice === undefined || choice === null || choice === ''
    }
    case 'repeatable':
      return !Array.isArray(value) || value.length === 0
    default: {
      const text = typeof value === 'string' ? value.trim() : value
      return text === undefined || text === null || text === ''
    }
  }
}
