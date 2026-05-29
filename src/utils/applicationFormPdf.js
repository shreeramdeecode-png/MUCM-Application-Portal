import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { applicationSteps } from '../data/applicationSteps.js'
import { fillRedesignedApplicationPdf } from './applicationFormPdfFill.js'
import { loadPassportPhotoPayload } from './applicationFormPdfImage.js'
import { buildPdfSections } from './pdfDataBuilders.js'
import { asText, downloadBlob } from './pdfDrawHelpers.js'

/** Official blank form — do not replace; only overlay applicant data on download. */
const TEMPLATE_PATH = '/forms/mucm-application-form-redesigned.pdf'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 48
const MARGIN_TOP = 52
const MARGIN_BOTTOM = 48
const TITLE_SIZE = 16
const SECTION_SIZE = 11
const LABEL_SIZE = 9
const BODY_SIZE = 9
const LINE_GAP = 4

function wrapLines(text, font, size, maxWidth) {
  const raw = asText(text)
  if (!raw) return ['—']
  const words = raw.split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  return lines.length > 0 ? lines : ['—']
}

async function downloadOfficialFilledApplicationPdf({
  referenceId,
  formValues,
  programOptions = [],
  uploadedDocumentKeys = [],
  uploadedDocuments = [],
  fetchHeaders = {},
}) {
  const templateRes = await fetch(TEMPLATE_PATH)
  if (!templateRes.ok) {
    return false
  }

  const pdfBytes = await templateRes.arrayBuffer()
  const pdfDoc = await PDFDocument.load(pdfBytes)
  pdfDoc.registerFontkit(fontkit)

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const passportPhotoPayload = await loadPassportPhotoPayload(formValues, {
    fetchHeaders,
    uploadedDocuments,
  })

  await fillRedesignedApplicationPdf(pdfDoc, formValues, {
    helvetica,
    helveticaBold,
    programOptions,
    referenceId,
    uploadedDocumentKeys,
    passportPhotoPayload,
  })

  const bytes = await pdfDoc.save({ useObjectStreams: false })
  const outName = `MUCM_Application_${String(referenceId || 'form').replace(/[^\w.-]/g, '_')}.pdf`
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), outName)
  return true
}

async function downloadApplicationSummaryReportPdf({
  referenceId,
  formValues,
  programOptions = [],
  steps = applicationSteps,
}) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.08, 0.12, 0.2)
  const muted = rgb(0.35, 0.4, 0.48)

  const sections = buildPdfSections(formValues, steps, { programOptions })
  const contentWidth = PAGE_WIDTH - MARGIN_X * 2
  const labelWidth = 170
  const valueWidth = contentWidth - labelWidth - 8

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN_TOP

  const ensureSpace = (height) => {
    if (y - height >= MARGIN_BOTTOM) return
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y = PAGE_HEIGHT - MARGIN_TOP
  }

  page.drawText('Application Summary', {
    x: MARGIN_X,
    y,
    size: TITLE_SIZE,
    font: fontBold,
    color: ink,
  })
  y -= TITLE_SIZE + 6

  const refLine = `Reference ID: ${asText(referenceId) || '—'}`
  page.drawText(refLine, { x: MARGIN_X, y, size: BODY_SIZE, font, color: muted })
  y -= BODY_SIZE + 10

  const generatedLine = `Generated: ${new Date().toLocaleString()}`
  page.drawText(generatedLine, { x: MARGIN_X, y, size: BODY_SIZE, font, color: muted })
  y -= BODY_SIZE + 14

  for (const section of sections) {
    ensureSpace(SECTION_SIZE + 8)
    page.drawText(section.title, {
      x: MARGIN_X,
      y,
      size: SECTION_SIZE,
      font: fontBold,
      color: ink,
    })
    y -= SECTION_SIZE + 6

    for (const entry of section.entries) {
      const label = asText(entry.label) || 'Field'
      const valueLines = wrapLines(entry.value, font, BODY_SIZE, valueWidth)
      const blockHeight = Math.max(LABEL_SIZE, valueLines.length * (BODY_SIZE + LINE_GAP))
      ensureSpace(blockHeight + 6)

      page.drawText(label, {
        x: MARGIN_X,
        y,
        size: LABEL_SIZE,
        font: fontBold,
        color: muted,
      })

      let valueY = y
      for (const line of valueLines) {
        page.drawText(line, {
          x: MARGIN_X + labelWidth + 8,
          y: valueY,
          size: BODY_SIZE,
          font,
          color: ink,
        })
        valueY -= BODY_SIZE + LINE_GAP
      }

      y -= blockHeight + 8
    }

    y -= 4
  }

  const bytes = await pdfDoc.save()
  const outName = `MUCM_Application_Summary_${String(referenceId || 'form').replace(/[^\w.-]/g, '_')}.pdf`
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), outName)
}

/**
 * Download an application summary PDF. Uses the official overlay form when the
 * template is available; otherwise generates a readable summary report.
 */
export async function downloadApplicationSummaryPdf({
  referenceId,
  formValues,
  programOptions = [],
  steps = applicationSteps,
  uploadedDocumentKeys = [],
  uploadedDocuments = [],
  fetchHeaders = {},
}) {
  if (!formValues || typeof formValues !== 'object') {
    throw new Error('Application data is required to generate the PDF.')
  }

  try {
    const usedOfficial = await downloadOfficialFilledApplicationPdf({
      referenceId,
      formValues,
      programOptions,
      uploadedDocumentKeys,
      uploadedDocuments,
      fetchHeaders,
    })
    if (usedOfficial) {
      return
    }
  } catch {
    // Fall through to generated summary when template fetch/fill fails.
  }

  await downloadApplicationSummaryReportPdf({
    referenceId,
    formValues,
    programOptions,
    steps,
  })
}
