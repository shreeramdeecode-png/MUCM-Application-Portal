/**
 * Overlay targets for mucm-application-form-redesigned.pdf (Fitz coords, y increases downward).
 * Calibrated from template vector geometry (underlines, boxes, checkbox squares).
 *
 * @typedef {{ x0: number, x1: number, kind?: 'box' | 'line', line?: number, y0?: number, y1?: number }} PdfSlot
 */

const box = (x0, x1, y0, y1) => ({ x0, x1, y0, y1, kind: 'box' })
const line = (x0, x1, lineY, lineOffset) => ({
  x0,
  x1,
  kind: 'line',
  line: lineY,
  ...(lineOffset != null ? { lineOffset } : {}),
})

export const PAGE1_PASSPORT_PHOTO = { x0: 478, y0: 42, x1: 553, y1: 132 }

/** Checkbox centers [cx, cy] — from template 8×8pt squares */
export const CB = {
  p1TitleMr: [54.5, 305.2],
  p1TitleMrs: [81.6, 305.2],
  p1TitleMs: [112.3, 305.2],
  p1TitleOther: [140.0, 305.2],
  p1GenderMale: [54.5, 427.4],
  p1GenderFemale: [89.3, 427.4],
  p1GenderOther: [54.5, 446.3],
  p2Program4: [54.9, 564.9],
  p2Program5: [316.4, 564.9],
  p2SubPremed: [54.5, 632.9],
  p2SubBasic: [54.5, 670.7],
  p2SubClinical: [54.5, 708.4],
  p2SemSpring: [54.5, 762.9],
  p2SemSummer: [115.4, 762.9],
  p2SemFall: [54.5, 781.9],
  p2EngNative: [397.4, 762.9],
  p2EngFluent: [438.2, 762.9],
  p2EngIntermediate: [397.4, 781.9],
  p3Toefl: [54.5, 59.2],
  p3Ielts: [95.3, 59.2],
  p3Pte: [131.9, 59.2],
  p3EngNa: [54.5, 78.2],
  p3DiscYes: [54.5, 454.8],
  p3DiscNo: [88.5, 454.8],
  p3ConvYes: [54.5, 513.0],
  p3ConvNo: [88.5, 513.0],
  p3DisabYes: [54.5, 723.3],
  p3DisabNo: [88.5, 723.3],
  p3AccomYes: [54.5, 781.5],
  p3AccomNo: [88.5, 781.5],
  p4HearGoogle: [54.5, 149.5],
  p4HearSocial: [152.8, 149.5],
  p4HearFriend: [214.1, 149.5],
  p4HearAgent: [283.1, 149.5],
  p4HearFair: [357.7, 149.5],
  p4HearYoutube: [424.9, 149.5],
  p4HearWhatsapp: [471.8, 149.5],
  p4HearAlumni: [54.5, 167.0],
  p4HearOther: [125.6, 167.0],
  p4DocPassport: [54.5, 305.6],
  p4DocBank: [54.5, 345.6],
  p4DocPreMed: [54.5, 385.7],
  p4Doc11th: [54.5, 425.7],
  p4DocCv: [54.5, 465.7],
  p4DocExam: [54.5, 505.8],
  p4DocOtherProf: [54.5, 545.8],
  p4DocOtherHelp: [54.5, 585.9],
  p4DocPhoto: [54.5, 625.9],
  p4DocLor: [54.5, 665.9],
  p5PayA: [54.5, 553.5],
  p5PayB: [54.5, 594.4],
  p5PayC: [54.5, 635.2],
  p6FinDocA1: [328.5, 97.5],
  p6FinDocB1: [413.5, 97.5],
  p6FinDocC1: [500.0, 97.5],
  p6FinDocB2: [413.5, 125.5],
  p6FinDocC2: [500.0, 125.5],
  p6FinDocB3: [413.5, 153.5],
  p6FinDocC3: [500.0, 153.5],
}

export const PAGE1_FIELDS = {
  surname: line(221.8, 352.1, 313.7),
  firstName: line(393.3, 525.1, 313.7),
  middleName: line(50.4, 266.4, 354.4),
  preferredName: line(307.6, 525.1, 354.4),
  nameChanged: line(50.4, 525.1, 395.1),

  dateOfBirth: line(179.0, 266.4, 448.0),
  citizenship: line(307.6, 395.0, 444.6),
  countryOfResidence: line(436.2, 525.1, 444.6),

  passportNumber: line(50.4, 180.6, 492.8),
  passportExpiry: line(221.8, 352.1, 492.8),
  visaStatus: line(393.3, 525.1, 492.8),

  email: line(50.4, 180.6, 533.5),
  phoneMobile: line(221.8, 352.1, 533.5),
  phoneHome: line(393.3, 525.1, 533.5),

  /** Inner write area below the permanent-address label */
  permanentAddress: box(50.4, 525.1, 560.0, 588.4),
  mailingAddress: box(50.4, 525.1, 620.0, 643.3),

  contactName: line(50.4, 266.4, 729.6),
  relationship: line(307.6, 525.1, 729.6),
  contactPhone: line(50.4, 180.6, 770.3),
  contactEmail: line(221.8, 352.1, 770.3),
  contactCountry: line(393.3, 525.1, 770.3),
}

/** Template input underline widgets in the family grid (exact vector rects). */
/** Row separator between father / mother rows (covered by name-column input wipe). */
export const PAGE2_FAMILY_ROW_DIVIDER = { x0: 40.4, x1: 554.8, y: 128.3 }
/** Bottom border of the family grid (below mother row). */
export const PAGE2_FAMILY_ROW_BOTTOM_DIVIDER = { x0: 40.4, x1: 554.8, y: 168.2 }

export const PAGE2_FAMILY_INPUT_COVERS = [
  { x0: 50.4, x1: 180.6, y0: 115.0, y1: 127.5 },
  { x0: 221.8, x1: 352.1, y0: 106.3, y1: 120.4 },
  { x0: 393.3, x1: 525.1, y0: 106.3, y1: 120.4 },
  { x0: 50.4, x1: 180.6, y0: 155.7, y1: 167.5 },
  { x0: 221.8, x1: 352.1, y0: 147.0, y1: 161.1 },
  { x0: 393.3, x1: 525.1, y0: 147.0, y1: 161.1 },
]

const p2Cell = (x0, x1, y0, y1) => ({
  x0,
  x1,
  y0,
  y1,
  kind: 'box',
})

export const PAGE2_FIELDS = {
  emergencyAddress: p2Cell(50.4, 524.0, 54.0, 73.5),
  fatherName: p2Cell(50.4, 211.9, 112.0, 122.0),
  fatherEmail: p2Cell(221.8, 352.1, 112.0, 122.0),
  fatherPhone: p2Cell(393.3, 525.1, 112.0, 122.0),
  motherName: p2Cell(50.4, 211.9, 152.0, 162.0),
  motherEmail: p2Cell(221.8, 352.1, 152.0, 162.0),
  motherPhone: p2Cell(393.3, 525.1, 152.0, 162.0),
  year: line(221.8, 352.1, 771.4),
  otherLanguages: line(50.4, 525.1, 786.0),
}

export const EDU_COLS = [
  { x0: 40.1, x1: 184.3 },
  { x0: 184.3, x1: 241.0 },
  { x0: 241.0, x1: 318.2 },
  { x0: 318.2, x1: 400.7 },
  { x0: 400.7, x1: 477.9 },
  { x0: 477.9, x1: 555.2 },
]

export const EDU_FIRST_ROW = { y0: 232.8, y1: 275.7 }

export const EDU_ROW_LINES = [314.7, 354.1, 393.4, 432.8, 472.1]

const transferLine = (lineY) => ({
  inst: line(40.1, 271.9, lineY),
  courses: line(271.9, 555.2, lineY),
})

export const TRANSFER_ROWS = [
  { inst: line(40.1, 271.9, 157.9), courses: line(271.9, 555.2, 157.9) },
  transferLine(196.9),
  transferLine(236.3),
  transferLine(275.6),
  transferLine(315.0),
]

export const PAGE3_FIELDS = {
  englishTestScore: line(221.8, 352.1, 67.6),
  standardizedTest: line(393.3, 525.1, 76.4),
  disciplineExplain: box(40.4, 554.8, 404.6, 443.4),
  disabilityExplain: box(40.4, 554.8, 685.1, 770.1),
}

export const PAGE4_FIELDS = {
  howHeardOther: line(122, 266, 177.0),
}

export const PAGE5_FIELDS = {
  studentName: line(50.4, 266.4, 465.5),
  studentDob: line(307.6, 525.1, 465.5),
  studentEmail: line(50.4, 266.4, 506.2),
  studentPhone: line(307.6, 525.1, 506.2),
  sponsorName: line(59.6, 183.7, 727.2),
  sponsorEmail: line(224.9, 349.0, 727.2),
  sponsorPhone: line(390.2, 515.8, 727.2),
  sponsorRelation: line(59.6, 266.4, 767.9),
  sponsorCountry: line(307.6, 515.8, 767.9),
  selfFundedSource: box(40.4, 554.8, 500.6, 541.3),
}

export const PAGE6_FIELDS = {
  finStudentName: line(52.5, 266.4, 264.2),
  finSponsorName: line(301.9, 525.1, 264.2),
  finSignature: line(52.5, 266.4, 302.4),
  finDate: line(301.9, 525.1, 302.4),
  applicantName: line(50.4, 266.4, 591.6),
  applicantPlace: line(307.6, 525.1, 591.6),
  applicantSignature: line(50.4, 266.4, 632.3),
  applicantDate: line(307.6, 525.1, 632.3),
}

export const DOC_CHECKLIST_FIELD_TO_CB = {
  passport: 'p4DocPassport',
  bankStatement: 'p4DocBank',
  preMedTranscript: 'p4DocPreMed',
  grade11Transcript: 'p4Doc11th',
  cv: 'p4DocCv',
  examResults: 'p4DocExam',
  otherProfessionalTranscripts: 'p4DocOtherProf',
  passportPhoto: 'p4DocPhoto',
  sponsorSignedFinancialForm: 'p4DocOtherHelp',
  reviewSignatureUpload: 'p4DocLor',
}
