import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const NAVY = rgb(10 / 255, 22 / 255, 40 / 255)
const GOLD = rgb(212 / 255, 168 / 255, 67 / 255)
const INK = rgb(18 / 255, 24 / 255, 34 / 255)
const MUTED = rgb(0.35, 0.38, 0.45)
const LIGHT_GOLD = rgb(235 / 255, 210 / 255, 150 / 255)
const PANEL = rgb(0.985, 0.988, 0.995)
const RULE = rgb(0.82, 0.85, 0.9)
const WHITE = rgb(1, 1, 1)

function wrapLine(text, font, size, maxWidth) {
  const words = String(text ?? '').split(' ')
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
  return lines.length ? lines : ['']
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}

export async function downloadApplicationSummaryPdf({ referenceId, sections }) {
  const fontRes = await fetch('/scripts/fonts/DMSerifDisplay-Regular.ttf')
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  let serif = helveticaBold
  if (fontRes.ok) {
    serif = await pdfDoc.embedFont(await fontRes.arrayBuffer())
  }

  const pageWidth = 612
  const pageHeight = 792
  const margin = 40
  const maxWidth = pageWidth - margin * 2
  const bodySize = 10
  const smallSize = 9

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  function addPage() {
    page = pdfDoc.addPage([pageWidth, pageHeight])
    // Draw the navy header bar on every page
    page.drawRectangle({ x: 0, y: pageHeight - 42, width: pageWidth, height: 42, color: NAVY })
    page.drawText('METROPOLITAN UNIVERSITY COLLEGE OF MEDICINE', {
      x: margin,
      y: pageHeight - 20,
      size: 9,
      font: helveticaBold,
      color: WHITE,
    })
    page.drawText('Student Application Portal', {
      x: margin,
      y: pageHeight - 32,
      size: 7.5,
      font: helvetica,
      color: LIGHT_GOLD,
    })
    y = pageHeight - margin - 24
  }

  // Initial page setup (Special large header)
  page.drawRectangle({ x: 0, y: pageHeight - 110, width: pageWidth, height: 110, color: NAVY })
  
  // University Name
  page.drawText('METROPOLITAN UNIVERSITY COLLEGE OF MEDICINE', {
    x: pageWidth / 2 - helveticaBold.widthOfTextAtSize('METROPOLITAN UNIVERSITY COLLEGE OF MEDICINE', 11) / 2,
    y: pageHeight - 40,
    size: 11,
    font: helveticaBold,
    color: WHITE,
  })

  // Subtitles
  const sub1 = 'Office of Admissions  ·  Student Application Portal'
  page.drawText(sub1, {
    x: pageWidth / 2 - helvetica.widthOfTextAtSize(sub1, 9) / 2,
    y: pageHeight - 58,
    size: 9,
    font: helvetica,
    color: LIGHT_GOLD,
  })

  const refText = `Form reference: ${referenceId || 'MUCM-APP-SUM'}`
  page.drawText(refText, {
    x: pageWidth / 2 - helvetica.widthOfTextAtSize(refText, 7.5) / 2,
    y: pageHeight - 74,
    size: 7.5,
    font: helvetica,
    color: rgb(0.6, 0.65, 0.75),
  })

  // Main Page Title (White text area)
  y = pageHeight - 150
  page.drawText('Application Summary', {
    x: margin,
    y: y,
    size: 28,
    font: serif,
    color: INK,
  })
  
  y -= 20
  page.drawText('Applicant Copy  ·  Official submission record', {
    x: margin,
    y: y,
    size: 10,
    font: helvetica,
    color: MUTED,
  })

  // Gold accent line
  y -= 8
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: margin + 110, y: y },
    thickness: 2,
    color: GOLD,
  })

  y -= 40


  sections.forEach((section) => {
    if (y < margin + 80) addPage()

    page.drawRectangle({ x: margin, y: y - 2, width: 4, height: 16, color: GOLD })
    page.drawText(section.title, {
      x: margin + 12,
      y,
      size: 12,
      font: helveticaBold,
      color: NAVY,
    })
    y -= 20

    section.entries.forEach((entry) => {
      const labelText = String(entry.label || '').toUpperCase()
      const valueText = String(entry.value || '—')
      
      const labelWrapped = wrapLine(labelText, helveticaBold, 7.5, 150)
      const valueWrapped = valueText.split('\n').flatMap((line) => wrapLine(line, helvetica, bodySize, maxWidth - 180))
      
      const maxLines = Math.max(labelWrapped.length, valueWrapped.length)
      const blockHeight = Math.max(30, 16 + maxLines * (bodySize + 2))

      if (y < margin + blockHeight + 10) {
        addPage()
        page.drawRectangle({ x: margin, y: y - 2, width: 4, height: 16, color: GOLD })
        page.drawText(section.title, {
          x: margin + 12,
          y,
          size: 12,
          font: helveticaBold,
          color: NAVY,
        })
        y -= 20
      }

      page.drawRectangle({
        x: margin,
        y: y - blockHeight + 6,
        width: maxWidth,
        height: blockHeight,
        color: WHITE,
        borderColor: RULE,
        borderWidth: 0.45,
      })

      // Draw Wrapped Label
      let ly = y - 11
      labelWrapped.forEach((line) => {
        page.drawText(line, {
          x: margin + 10,
          y: ly,
          size: 7.5,
          font: helveticaBold,
          color: MUTED,
        })
        ly -= 9
      })

      // Draw Wrapped Value
      let vy = y - 11
      valueWrapped.forEach((line) => {
        page.drawText(line, {
          x: margin + 170,
          y: vy,
          size: bodySize,
          font: helvetica,
          color: INK,
        })
        vy -= bodySize + 2
      })

      y -= blockHeight + 6
    })


    y -= 6
  })

  const bytes = await pdfDoc.save()
  const outName = `${String(referenceId || 'mucm-application').replace(/[^\w.-]/g, '_')}.pdf`
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), outName)
}

