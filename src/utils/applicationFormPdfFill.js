import { isTransferMdProgram } from './programTypes.js'
import {
  CB,
  DOC_CHECKLIST_FIELD_TO_CB,
  EDU_COLS,
  EDU_ROW_LINES,
  getEducationRowBounds,
  PAGE1_FIELDS,
  PAGE5_DOC_FORM_KEYS,
  PAGE5_DOC_RECEIVED_X,
  PAGE5_DOC_ROWS,
  PAGE5_OTHER_DOCUMENT_KEYS,
  PAGE6_SIGNATURE_BOXES,
  PAGE1_PASSPORT_PHOTO,
  PAGE2_FAMILY_INPUT_COVERS,
  PAGE2_FAMILY_ROW_BOTTOM_DIVIDER,
  PAGE2_FAMILY_ROW_DIVIDER,
  PAGE2_FIELDS,
  PAGE3_FIELDS,
  PAGE4_FIELDS,
  STANDARDIZED_TEST_LINE1_RIGHT,
  STANDARDIZED_TEST_LINE2,
  PAGE5_FIELDS,
  PAGE6_FIELDS,
  TRANSFER_ROWS,
} from './applicationFormPdfLayout.js'
import {
  applicantFullName,
  asText,
  coverFitzRect,
  drawFitzHorizontalLine,
  drawInSlot,
  drawInSlotClean,
  drawMark,
  drawMarkInCell,
  drawMultilineInSlot,
  drawMultilineInSlotFromBottom,
  drawPassportPhotoInBox,
  drawSignatureInBox,
  formatDatePdf,
  formatMonthPdf,
  hasUploadedValue,
  joinParts,
  resolvePaymentOption,
  resolveProgramLabel,
} from './pdfDrawHelpers.js'

const BODY = 8.5
const SMALL = 8

/** Convert an underline slot into a shallow box for clean overlays. */
function toLineBox(slot) {
  const lineY = slot.line ?? slot.y1
  if (lineY == null || slot.x0 == null || slot.x1 == null) return slot
  return {
    x0: slot.x0,
    x1: slot.x1,
    y0: lineY - 14,
    y1: lineY,
    kind: 'box',
  }
}

const BACKEND_KEY_TO_FORM = {
  passport: 'passport',
  bank_statement: 'bankStatement',
  premedical_Bachelor_ug_HSC_Certificate: 'preMedTranscript',
  Secondary_11grade: 'grade11Transcript',
  cv_resume: 'cv',
  exam_results_marksheet: 'examResults',
  other_professional_transcripts: 'otherProfessionalTranscripts',
  passport_photo: 'passportPhoto',
  sponsor_signed_financial_form: 'sponsorSignedFinancialForm',
  review_signature_document: 'reviewSignatureUpload',
}

function markYesNo(page, value, yesKey, noKey, font) {
  const v = asText(value).toLowerCase()
  if (value === true || v === 'yes' || v === 'y' || v === '1') {
    drawMark(page, ...CB[yesKey], font)
  } else if (value === false || v === 'no' || v === 'n' || v === '0') {
    drawMark(page, ...CB[noKey], font)
  }
}

function markTitle(page, title, font) {
  const t = asText(title).toLowerCase()
  if (t.startsWith('mr')) drawMark(page, ...CB.p1TitleMr, font)
  else if (t.startsWith('mrs')) drawMark(page, ...CB.p1TitleMrs, font)
  else if (t.startsWith('ms')) drawMark(page, ...CB.p1TitleMs, font)
  else if (t) drawMark(page, ...CB.p1TitleOther, font)
}

function markProgramDuration(page, programType, programOptions, font) {
  const label = resolveProgramLabel(programType, programOptions).toLowerCase()
  if (/5[\s-]*year|with pre-?med/i.test(label)) {
    drawMark(page, ...CB.p2Program5, font)
  } else if (label) {
    drawMark(page, ...CB.p2Program4, font)
  }
}

function markSubProgram(page, subProgram, programType, programOptions, font) {
  const sub = asText(subProgram).toLowerCase()
  const label = resolveProgramLabel(programType, programOptions).toLowerCase()
  if (isTransferMdProgram(programType, programOptions) || /clinical|transfer/i.test(sub) || /clinical|transfer/i.test(label)) {
    drawMark(page, ...CB.p2SubClinical, font)
  } else if (/basic/i.test(sub)) {
    drawMark(page, ...CB.p2SubBasic, font)
  } else if (/pre-?med|premed/i.test(sub)) {
    drawMark(page, ...CB.p2SubPremed, font)
  } else if (sub) {
    drawInSlot(page, subProgram, { x0: 63, x1: 520, y0: 622, y1: 654, kind: 'box' }, font, BODY)
  }
}

function markSemester(page, semester, font) {
  const s = asText(semester).toLowerCase()
  if (/spring|jan/i.test(s)) drawMark(page, ...CB.p2SemSpring, font)
  else if (/summer|may/i.test(s)) drawMark(page, ...CB.p2SemSummer, font)
  else if (/fall|sept|autumn/i.test(s)) drawMark(page, ...CB.p2SemFall, font)
}

function markEnglishProficiency(page, value, font) {
  const v = asText(value).toLowerCase()
  if (/native/i.test(v)) drawMark(page, ...CB.p2EngNative, font)
  else if (/fluent/i.test(v)) drawMark(page, ...CB.p2EngFluent, font)
  else if (/intermediate/i.test(v)) drawMark(page, ...CB.p2EngIntermediate, font)
}

function markEnglishTest(page, testType, font) {
  const t = asText(testType).toLowerCase()
  if (t.includes('toefl')) drawMark(page, ...CB.p3Toefl, font)
  else if (t.includes('ielts')) drawMark(page, ...CB.p3Ielts, font)
  else if (t.includes('pte')) drawMark(page, ...CB.p3Pte, font)
  else if (/n\/?a|none|not/i.test(t)) drawMark(page, ...CB.p3EngNa, font)
}

function markHowHeard(page, value, otherText, font) {
  const v = asText(value).toLowerCase()
  if (/google|search/i.test(v)) drawMark(page, ...CB.p4HearGoogle, font)
  else if (/social/i.test(v)) drawMark(page, ...CB.p4HearSocial, font)
  else if (/friend|family/i.test(v)) drawMark(page, ...CB.p4HearFriend, font)
  else if (/agent/i.test(v)) drawMark(page, ...CB.p4HearAgent, font)
  else if (/fair/i.test(v)) drawMark(page, ...CB.p4HearFair, font)
  else if (/youtube/i.test(v)) drawMark(page, ...CB.p4HearYoutube, font)
  else if (/whatsapp/i.test(v)) drawMark(page, ...CB.p4HearWhatsapp, font)
  else if (/alumni/i.test(v)) drawMark(page, ...CB.p4HearAlumni, font)
  else if (/other/i.test(v)) drawMark(page, ...CB.p4HearOther, font)
  else if (v) {
    drawMark(page, ...CB.p4HearOther, font)
    drawInSlot(page, otherText || value, PAGE4_FIELDS.howHeardOther, font, BODY)
  }
}

function collectUploadedFormFields(formValues, uploadedDocumentKeys = []) {
  const uploaded = new Set()
  for (const formKey of Object.keys(DOC_CHECKLIST_FIELD_TO_CB)) {
    if (hasUploadedValue(formValues?.[formKey])) {
      uploaded.add(formKey)
    }
  }
  for (const backendKey of uploadedDocumentKeys) {
    const formKey = BACKEND_KEY_TO_FORM[backendKey]
    if (formKey) uploaded.add(formKey)
  }
  return uploaded
}

function markDocumentChecklist(page, uploadedFields, font) {
  for (const [formKey, cbKey] of Object.entries(DOC_CHECKLIST_FIELD_TO_CB)) {
    if (uploadedFields.has(formKey) && CB[cbKey]) {
      drawMark(page, ...CB[cbKey], font)
    }
  }
}

function markPage5DocumentReceived(page, uploadedFields, font) {
  const hasOther = PAGE5_OTHER_DOCUMENT_KEYS.some((key) => uploadedFields.has(key))

  PAGE5_DOC_FORM_KEYS.forEach((key, index) => {
    const row = PAGE5_DOC_ROWS[index]
    if (!row) return
    const isReceived =
      key === 'otherDocuments' ? hasOther : uploadedFields.has(key)
    if (isReceived) {
      drawMarkInCell(page, PAGE5_DOC_RECEIVED_X, row.y0, row.y1, font)
    }
  })
}

function drawEducationRow(page, row, rowIndex, font) {
  const rowBounds = getEducationRowBounds(rowIndex)
  if (!rowBounds) return

  const institutionLine = joinParts(row.institution, row.address)
  const cols = [
    institutionLine,
    row.country,
    [formatMonthPdf(row.startDate), formatMonthPdf(row.endDate)].filter(Boolean).join(' – '),
    row.degree,
    row.fieldOfStudy,
    row.gpa,
  ]

  cols.forEach((text, colIndex) => {
    const col = EDU_COLS[colIndex]
    if (!col || !asText(text)) return

    const slot = {
      x0: col.x0,
      x1: col.x1,
      y0: rowBounds.y0,
      y1: rowBounds.y1,
      kind: 'box',
    }

    coverFitzRect(page, col.x0 + 0.8, rowBounds.y0 + 1, col.x1 - 0.8, rowBounds.y1 - 1)
    drawInSlotClean(page, text, slot, font, BODY)
  })
}

/**
 * Overlay applicant data on the 7-page MUCM redesigned application PDF template.
 */
export async function fillRedesignedApplicationPdf(pdfDoc, formValues, options = {}) {
  const helvetica = options.helvetica
  const helveticaBold = options.helveticaBold
  const scriptFont = options.scriptFont ?? helvetica
  const programOptions = options.programOptions ?? []
  const passportPhotoPayload = options.passportPhotoPayload ?? null
  const signaturePayload = options.signaturePayload ?? null

  const pages = pdfDoc.getPages()
  const p1 = pages[0]
  const p2 = pages[1]
  const p3 = pages[2]
  const p4 = pages[3]
  const p5 = pages[4]
  const p6 = pages[5]

  const v = formValues ?? {}
  const uploadedFields = collectUploadedFormFields(v, options.uploadedDocumentKeys ?? [])

  if (passportPhotoPayload) {
    await drawPassportPhotoInBox(p1, pdfDoc, PAGE1_PASSPORT_PHOTO, passportPhotoPayload)
  }

  // Page 1
  markTitle(p1, v.title, helveticaBold)
  drawInSlot(p1, v.surname, PAGE1_FIELDS.surname, helvetica, BODY)
  drawInSlot(p1, v.firstName, PAGE1_FIELDS.firstName, helvetica, BODY)
  drawInSlot(p1, v.middleName, PAGE1_FIELDS.middleName, helvetica, BODY)
  drawInSlot(p1, v.preferredName, PAGE1_FIELDS.preferredName, helvetica, BODY)
  drawInSlot(p1, v.nameChanged, PAGE1_FIELDS.nameChanged, helvetica, BODY)
  const gender = asText(v.gender).toLowerCase()
  if (gender === 'male') drawMark(p1, ...CB.p1GenderMale, helveticaBold)
  else if (gender === 'female') drawMark(p1, ...CB.p1GenderFemale, helveticaBold)
  else if (gender) drawMark(p1, ...CB.p1GenderOther, helveticaBold)
  drawInSlot(p1, formatDatePdf(v.dateOfBirth), PAGE1_FIELDS.dateOfBirth, helvetica, BODY)
  drawInSlot(p1, v.citizenship, PAGE1_FIELDS.citizenship, helvetica, BODY)
  drawInSlot(p1, v.countryOfResidence, PAGE1_FIELDS.countryOfResidence, helvetica, BODY)
  drawInSlot(p1, v.visaStatus, PAGE1_FIELDS.visaStatus, helvetica, BODY)
  drawInSlot(p1, v.passportNumber, PAGE1_FIELDS.passportNumber, helvetica, BODY)
  drawInSlot(p1, formatDatePdf(v.passportExpiry), PAGE1_FIELDS.passportExpiry, helvetica, BODY)
  drawInSlot(p1, v.email, PAGE1_FIELDS.email, helvetica, BODY)
  drawInSlot(p1, v.phoneMobile, PAGE1_FIELDS.phoneMobile, helvetica, BODY)
  drawInSlot(p1, v.phoneHome, PAGE1_FIELDS.phoneHome, helvetica, BODY)

  const permanent = joinParts(v.permanentAddress, v.city, v.stateProvince, v.postalCode, v.country)
  drawMultilineInSlotFromBottom(p1, permanent, PAGE1_FIELDS.permanentAddress, helvetica, BODY, 2)

  const mailing =
    v.sameAsPermanent === false
      ? joinParts(
          v.mailingAddress,
          v.mailingCity,
          v.mailingStateProvince,
          v.mailingPostalCode,
          v.mailingCountry,
        )
      : permanent
  if (mailing) {
    drawMultilineInSlotFromBottom(p1, mailing, PAGE1_FIELDS.mailingAddress, helvetica, BODY, 2)
  }

  drawInSlot(p1, v.contactName, PAGE1_FIELDS.contactName, helvetica, BODY)
  drawInSlot(p1, v.relationship, PAGE1_FIELDS.relationship, helvetica, BODY)
  drawInSlot(p1, v.contactPhone, PAGE1_FIELDS.contactPhone, helvetica, BODY)
  drawInSlot(p1, v.contactEmail, PAGE1_FIELDS.contactEmail, helvetica, BODY)
  drawInSlot(p1, v.contactCountry, PAGE1_FIELDS.contactCountry, helvetica, BODY)

  // Page 2 — emergency + family: hide template input widgets, plain text in cells
  PAGE2_FAMILY_INPUT_COVERS.forEach((rect) => {
    coverFitzRect(p2, rect.x0, rect.y0 - 0.5, rect.x1, rect.y1 + 0.5)
  })

  const emergencyAddress =
    asText(v.contactAddress) || (v.sameAsPermanent !== false ? permanent : '')
  if (emergencyAddress) {
    drawInSlotClean(p2, emergencyAddress, PAGE2_FIELDS.emergencyAddress, helvetica, BODY)
  }

  drawInSlotClean(
    p2,
    joinParts(v.fatherName, v.fatherOccupation ? `(${v.fatherOccupation})` : ''),
    PAGE2_FIELDS.fatherName,
    helvetica,
    BODY,
  )
  drawInSlotClean(p2, v.fatherEmail, PAGE2_FIELDS.fatherEmail, helvetica, BODY)
  drawInSlotClean(p2, v.fatherPhone, PAGE2_FIELDS.fatherPhone, helvetica, BODY)
  drawInSlotClean(
    p2,
    joinParts(v.motherName, v.motherOccupation ? `(${v.motherOccupation})` : ''),
    PAGE2_FIELDS.motherName,
    helvetica,
    BODY,
  )
  drawInSlotClean(p2, v.motherEmail, PAGE2_FIELDS.motherEmail, helvetica, BODY)
  drawInSlotClean(p2, v.motherPhone, PAGE2_FIELDS.motherPhone, helvetica, BODY)

  const rowDiv = PAGE2_FAMILY_ROW_DIVIDER
  drawFitzHorizontalLine(p2, rowDiv.x0, rowDiv.x1, rowDiv.y)
  const rowBottom = PAGE2_FAMILY_ROW_BOTTOM_DIVIDER
  drawFitzHorizontalLine(p2, rowBottom.x0, rowBottom.x1, rowBottom.y)

  const educationRows = Array.isArray(v.educationEntries) ? v.educationEntries : []
  educationRows.slice(0, EDU_ROW_LINES.length).forEach((row, index) => {
    drawEducationRow(p2, row, index, helvetica)
  })

  markProgramDuration(p2, v.programType, programOptions, helveticaBold)
  markSubProgram(p2, v.subProgram, v.programType, programOptions, helveticaBold)
  markSemester(p2, v.semester, helveticaBold)
  drawInSlot(p2, v.year, PAGE2_FIELDS.year, helvetica, BODY)
  markEnglishProficiency(p2, v.englishProficiency, helveticaBold)

  // Page 3
  const transferRows = Array.isArray(v.transferCredits) ? v.transferCredits : []
  transferRows.slice(0, TRANSFER_ROWS.length).forEach((row, index) => {
    const slots = TRANSFER_ROWS[index]
    if (!slots) return
    drawInSlot(p3, row.institution, slots.inst, helvetica, BODY)
    drawInSlot(p3, row.courses, slots.courses, helvetica, BODY)
  })

  markEnglishTest(p3, v.englishTestType, helveticaBold)
  drawInSlot(p3, v.englishTestScore, PAGE3_FIELDS.englishTestScore, helvetica, BODY)
  if (v.hasStandardizedTest === true || asText(v.hasStandardizedTest).toLowerCase() === 'yes') {
    // Keep "STANDARDIZED TEST" text; wipe "(MCAT/" + NEW badge (right of line 1) and "NEET/UCAT)" (line 2)
    const l1 = STANDARDIZED_TEST_LINE1_RIGHT
    const l2 = STANDARDIZED_TEST_LINE2
    coverFitzRect(p3, l1.x0, l1.y0, l1.x1, l1.y1)
    coverFitzRect(p3, l2.x0, l2.y0, l2.x1, l2.y1)
    drawInSlot(
      p3,
      joinParts(v.standardizedTestType, v.standardizedTestScore),
      PAGE3_FIELDS.standardizedTest,
      helvetica,
      BODY,
    )
    drawFitzHorizontalLine(p3, l2.x0, l2.x1, PAGE3_FIELDS.standardizedTest.line)
  }

  markYesNo(p3, v.hasBeenDisciplined, 'p3DiscYes', 'p3DiscNo', helveticaBold)
  markYesNo(p3, v.hasBeenConvicted, 'p3ConvYes', 'p3ConvNo', helveticaBold)
  markYesNo(p3, v.hasDisability, 'p3DisabYes', 'p3DisabNo', helveticaBold)
  markYesNo(p3, v.requiresAccommodation, 'p3AccomYes', 'p3AccomNo', helveticaBold)

  const disciplineExplain = joinParts(
    asText(v.hasBeenDisciplined).toLowerCase() === 'yes' ? v.disciplineActionExplanation : '',
    asText(v.hasBeenConvicted).toLowerCase() === 'yes' ? v.convictionExplanation : '',
  )
  if (disciplineExplain) {
    drawMultilineInSlot(p3, disciplineExplain, PAGE3_FIELDS.disciplineExplain, helvetica, BODY, 5, {
      labelReserve: 36,
    })
  }

  const disabilityExplain = joinParts(
    asText(v.hasDisability).toLowerCase() === 'yes' ? v.disabilityDetails : '',
    asText(v.requiresAccommodation).toLowerCase() === 'yes' ? v.accommodationDetails : '',
  )
  if (disabilityExplain) {
    drawMultilineInSlot(p4, disabilityExplain, PAGE4_FIELDS.disabilityExplain, helvetica, BODY, 4, {
      labelReserve: 36,
    })
  }

  markHowHeard(p4, v.howHeard, v.howHeardOther, helveticaBold)
  markDocumentChecklist(p4, uploadedFields, helveticaBold)
  markPage5DocumentReceived(p5, uploadedFields, helveticaBold)

  const payment = resolvePaymentOption(v.paymentOption)
  const studentLineName = asText(v.studentName) || applicantFullName(v)
  drawInSlotClean(p5, studentLineName, toLineBox(PAGE5_FIELDS.studentName), helvetica, BODY)
  drawInSlotClean(p5, formatDatePdf(v.dateOfBirth), toLineBox(PAGE5_FIELDS.studentDob), helvetica, BODY)
  drawInSlotClean(p5, v.email, toLineBox(PAGE5_FIELDS.studentEmail), helvetica, BODY)
  drawInSlotClean(
    p5,
    v.phoneMobile || v.phoneHome,
    toLineBox(PAGE5_FIELDS.studentPhone),
    helvetica,
    BODY,
  )

  if (payment === 'B' || payment === 'C') {
    const sponsorName =
      payment === 'C'
        ? joinParts(v.orgName, v.orgContactPerson ? `(${v.orgContactPerson})` : '')
        : v.sponsorFullName
    drawInSlotClean(p5, sponsorName, toLineBox(PAGE5_FIELDS.sponsorName), helvetica, BODY)
    drawInSlotClean(
      p5,
      payment === 'C' ? v.orgEmail : v.sponsorEmail,
      toLineBox(PAGE5_FIELDS.sponsorEmail),
      helvetica,
      BODY,
    )
    drawInSlotClean(
      p5,
      payment === 'C' ? v.orgPhone : v.sponsorPhone,
      toLineBox(PAGE5_FIELDS.sponsorPhone),
      helvetica,
      BODY,
    )
    drawInSlotClean(
      p5,
      payment === 'C' ? v.orgCountry : v.sponsorRelationship,
      toLineBox(PAGE5_FIELDS.sponsorRelation),
      helvetica,
      BODY,
    )
    drawInSlotClean(
      p5,
      payment === 'C'
        ? joinParts(v.orgAddress, v.orgCity, v.orgState, v.orgPostalCode)
        : joinParts(v.sponsorAddress, v.sponsorCity, v.sponsorState, v.sponsorPostalCode, v.sponsorCountry),
      toLineBox(PAGE5_FIELDS.sponsorCountry),
      helvetica,
      SMALL,
    )
  }

  if (payment === 'A') drawMark(p5, ...CB.p5PayA, helveticaBold)
  else if (payment === 'B') drawMark(p5, ...CB.p5PayB, helveticaBold)
  else if (payment === 'C') drawMark(p5, ...CB.p5PayC, helveticaBold)

  drawInSlot(p6, studentLineName, PAGE6_FIELDS.finStudentName, helvetica, BODY)
  if (payment === 'B' || payment === 'C') {
    const sponsorName = payment === 'C' ? v.orgName : v.sponsorFullName
    drawInSlot(p6, sponsorName, PAGE6_FIELDS.finSponsorName, helvetica, BODY)
  }
  await drawSignatureInBox(p6, pdfDoc, PAGE6_SIGNATURE_BOXES.financial, signaturePayload, {
    scriptFont,
    fallbackFont: helvetica,
  })
  drawInSlot(p6, formatDatePdf(v.certifyDate), PAGE6_FIELDS.finDate, helvetica, BODY)

  drawInSlot(p6, studentLineName, PAGE6_FIELDS.applicantName, helvetica, BODY)
  drawInSlot(p6, joinParts(v.city, v.country), PAGE6_FIELDS.applicantPlace, helvetica, BODY)
  await drawSignatureInBox(p6, pdfDoc, PAGE6_SIGNATURE_BOXES.applicant, signaturePayload, {
    scriptFont,
    fallbackFont: helvetica,
  })
  drawInSlot(
    p6,
    formatDatePdf(v.certifyDate) || formatDatePdf(v.sponsorCertifyDate),
    PAGE6_FIELDS.applicantDate,
    helvetica,
    BODY,
  )

  if (payment === 'A') {
    drawMark(p6, ...CB.p6FinDocA1, helveticaBold)
  } else if (payment === 'B') {
    drawMark(p6, ...CB.p6FinDocB1, helveticaBold)
    drawMark(p6, ...CB.p6FinDocB2, helveticaBold)
    drawMark(p6, ...CB.p6FinDocB3, helveticaBold)
  } else if (payment === 'C') {
    drawMark(p6, ...CB.p6FinDocC1, helveticaBold)
    drawMark(p6, ...CB.p6FinDocC2, helveticaBold)
    drawMark(p6, ...CB.p6FinDocC3, helveticaBold)
  }
}
