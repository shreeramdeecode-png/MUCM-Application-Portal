function toCleanString(value) {
  return String(value ?? '').trim()
}

function toPlainText(value) {
  return toCleanString(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function readArray(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function normalizeFaqRow(row) {
  const contextStepKeys = [
    ...readArray(row?.context_steps),
    ...readArray(row?.form_steps),
    ...readArray(row?.step_contexts),
  ]
    .map((value) => toCleanString(value))
    .filter(Boolean)

  return {
    id: row?.id,
    question: toCleanString(row?.question),
    answer: toCleanString(row?.answer),
    category: toCleanString(row?.faq_category?.name || row?.category) || 'General',
    active: row?.is_published !== false,
    sortOrder: Number(row?.sort_order ?? 0),
    contextSteps: [...new Set(contextStepKeys)],
  }
}

export function normalizeFaqRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(normalizeFaqRow)
    .filter((item) => item.question && item.answer && item.active)
}

export function filterFaqsByContext(rows, currentStepId) {
  const safeStep = toCleanString(currentStepId).toLowerCase()
  return rows.filter((item) => {
    if (!Array.isArray(item.contextSteps) || item.contextSteps.length === 0) return true
    if (!safeStep) return false
    return item.contextSteps.some((step) => step.toLowerCase() === safeStep)
  })
}

export function searchFaqRows(rows, searchTerm) {
  const needle = toCleanString(searchTerm).toLowerCase()
  if (!needle) return rows
  return rows.filter((item) => {
    const source = `${item.question} ${toPlainText(item.answer)} ${item.category}`.toLowerCase()
    return source.includes(needle)
  })
}

export function groupFaqRowsByCategory(rows) {
  const grouped = new Map()
  rows.forEach((item) => {
    if (!grouped.has(item.category)) grouped.set(item.category, [])
    grouped.get(item.category).push(item)
  })
  return Array.from(grouped.entries()).map(([title, items]) => ({
    title,
    items: [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.question.localeCompare(b.question)),
  }))
}

export function sanitizeFaqHtml(html) {
  const raw = toCleanString(html)
  if (!raw) return ''
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return raw
  }

  const parser = new window.DOMParser()
  const doc = parser.parseFromString(raw, 'text/html')
  const allowedTags = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'A'])

  const walk = (node) => {
    const children = Array.from(node.childNodes)
    children.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child
        if (!allowedTags.has(el.tagName)) {
          el.replaceWith(...Array.from(el.childNodes))
          return
        }
        Array.from(el.attributes).forEach((attribute) => {
          if (el.tagName === 'A' && attribute.name === 'href') return
          el.removeAttribute(attribute.name)
        })
        if (el.tagName === 'A') {
          const href = toCleanString(el.getAttribute('href'))
          if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) {
            el.removeAttribute('href')
          } else {
            el.setAttribute('target', '_blank')
            el.setAttribute('rel', 'noopener noreferrer')
          }
        }
      }
      walk(child)
    })
  }

  walk(doc.body)
  return doc.body.innerHTML
}
