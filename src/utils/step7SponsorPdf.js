import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const NAVY = rgb(10 / 255, 22 / 255, 40 / 255)
const GOLD = rgb(212 / 255, 168 / 255, 67 / 255)
const INK = rgb(18 / 255, 24 / 255, 34 / 255)
const MUTED = rgb(0.35, 0.38, 0.45)

function asText(value) {
  if (value == null) return ''
  return String(value).trim()
}

function joinAddress(...parts) {
  return parts.map(asText).filter(Boolean).join(', ')
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function drawText(page, text, x, y, font, size, color = INK) {
  if (!text) return
  page.drawText(text, { x, y, font, size, color })
}

function drawFieldValue(page, text, x, y, font, size, maxWidth, color = INK) {
  const fitted = fitTextToWidth(text, font, size, maxWidth)
  if (!fitted) return
  const w = font.widthOfTextAtSize(fitted, size)
  const h = font.heightAtSize(size)
  page.drawRectangle({
    x: x - 2,
    y: y - 1.5,
    width: w + 4,
    height: h + 2.5,
    color: rgb(1, 1, 1),
  })
  page.drawText(fitted, { x, y, font, size, color })
}

function fitText(text, maxLength = 78) {
  const value = asText(text)
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}…`
}

function fitTextToWidth(text, font, size, maxWidth) {
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

export async function downloadPrefilledStep7Pdf(values, downloadLink) {
  const href = downloadLink?.href || '/forms/mucm-step-7-sponsor-financial-declaration.pdf'
  const outName = downloadLink?.fileName || 'mucm-step-7-sponsor-financial-declaration.pdf'

  const [templateRes, fontRes] = await Promise.all([
    fetch(href),
    fetch('/scripts/fonts/DMSerifDisplay-Regular.ttf'),
  ])
  if (!templateRes.ok) throw new Error('Unable to load Step 7 PDF template.')

  const pdfBytes = await templateRes.arrayBuffer()
  const pdfDoc = await PDFDocument.load(pdfBytes)
  pdfDoc.registerFontkit(fontkit)

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  let serif = helveticaBold
  if (fontRes.ok) {
    serif = await pdfDoc.embedFont(await fontRes.arrayBuffer())
  }

  const [page1, page2] = pdfDoc.getPages()

  const isOrg = values.paymentOption === 'C'
  const sponsorName = isOrg ? values.orgName : values.sponsorFullName
  const sponsorRelationship = isOrg ? '' : values.sponsorRelationship
  const orgContact = isOrg
    ? `${asText(values.orgContactPerson)}${asText(values.orgContactTitle) ? ` (${asText(values.orgContactTitle)})` : ''}`
    : ''
  const addressLine1 = isOrg ? values.orgAddress : values.sponsorAddress
  const addressLine2 = ''
  const city = isOrg ? values.orgCity : values.sponsorCity
  const state = isOrg ? values.orgState : values.sponsorState
  const postal = isOrg ? values.orgPostalCode : values.sponsorPostalCode
  const country = isOrg ? values.orgCountry : values.sponsorCountry
  const phone = isOrg ? values.orgPhone : values.sponsorPhone
  const email = isOrg ? values.orgEmail : values.sponsorEmail
  const funding = values.selfFundedSource || values.fundingSource || ''

  // Page 1 fields (aligned to writing baselines, with width fitting)
  const bodySize = 9
  const valueLift = -6
  drawFieldValue(page1, values.studentName, 72, 476 + valueLift, helvetica, bodySize, 488)
  drawFieldValue(page1, values.programOfStudy, 72, 442 + valueLift, helvetica, bodySize, 226)
  drawFieldValue(page1, values.expectedStartDate, 335, 442 + valueLift, helvetica, bodySize, 226)
  drawFieldValue(page1, values.studentId, 72, 408 + valueLift, helvetica, bodySize, 488)

  drawText(page1, values.paymentOption === 'B' ? 'X' : '', 80, 340, helveticaBold, 10, NAVY)
  drawText(page1, values.paymentOption === 'C' ? 'X' : '', 253, 340, helveticaBold, 10, NAVY)
  drawFieldValue(page1, sponsorName, 72, 306 + valueLift, helvetica, bodySize, 488)
  drawFieldValue(page1, sponsorRelationship, 72, 272 + valueLift, helvetica, bodySize, 226)
  drawFieldValue(page1, orgContact, 335, 272 + valueLift, helvetica, bodySize, 226)
  drawFieldValue(page1, addressLine1, 72, 238 + valueLift, helvetica, bodySize, 488)
  drawFieldValue(page1, addressLine2, 72, 204 + valueLift, helvetica, bodySize, 488)
  drawFieldValue(page1, city, 72, 170 + valueLift, helvetica, bodySize, 226)
  drawFieldValue(page1, state, 335, 170 + valueLift, helvetica, bodySize, 226)
  // Rebuild the whole bottom area to fully remove helper-note text artifacts.
  // Clear Postal/Country row + helper note + Phone/Email row.
  page1.drawRectangle({
    x: 24,
    y: 84,
    width: 564,
    height: 64,
    color: rgb(1, 1, 1),
  })
  drawText(page1, 'Postal / ZIP code', 60, 142, helvetica, 8.5, MUTED)
  drawText(page1, 'Country', 323, 142, helvetica, 8.5, MUTED)
  page1.drawLine({
    start: { x: 60, y: 126 },
    end: { x: 298, y: 126 },
    thickness: 0.55,
    color: rgb(0.62, 0.66, 0.72),
  })
  page1.drawLine({
    start: { x: 323, y: 126 },
    end: { x: 561, y: 126 },
    thickness: 0.55,
    color: rgb(0.62, 0.66, 0.72),
  })
  drawFieldValue(page1, postal, 72, 130, helvetica, bodySize, 226)
  drawFieldValue(page1, country, 335, 130, helvetica, bodySize, 226)
  drawText(page1, 'Telephone (with country code)', 60, 108, helvetica, 8.5, MUTED)
  drawText(page1, 'Email address', 323, 108, helvetica, 8.5, MUTED)
  page1.drawLine({
    start: { x: 60, y: 92 },
    end: { x: 298, y: 92 },
    thickness: 0.55,
    color: rgb(0.62, 0.66, 0.72),
  })
  page1.drawLine({
    start: { x: 323, y: 92 },
    end: { x: 561, y: 92 },
    thickness: 0.55,
    color: rgb(0.62, 0.66, 0.72),
  })
  drawFieldValue(page1, phone, 72, 96, helvetica, bodySize, 226)
  drawFieldValue(page1, email, 335, 96, helvetica, bodySize, 226)

  // Page 2 title touch removed to avoid overlap with Part C heading.

  // Part C funding source lines
  const fundingLines = fitText(funding || joinAddress(city, state, country), 180)
    .split('\n')
    .flatMap((line) => {
      const words = line.split(' ')
      const chunks = []
      let current = ''
      words.forEach((word) => {
        const next = current ? `${current} ${word}` : word
        if (next.length > 90) {
          chunks.push(current)
          current = word
        } else {
          current = next
        }
      })
      if (current) chunks.push(current)
      return chunks
    })
    .slice(0, 3)

  drawText(page2, fundingLines[0] ?? '', 64, 572, helvetica, 9.5)
  drawText(page2, fundingLines[1] ?? '', 64, 550, helvetica, 9.5)
  drawText(page2, fundingLines[2] ?? '', 64, 528, helvetica, 9.5)

  // Signature section
  // Keep signature line empty for manual signing.
  // Remove lower rows entirely, then redraw only the date field cleanly.
  page2.drawRectangle({
    x: 48,
    y: 236,
    width: 516,
    height: 72,
    color: rgb(1, 1, 1),
  })
  drawText(page2, 'Date (DD/MM/YYYY)', 430, 249, helvetica, 8.5, MUTED)
  page2.drawLine({
    start: { x: 430, y: 231 },
    end: { x: 556, y: 231 },
    thickness: 0.55,
    color: rgb(0.62, 0.66, 0.72),
  })
  drawFieldValue(page2, values.sponsorCertifyDate || values.certifyDate, 438, 235, helvetica, 10, 110)
  // Restore the signature box border segments affected by the cleanup mask.
  page2.drawLine({
    start: { x: 48, y: 236 },
    end: { x: 48, y: 308 },
    thickness: 1.2,
    color: GOLD,
  })
  page2.drawLine({
    start: { x: 564, y: 236 },
    end: { x: 564, y: 308 },
    thickness: 1.2,
    color: GOLD,
  })
  // Remove "Optional continuation" section at the bottom of page 2.
  page2.drawRectangle({
    x: 20,
    y: 40,
    width: 572,
    height: 150,
    color: rgb(1, 1, 1),
  })

  const outBytes = await pdfDoc.save()
  downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), outName)
}

