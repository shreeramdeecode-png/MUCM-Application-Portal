/** Map file extensions (with leading dot) to short display labels */
const EXT_LABEL = {
  '.pdf': 'PDF',
  '.jpg': 'JPEG',
  '.jpeg': 'JPEG',
  '.png': 'PNG',
  '.doc': 'DOC',
  '.docx': 'DOCX',
}

/**
 * Human-readable list from an HTML accept string, e.g. ".pdf,.jpg,.jpeg" → "PDF, JPEG"
 */
export function formatAcceptLabels(accept) {
  if (!accept || typeof accept !== 'string') {
    return 'PDF, JPEG, PNG'
  }
  const seen = new Set()
  const labels = []
  for (const raw of accept.split(',')) {
    const ext = raw.trim().toLowerCase()
    if (!ext) continue
    const label = EXT_LABEL[ext] ?? ext.replace(/^\./, '').toUpperCase()
    if (seen.has(label)) continue
    seen.add(label)
    labels.push(label)
  }
  return labels.length > 0 ? labels.join(', ') : 'PDF, JPEG, PNG'
}
