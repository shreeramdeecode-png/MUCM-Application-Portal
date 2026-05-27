/**
 * Premium MUCM Step 7 sponsor declaration PDF (letter size, print-ready).
 * Run: npm run generate:step7-pdf
 *
 * Headings: DM Serif Display (OFL, bundled under scripts/fonts/).
 * Body: Helvetica. Brand colors align with the portal (#0A1628, #D4A843).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'public', 'forms', 'mucm-step-7-sponsor-financial-declaration.pdf')
const serifPath = join(__dirname, 'fonts', 'DMSerifDisplay-Regular.ttf')

const NAVY = rgb(10 / 255, 22 / 255, 40 / 255)
const GOLD = rgb(212 / 255, 168 / 255, 67 / 255)
const GOLD_SOFT = rgb(248 / 255, 242 / 255, 228 / 255)
const INK = rgb(18 / 255, 24 / 255, 34 / 255)
const MUTED = rgb(0.42, 0.45, 0.5)
const LINE = rgb(0.62, 0.66, 0.72)
const PANEL = rgb(0.978, 0.982, 0.992)
const PANEL_BORDER = rgb(0.82, 0.86, 0.92)
const WHITE = rgb(1, 1, 1)
const HEADER_H = 96
const MARGIN = 48
const PAGE_W = 612
const PAGE_H = 792

function wrapLines(text, font, size, maxW) {
  const words = String(text).split(/\s+/)
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (font.widthOfTextAtSize(next, size) <= maxW) cur = next
    else {
      if (cur) lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function drawRule(page, x1, x2, y, thickness = 0.65, color = LINE) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color })
}

function drawFieldRow(page, L, R, y, label, font, labelSize = 8.5) {
  page.drawText(label, { x: L, y, size: labelSize, font, color: MUTED })
  drawRule(page, L, R, y - 12, 0.55, LINE)
  return y - 34
}

function drawTwoColRow(page, L, R, y, leftLabel, rightLabel, font) {
  const mid = (L + R) / 2
  const gap = 14
  const L2 = mid + gap / 2
  const R1 = mid - gap / 2
  page.drawText(leftLabel, { x: L, y, size: 8.5, font, color: MUTED })
  page.drawText(rightLabel, { x: L2, y, size: 8.5, font, color: MUTED })
  drawRule(page, L, R1, y - 12, 0.55, LINE)
  drawRule(page, L2, R, y - 12, 0.55, LINE)
  return y - 34
}

function drawHeroHeader(page, helBold, helReg) {
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: NAVY })
  page.drawRectangle({ x: 0, y: PAGE_H - 5, width: PAGE_W, height: 5, color: GOLD })

  const org = 'METROPOLITAN UNIVERSITY COLLEGE OF MEDICINE'
  const s1 = 11.5
  const w1 = helBold.widthOfTextAtSize(org, s1)
  page.drawText(org, { x: (PAGE_W - w1) / 2, y: PAGE_H - 40, size: s1, font: helBold, color: WHITE })

  const sub = 'Office of Admissions  ·  Financial Support & Sponsorship'
  const s2 = 9
  const w2 = helReg.widthOfTextAtSize(sub, s2)
  page.drawText(sub, { x: (PAGE_W - w2) / 2, y: PAGE_H - 60, size: s2, font: helReg, color: rgb(0.82, 0.86, 0.92) })

  const docId = 'Form reference: MUCM-FS-7'
  page.drawText(docId, { x: (PAGE_W - helReg.widthOfTextAtSize(docId, 7.5)) / 2, y: PAGE_H - 78, size: 7.5, font: helReg, color: rgb(0.65, 0.7, 0.78) })
}

function drawSlimHeader(page, helBold, helReg) {
  const h = 44
  page.drawRectangle({ x: 0, y: PAGE_H - h, width: PAGE_W, height: h, color: NAVY })
  page.drawRectangle({ x: 0, y: PAGE_H - 3, width: PAGE_W, height: 3, color: GOLD })
  const t = 'MUCM — Sponsor Financial Declaration (Step 7)'
  page.drawText(t, { x: MARGIN, y: PAGE_H - 28, size: 10, font: helBold, color: WHITE })
  const st = 'Continuation'
  page.drawText(st, { x: PAGE_W - MARGIN - helReg.widthOfTextAtSize(st, 8), y: PAGE_H - 28, size: 8, font: helReg, color: rgb(0.75, 0.8, 0.88) })
}

function drawFooter(page, helReg, pageNum, total) {
  const yLine = 52
  drawRule(page, MARGIN, PAGE_W - MARGIN, yLine, 0.4, PANEL_BORDER)
  const confidential =
    'Confidential — intended solely for Metropolitan University College of Medicine admissions processing. Unauthorized distribution is prohibited.'
  page.drawText(confidential, { x: MARGIN, y: 34, size: 7, font: helReg, color: MUTED })
  const right = `Page ${pageNum} of ${total}`
  page.drawText(right, {
    x: PAGE_W - MARGIN - helReg.widthOfTextAtSize(right, 8),
    y: 34,
    size: 8,
    font: helReg,
    color: MUTED,
  })
}

function drawCallout(page, L, topY, width, lines, helReg) {
  const pad = 14
  const lineH = 11.5
  const bodySize = 9.25
  const h = pad * 2 + lines.length * lineH + 4
  const bottom = topY - h
  page.drawRectangle({
    x: L,
    y: bottom,
    width,
    height: h,
    color: GOLD_SOFT,
    borderColor: rgb(0.86, 0.78, 0.55),
    borderWidth: 0.8,
  })
  let ty = topY - pad - bodySize
  for (const ln of lines) {
    page.drawText(ln, { x: L + pad, y: ty, size: bodySize, font: helReg, color: INK })
    ty -= lineH
  }
  return bottom - 20
}

function drawSectionLabel(page, L, y, display, title, helBold) {
  page.drawRectangle({ x: L, y: y - 1, width: 4, height: 16, color: GOLD })
  const font = display ?? helBold
  const size = display ? 13 : 11
  page.drawText(title, { x: L + 14, y, size, font, color: NAVY })
  return y - 26
}

async function main() {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle('MUCM Sponsor Financial Declaration — Step 7')
  pdf.setSubject('Financial support — sponsor certification')
  pdf.setAuthor('Metropolitan University College of Medicine')
  pdf.setCreator('MUCM Application Portal')
  pdf.setProducer('pdf-lib / MUCM portal generator')
  pdf.setCreationDate(new Date())

  const helReg = await pdf.embedFont(StandardFonts.Helvetica)
  const helBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let display
  if (existsSync(serifPath)) {
    display = await pdf.embedFont(readFileSync(serifPath))
  } else {
    console.warn('Missing scripts/fonts/DMSerifDisplay-Regular.ttf — using Helvetica for titles.')
    display = helBold
  }

  const L = MARGIN
  const R = PAGE_W - MARGIN
  const W = R - L
  const TOTAL_PAGES = 2

  // ——————————————————————————————————————————————————————————————
  // Page 1
  // ——————————————————————————————————————————————————————————————
  let page = pdf.addPage([PAGE_W, PAGE_H])
  drawHeroHeader(page, helBold, helReg)

  let y = PAGE_H - HEADER_H - 28

  const mainTitle = 'Sponsor Financial Declaration'
  page.drawText(mainTitle, {
    x: L,
    y,
    size: 24,
    font: display,
    color: NAVY,
  })
  y -= 30
  page.drawText('Step 7  ·  Official sponsor undertaking', { x: L, y, size: 10.5, font: helReg, color: MUTED })
  y -= 10
  drawRule(page, L, L + 120, y, 2.2, GOLD)
  y -= 28

  const introLines = wrapLines(
    'Complete this instrument in full using dark ink or typed entry. The sponsor (individual or authorized organization representative) must sign Part D. The applicant uploads the completed PDF through the secure application portal. Incomplete forms may delay admission review.',
    helReg,
    9.25,
    W,
  )
  y = drawCallout(page, L, y, W, introLines, helReg)

  y = drawSectionLabel(page, L, y, display, 'Part A — Student', helBold)

  y = drawFieldRow(page, L, R, y, 'Student full legal name (print)', helReg)
  y = drawTwoColRow(page, L, R, y, 'Program of study', 'Expected start term / year', helReg)
  y = drawFieldRow(page, L, R, y, 'Student ID (if assigned)', helReg)

  y -= 6
  y = drawSectionLabel(page, L, y, display, 'Part B — Sponsor', helBold)

  page.drawText('Sponsor type (mark one)', { x: L, y, size: 8.5, font: helReg, color: MUTED })
  y -= 14
  page.drawText('(     )  Individual sponsor          (     )  Organization / corporate sponsor', { x: L, y, size: 10, font: helBold, color: INK })
  y -= 28

  y = drawFieldRow(page, L, R, y, 'Sponsor or registered organization legal name', helReg)
  y = drawTwoColRow(
    page,
    L,
    R,
    y,
    'If individual: relationship to student',
    'If organization: authorized contact name & title',
    helReg,
  )
  y = drawFieldRow(page, L, R, y, 'Street address (line 1)', helReg)
  y = drawFieldRow(page, L, R, y, 'Street address (line 2, if needed)', helReg)
  y = drawTwoColRow(page, L, R, y, 'City / Town', 'State / Province / Region', helReg)
  y = drawTwoColRow(page, L, R, y, 'Postal / ZIP code', 'Country', helReg)
  y = drawTwoColRow(page, L, R, y, 'Telephone (with country code)', 'Email address', helReg)

  page.drawText('Part C, declaration, and authorized signature continue on page 2.', {
    x: L,
    y: Math.max(y, 120),
    size: 9,
    font: helBold,
    color: rgb(0.35, 0.38, 0.45),
  })

  drawFooter(page, helReg, 1, TOTAL_PAGES)

  // ——————————————————————————————————————————————————————————————
  // Page 2 — commitment, declaration, signature
  // ——————————————————————————————————————————————————————————————
  page = pdf.addPage([PAGE_W, PAGE_H])
  drawSlimHeader(page, helBold, helReg)
  y = PAGE_H - 44 - 36

  y = drawSectionLabel(page, L, y, display, 'Part C — Financial commitment', helBold)

  const cIntro = wrapLines(
    'The undersigned sponsor confirms that they will make available the funds necessary for the student named in Part A to meet tuition, mandatory university fees, and reasonable living expenses for the duration of the program at MUCM, subject to the student remaining in good academic and financial standing and satisfying all published payment deadlines.',
    helReg,
    10,
    W - 28,
  )
  const cPadT = 16
  const cPadB = 14
  const cLineH = 13
  const fundBlockH = 8 + 12 + 22 * 3 + 6
  const panelH = cPadT + cIntro.length * cLineH + fundBlockH + cPadB
  const panelTop = y
  const panelBottom = panelTop - panelH
  page.drawRectangle({
    x: L,
    y: panelBottom,
    width: W,
    height: panelH,
    color: PANEL,
    borderColor: PANEL_BORDER,
    borderWidth: 0.9,
  })
  let cy = panelTop - cPadT - 10
  for (const ln of cIntro) {
    page.drawText(ln, { x: L + 14, y: cy, size: 10, font: helReg, color: INK })
    cy -= cLineH
  }
  y = cy - 12
  page.drawText('Primary source of funds (describe in detail)', { x: L + 14, y, size: 8.5, font: helReg, color: MUTED })
  y -= 12
  drawRule(page, L + 14, R - 14, y, 0.55, LINE)
  y -= 22
  drawRule(page, L + 14, R - 14, y, 0.55, LINE)
  y -= 22
  drawRule(page, L + 14, R - 14, y, 0.55, LINE)
  y = panelBottom - 28

  y = drawSectionLabel(page, L, y, display, 'Part D — Declaration & authorized signature', helBold)

  const declText = wrapLines(
    'I declare that the information provided in this form is true, complete, and accurate to the best of my knowledge. I understand that MUCM may verify financial capacity with financial institutions or employers as permitted by law, and that any material misrepresentation may result in denial of admission, revocation of an offer, or disciplinary action.',
    helReg,
    9.5,
    W - 28,
  )
  const dPad = 18
  const dLineH = 12
  const declBoxH = dPad + declText.length * dLineH + dPad
  const declTop = y
  const declBottom = declTop - declBoxH
  page.drawRectangle({
    x: L,
    y: declBottom,
    width: W,
    height: declBoxH,
    color: rgb(0.995, 0.997, 1),
    borderColor: NAVY,
    borderWidth: 1.2,
  })
  let dy = declTop - dPad - 9.5
  for (const ln of declText) {
    page.drawText(ln, { x: L + 14, y: dy, size: 9.5, font: helReg, color: INK })
    dy -= dLineH
  }

  y = declBottom - 28

  page.drawRectangle({
    x: L,
    y: y - 118,
    width: W,
    height: 118,
    borderColor: GOLD,
    borderWidth: 1.5,
    color: rgb(1, 1, 1),
  })

  const sigTop = y - 22
  page.drawText('Authorized sponsor signature', { x: L + 16, y: sigTop, size: 8.5, font: helReg, color: MUTED })
  drawRule(page, L + 16, R - 16, sigTop - 18, 0.75, NAVY)

  page.drawText('Printed name (must match Part B)', { x: L + 16, y: sigTop - 40, size: 8.5, font: helReg, color: MUTED })
  drawRule(page, L + 16, R - 16, sigTop - 58, 0.55, LINE)

  page.drawText('Title / capacity (if signing for an organization)', { x: L + 16, y: sigTop - 78, size: 8.5, font: helReg, color: MUTED })
  drawRule(page, L + 16, R - 200, sigTop - 96, 0.55, LINE)
  page.drawText('Date (DD/MM/YYYY)', { x: R - 190, y: sigTop - 78, size: 8.5, font: helReg, color: MUTED })
  drawRule(page, R - 190, R - 16, sigTop - 96, 0.55, LINE)

  y = sigTop - 128
  page.drawText('Official stamp / seal (organizations only, if applicable)', { x: L + 16, y, size: 8, font: helReg, color: MUTED })
  drawRule(page, L + 16, R - 16, y - 14, 0.45, LINE)

  y -= 36
  page.drawText('Optional continuation — use only if Part C requires additional space.', {
    x: L,
    y,
    size: 9,
    font: helBold,
    color: MUTED,
  })
  y -= 16
  for (let i = 0; i < 3; i += 1) {
    drawRule(page, L, R, y, 0.45, rgb(0.88, 0.9, 0.93))
    y -= 22
  }

  drawFooter(page, helReg, 2, TOTAL_PAGES)

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, await pdf.save())
  console.log('Wrote', outPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
