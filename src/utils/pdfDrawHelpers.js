import { rgb } from 'pdf-lib'

export const PDF_INK = rgb(18 / 255, 24 / 255, 34 / 255)
export const PDF_MARK = rgb(10 / 255, 22 / 255, 40 / 255)
/** Matches the redesigned form paper fill */
export const PDF_PAPER = rgb(1, 1, 1)
/** Grid / cell border lines on the redesigned application template */
export const PDF_GRID_LINE = rgb(0.62, 0.66, 0.72)
export const A4_HEIGHT = 841.8897705078125
const TEXT_SIZE = 8.5
const TEXT_PAD_X = 4
/** Distance above underline (Fitz y↓) for single-line values */
const LINE_ABOVE_OFFSET = 2.5
/** Space below top of address boxes where labels are printed inside the cell */
const BOX_LABEL_RESERVE = 24

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

/**
 * Resolve Fitz baseline for overlay text.
 * Line fields: sit just above the underline.
 * Box fields: align to bottom edge (y1) like a line field, not vertically centered.
 */
export function slotBaseline(slot, size = TEXT_SIZE) {
  void size
  const aboveLine = slot.lineOffset ?? LINE_ABOVE_OFFSET
  if (slot.kind === 'line') {
    const lineY = slot.line ?? slot.base
    return lineY - aboveLine
  }
  if (slot.kind === 'box' && slot.y1 != null) {
    const lineY = slot.line ?? slot.y1
    return lineY - aboveLine
  }
  if (slot.base != null) return slot.base
  if (slot.y1 != null) return slot.y1 - LINE_ABOVE_OFFSET
  return slot.base ?? 0
}

/** Center an X inside an ~8×8pt template checkbox (Fitz coords). */
export function drawMark(page, cx, cy, font, size = 8) {
  const mark = 'X'
  const w = font.widthOfTextAtSize(mark, size)
  const fitzBaseline = cy + size * 0.3
  page.drawText(mark, {
    x: cx - w / 2,
    y: pdfY(fitzBaseline),
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

export function drawFitzHorizontalLine(page, x0, x1, fitzY, thickness = 0.75, color = PDF_GRID_LINE) {
  const y = pdfY(fitzY)
  page.drawLine({
    start: { x: x0, y },
    end: { x: x1, y },
    thickness,
    color,
  })
}

export function coverFitzRect(page, x0, y0, x1, y1, color = PDF_PAPER) {
  const height = y1 - y0
  if (height <= 0) return
  page.drawRectangle({
    x: x0,
    y: pdfY(y1),
    width: x1 - x0,
    height,
    color,
    borderWidth: 0,
  })
}

/** Hide template underline / cell-bottom rules before drawing filled values. */
export function coverUnderlineStrip(page, slot, strip = 3.5) {
  const lineY = slot.line ?? slot.y1
  if (lineY == null) return
  coverFitzRect(page, slot.x0, lineY - strip, slot.x1, lineY + 1.2)
}

function slotBaselineClean(slot, size = TEXT_SIZE) {
  if (slot.y0 != null && slot.y1 != null) {
    const span = slot.y1 - slot.y0
    if (span < size + 3) return slot.y1 - 1.5
    const mid = (slot.y0 + slot.y1) / 2
    return mid + size * 0.3
  }
  return slotBaseline(slot, size)
}

/** Draw value without sitting on template underlines (page 2 emergency / family grid). */
export function drawInSlotClean(page, text, slot, font, size = TEXT_SIZE) {
  const value = asText(text)
  if (!value) return
  const maxWidth = slot.x1 - slot.x0 - TEXT_PAD_X * 2
  drawFieldValue(
    page,
    value,
    slot.x0 + TEXT_PAD_X,
    slotBaselineClean(slot, size),
    font,
    size,
    maxWidth,
  )
}

/** Multiline overlay inside a box region (top-down, clipped to box height). */
export function drawMultilineInSlot(
  page,
  text,
  slot,
  font,
  size = TEXT_SIZE,
  maxLines = 3,
  options = {},
) {
  const raw = asText(text)
  if (!raw) return
  const maxWidth = slot.x1 - slot.x0 - TEXT_PAD_X * 2
  const lineGap = size + 3
  const topInset = options.labelReserve ?? (slot.kind === 'box' ? BOX_LABEL_RESERVE : 5)
  const startBase =
    slot.kind === 'box' && slot.y0 != null
      ? slot.y0 + topInset
      : slotBaseline(slot, size)
  const bottomLimit = slot.kind === 'box' && slot.y1 != null ? slot.y1 - 2 : null
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
    const base = startBase + index * lineGap
    if (bottomLimit != null && base > bottomLimit) return
    drawFieldValue(page, line, slot.x0 + TEXT_PAD_X, base, font, size, maxWidth)
  })
}

/** Multiline overlay anchored to the bottom edge of a box (sits on the underline). */
export function drawMultilineInSlotFromBottom(
  page,
  text,
  slot,
  font,
  size = TEXT_SIZE,
  maxLines = 3,
  options = {},
) {
  const raw = asText(text)
  if (!raw) return
  const maxWidth = slot.x1 - slot.x0 - TEXT_PAD_X * 2
  const lineGap = size + 3
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

  const bottomBase =
    slot.kind === 'box' && slot.y1 != null
      ? slot.y1 - LINE_ABOVE_OFFSET
      : slotBaseline(slot, size)
  const topLimit =
    slot.kind === 'box' && slot.y0 != null
      ? slot.y0 + (options.labelReserve ?? BOX_LABEL_RESERVE)
      : null

  const displayLines = lines.slice(0, maxLines)
  displayLines.forEach((line, index) => {
    const linesFromBottom = displayLines.length - 1 - index
    const base = bottomBase - linesFromBottom * lineGap
    if (topLimit != null && base < topLimit) return
    drawFieldValue(page, line, slot.x0 + TEXT_PAD_X, base, font, size, maxWidth)
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
