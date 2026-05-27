import { rgb } from 'pdf-lib'

export const PDF_INK = rgb(18 / 255, 24 / 255, 34 / 255)
export const PDF_MARK = rgb(10 / 255, 22 / 255, 40 / 255)
export const A4_HEIGHT = 841.8897705078125
const TEXT_SIZE = 8.5
const TEXT_PAD_X = 4
const LINE_ABOVE_OFFSET = 1.5
const BOX_ABOVE_OFFSET = 2.5

export function asText(value) {
  if (value == null) return ''
  return String(value).trim()
}

export function pdfY(fitzBaseline, extra = 0) {
  return A4_HEIGHT - (fitzBaseline + extra)
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function fitTextToWidth(text, font, size, maxWidth) {
  const value = asText(text)
  if (!value) return ''
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value
  const ellipsis = '…'
  let low = 0
  let high = value.length
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    const candidate = `${value.slice(0, mid)}${ellipsis}`
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      low = mid
    } else {
      high = mid - 1
    }
  }
  return `${value.slice(0, low)}${ellipsis}`
}

/** Resolve text baseline: box fields sit inside the box; line fields sit on the underline. */
export function slotBaseline(slot, size = TEXT_SIZE) {
  if (slot.kind === 'line') {
    const lineY = slot.line ?? slot.base
    return lineY - LINE_ABOVE_OFFSET
  }
  if (slot.kind === 'box' && slot.y1 != null) {
    return slot.y1 - (size + BOX_ABOVE_OFFSET)
  }
  if (slot.base != null) return slot.base
  if (slot.y1 != null) return slot.y1 - (size + BOX_ABOVE_OFFSET)
  return slot.base ?? 0
}

export function drawMark(page, cx, cy, font, size = 8) {
  const mark = 'X'
  const w = font.widthOfTextAtSize(mark, size)
  page.drawText(mark, {
    x: cx - w / 2,
    y: pdfY(cy, -1),
    size,
    font,
    color: PDF_MARK,
  })
}

export function drawFieldValue(page, text, fitzX, fitzBaseline, font, size, maxWidth) {
  const fitted = fitTextToWidth(text, font, size, maxWidth)
  if (!fitted) return
  page.drawText(fitted, {
    x: fitzX,
    y: pdfY(fitzBaseline, 0),
    size,
    font,
    color: PDF_INK,
  })
}

/** Overlay text on the template without erasing underlying artwork. */
export function drawInSlot(page, text, slot, font, size = TEXT_SIZE) {
  const value = asText(text)
  if (!value) return
  const maxWidth = slot.x1 - slot.x0 - TEXT_PAD_X * 2
  drawFieldValue(page, value, slot.x0 + TEXT_PAD_X, slotBaseline(slot, size), font, size, maxWidth)
}

/** Multiline overlay inside a box region. */
export function drawMultilineInSlot(page, text, slot, font, size = TEXT_SIZE, maxLines = 3) {
  const raw = asText(text)
  if (!raw) return
  const maxWidth = slot.x1 - slot.x0 - TEXT_PAD_X * 2
  const lineGap = size + 3
  const startBase =
    slot.kind === 'box' && slot.y0 != null ? slot.y0 + size + 4 : slotBaseline(slot, size)
  const words = raw.split(/\s+/)
  const lines = []
  let current = ''
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  })
  if (current) lines.push(current)
  lines.slice(0, maxLines).forEach((line, index) => {
    drawFieldValue(page, line, slot.x0 + TEXT_PAD_X, startBase + index * lineGap, font, size, maxWidth)
  })
}

export async function drawPassportPhotoInBox(page, pdfDoc, box, payload) {
  if (!payload?.bytes?.length) return

  const { bytes, mime = '' } = payload
  let image
  try {
    image = mime.includes('png') ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
  } catch {
    try {
      image = await pdfDoc.embedPng(bytes)
    } catch {
      image = await pdfDoc.embedJpg(bytes)
    }
  }

  const boxW = box.x1 - box.x0
  const boxH = box.y1 - box.y0
  const scale = Math.min(boxW / image.width, boxH / image.height)
  const w = image.width * scale
  const h = image.height * scale
  const x = box.x0 + (boxW - w) / 2
  const fitzTop = box.y0 + (boxH - h) / 2

  page.drawImage(image, {
    x,
    y: pdfY(fitzTop, 0) - h,
    width: w,
    height: h,
  })
}

export function formatDatePdf(value) {
  const s = asText(value)
  if (!s) return ''
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  return s
}

export function formatMonthPdf(value) {
  const s = asText(value)
  if (!s) return ''
  const m = s.match(/^(\d{4})-(\d{2})/)
  if (m) return `${m[2]}/${m[1]}`
  return s
}

export function joinParts(...parts) {
  return parts.map(asText).filter(Boolean).join(', ')
}

export function applicantFullName(values) {
  return joinParts(values.firstName, values.middleName, values.surname)
}

export function resolveProgramLabel(programType, programOptions = []) {
  const code = asText(programType)
  if (!code) return ''
  const match = programOptions.find((o) => asText(o.value) === code)
  return asText(match?.label) || code
}

export function hasUploadedValue(value) {
  if (value == null || value === '') return false
  if (typeof value === 'boolean') return value
  const s = asText(value)
  if (!s) return false
  if (s.startsWith('data:')) return true
  if (/^https?:\/\//i.test(s)) return true
  if (s.includes('/') || s.includes('\\')) return true
  return true
}
