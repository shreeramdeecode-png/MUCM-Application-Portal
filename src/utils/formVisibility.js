import { isTransferMdProgram } from './programTypes.js'

function matchCondition(condition, values) {
  const value = values[condition.field]
  if (condition.equals !== undefined) {
    return value === condition.equals
  }
  if (condition.notEquals !== undefined) {
    return value !== condition.notEquals
  }
  if (condition.notIn) {
    return !condition.notIn.includes(value)
  }
  if (condition.anyOf) {
    return condition.anyOf.includes(value)
  }
  return true
}

export function isFieldVisible(field, values) {
  if (!field.showWhen) {
    return true
  }
  const { showWhen: w } = field
  if (w.and) {
    return w.and.every((c) => matchCondition(c, values))
  }
  if (w.or) {
    return w.or.some((c) => matchCondition(c, values))
  }
  return matchCondition(w, values)
}

export function normalizeSelectOptions(options) {
  if (!options?.length) {
    return []
  }
  if (typeof options[0] === 'object' && options[0] !== null && 'value' in options[0]) {
    return options
  }
  return options.map((option) => ({ value: option, label: option }))
}

export function getSelectValues(options) {
  return normalizeSelectOptions(options).map((o) => String(o.value))
}

export function rowHasValues(row) {
  if (!row || typeof row !== 'object') return false
  return Object.values(row).some(
    (value) => value !== undefined && value !== null && String(value).trim() !== '',
  )
}

/** Repeatable rows that contain at least one non-empty sub-field. */
export function getRepeatableDisplayRows(field, values) {
  const items = Array.isArray(values?.[field.name]) ? values[field.name] : []
  return items.filter(rowHasValues)
}

/**
 * Read-only review / PDF visibility: normal rules, plus saved repeatables (e.g. transfer credits)
 * when programType codes from the API do not match static showWhen anyOf lists.
 */
export function isFieldVisibleForSubmissionReview(field, values, options = {}) {
  if (field.type === 'note' || String(field.name ?? '').startsWith('__')) {
    return false
  }
  if (isFieldVisible(field, values)) {
    return true
  }

  const programOptions = options.programOptions ?? []

  if (field.name === 'transferCredits') {
    if (isTransferMdProgram(values?.programType, programOptions)) {
      return true
    }
    return getRepeatableDisplayRows(field, values).length > 0
  }

  if (field.type === 'repeatable' && getRepeatableDisplayRows(field, values).length > 0) {
    return true
  }

  return false
}
