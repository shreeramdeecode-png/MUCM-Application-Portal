/**

 * Overlay targets for MUCM_Application_Form_Redesigned.pdf (Fitz coords, y↓).

 * Mapped from template underlines (ULINE) and input boxes (BOX).

 * @typedef {{ x0: number, x1: number, kind?: 'box' | 'line', line?: number, y0?: number, y1?: number }} PdfSlot

 */



const box = (x0, x1, y0, y1) => ({ x0, x1, y0, y1, kind: 'box' })

const line = (x0, x1, lineY) => ({ x0, x1, kind: 'line', line: lineY })



export const PAGE1_PASSPORT_PHOTO = { x0: 478, y0: 42, x1: 553, y1: 132 }



/** Checkbox centers [cx, cy] from template 8×8pt squares */

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

  p2SemFall: [397.4, 762.9],

  p2EngNative: [54.5, 781.9],

  p2EngFluent: [397.4, 781.9],

  p2EngIntermediate: [54.5, 777.8],

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

  p4HearGoogle: [54.5, 149.5],

  p4HearSocial: [152.8, 149.5],

  p4HearFriend: [214.1, 149.5],

  p4HearAgent: [283.1, 149.5],

  p4HearFair: [357.7, 149.5],

  p4HearYoutube: [424.9, 149.5],

  p4HearWhatsapp: [471.8, 149.5],

  p4HearAlumni: [54.5, 167.0],

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



/** Page 1 — title row is checkboxes only; names use underlines */

export const PAGE1_FIELDS = {

  surname: line(222, 352, 313.7),

  firstName: line(393, 525, 313.7),

  middleName: line(50, 266, 354.4),

  preferredName: line(308, 525, 354.4),

  nameChanged: line(50, 525, 395.1),

  dateOfBirth: box(40, 169, 403, 459),

  citizenship: box(169, 298, 403, 459),

  countryOfResidence: box(298, 426, 403, 459),

  visaStatus: box(426, 555, 403, 459),

  passportNumber: line(50, 181, 492.8),

  passportExpiry: line(222, 352, 492.8),

  email: line(50, 181, 533.5),

  phoneMobile: line(222, 352, 533.5),

  phoneHome: line(393, 525, 533.5),

  permanentAddress: box(41, 552, 542, 596),

  mailingAddress: box(50, 525, 561, 588),

  contactName: line(50, 266, 729.6),

  relationship: line(308, 525, 729.6),

  contactPhone: line(50, 181, 770.3),

  contactEmail: line(222, 352, 770.3),

  contactCountry: line(393, 525, 770.3),

  emergencyAddress: box(50, 525, 615, 643),

}



export const PAGE2_FIELDS = {

  fatherName: line(50, 181, 129.2),

  fatherEmail: line(222, 352, 120.4),

  fatherPhone: line(393, 525, 120.4),

  motherName: line(50, 181, 169.9),

  motherEmail: line(222, 352, 161.1),

  motherPhone: line(393, 525, 161.1),

  year: line(222, 352, 771.4),

  otherLanguages: line(308, 525, 786.0),

}



export const EDU_COLS = [

  { x0: 40, x1: 184 },

  { x0: 184, x1: 241 },

  { x0: 241, x1: 318 },

  { x0: 318, x1: 401 },

  { x0: 401, x1: 478 },

  { x0: 478, x1: 555 },

]



/** First education row sits in table cells; following rows on underlines */

export const EDU_FIRST_ROW = { y0: 232.8, y1: 275.7 }

export const EDU_ROW_LINES = [314.7, 354.1, 393.4, 432.8, 472.1]



const transferLine = (lineY) => ({

  inst: line(41, 272, lineY),

  courses: line(272, 555, lineY),

})



export const TRANSFER_ROWS = [

  { inst: line(41, 272, 157.9), courses: line(272, 555, 157.9) },

  transferLine(196.9),

  transferLine(236.3),

  transferLine(275.6),

  transferLine(315.0),

]



export const PAGE3_FIELDS = {

  englishTestScore: line(50, 181, 69.3),

  standardizedTest: line(222, 352, 69.3),

  disciplineExplain: box(41, 555, 404, 467),

  disabilityExplain: box(41, 555, 685, 735),

}



export const PAGE4_FIELDS = {

  howHeardOther: line(122, 266, 177.0),

}



export const PAGE5_FIELDS = {

  studentName: line(50, 266, 465.5),

  studentDob: line(308, 525, 465.5),

  studentEmail: line(50, 266, 506.2),

  studentPhone: line(308, 525, 506.2),

  sponsorName: line(60, 184, 727.2),

  sponsorEmail: line(225, 349, 727.2),

  sponsorPhone: line(390, 516, 727.2),

  sponsorRelation: line(60, 266, 767.9),

  sponsorCountry: line(308, 516, 767.9),

  selfFundedSource: box(42, 552, 522, 548),

}



export const PAGE6_FIELDS = {

  finStudentName: box(41, 298, 50, 74),

  finSponsorName: box(298, 555, 50, 74),

  finSignature: box(53, 293, 234, 264),

  finDate: box(302, 543, 234, 264),

  applicantName: line(50, 266, 591.6),

  applicantPlace: line(308, 525, 591.6),

  applicantSignature: box(41, 298, 599, 646),

  applicantDate: line(308, 525, 632.3),

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


