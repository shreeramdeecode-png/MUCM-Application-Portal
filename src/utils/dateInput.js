/** @param {string} iso YYYY-MM-DD */
export function isoToDDMMYYYY(iso) {
  if (!iso || typeof iso !== 'string') return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ''
  return `${m[3]}/${m[2]}/${m[1]}`
}

/**
 * @param {string} str
 * @returns {string} YYYY-MM-DD, or '' if empty, or null if invalid
 */
export function parseDDMMYYYYToIso(str) {
  const trimmed = str.trim()
  if (!trimmed) return ''

  const isoDirect = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDirect) {
    const y = Number(isoDirect[1])
    const mo = Number(isoDirect[2])
    const d = Number(isoDirect[3])
    const dt = new Date(y, mo - 1, d)
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const dt = new Date(year, month - 1, day)
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Formats raw input as DD/MM/YYYY while typing: strips non-digits, inserts / after day and month.
 * @param {string} raw
 */
export function formatTypingToDDMMYYYY(raw) {
  const digits = String(raw).replace(/\D/g, '').slice(0, 8)
  if (digits.length === 0) return ''

  if (digits.length <= 2) {
    return digits.length === 2 ? `${digits}/` : digits
  }

  const day = digits.slice(0, 2)
  const afterDay = digits.slice(2)

  if (afterDay.length <= 2) {
    if (afterDay.length === 2) {
      return `${day}/${afterDay}/`
    }
    return `${day}/${afterDay}`
  }

  const month = digits.slice(2, 4)
  const year = digits.slice(4)
  return `${day}/${month}/${year}`
}
