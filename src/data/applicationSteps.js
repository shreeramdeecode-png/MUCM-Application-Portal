import { paymentOptions } from './applicationFormOptions.js'
import { getTransferMdProgramCodes } from '../utils/programTypes.js'

/**
 * Build application steps with dynamic dropdown options.
 * Pass an `options` map (category name → string[]) from useDropdownOptions.
 * Any missing key falls back to the static export above.
 */
export function buildApplicationSteps(dynOptions = {}, dynPrograms = [], dynDocRequirements = []) {
  function opt(categoryName, fallback) {
    const v = dynOptions[categoryName]
    return Array.isArray(v) && v.length > 0 ? v : fallback
  }

  const programTypeOptions = dynPrograms.length > 0
    ? dynPrograms.map((p) => ({
        value: p.code,
        label: p.name,
        description: p.description && p.description !== '—' ? p.description : undefined,
      }))
    : []

  const transferMdProgramCodes = getTransferMdProgramCodes(dynPrograms)
  const transferCreditsShowWhen = { field: 'programType', anyOf: transferMdProgramCodes }

  // Build sub-program options dynamically based on selected program
  // This will be filtered in the component based on programType value
  const subProgramsByProgram = {}
  dynPrograms.forEach((p) => {
    if (Array.isArray(p.subPrograms) && p.subPrograms.length > 0) {
      subProgramsByProgram[p.code] = p.subPrograms.map((sp) => ({ value: sp, label: sp }))
    }
  })

  // Build document fields dynamically from settings_document_requirements
  function normalizeAccept(raw) {
    return String(raw ?? 'PDF').split(',').map((t) => {
      const s = t.trim()
      if (!s) return ''
      return s.startsWith('.') ? s.toLowerCase() : `.${s.toLowerCase()}`
    }).filter(Boolean).join(',')
  }

  function labelToFieldName(label) {
    return String(label ?? '').trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (c) => c.toLowerCase())
  }

  /** Backend / portal keys → canonical form field names (must match DOCUMENT_TYPE_BY_FIELD in ApplicationPage). */
  const KNOWN_DOC_SLUG_TO_FORM = {
    passport: 'passport',
    bank_statement: 'bankStatement',
    bankstatement: 'bankStatement',
    premedical_bachelor_ug_hsc_certificate: 'preMedTranscript',
    secondary_11grade: 'grade11Transcript',
    cv_resume: 'cv',
    cv: 'cv',
    passport_photo: 'passportPhoto',
    other_professional_transcripts: 'otherProfessionalTranscripts',
    exam_results_marksheet: 'examResults',
    sponsor_signed_financial_form: 'sponsorSignedFinancialForm',
    review_signature_document: 'reviewSignatureUpload',
  }

  function normalizeDocSlug(raw) {
    return String(raw ?? '')
      .trim()
      .toLowerCase()
      .replace(/-/g, '_')
  }

  /**
   * Map API document-requirements rows to stable form keys used for uploads and DB payloads.
   * Label-derived names like `passports` would bypass upload — avoid that.
   */
  function resolveDocumentFormFieldName(doc) {
    const slugCandidates = [
      doc.fieldKey,
      doc.field_key,
      doc.code,
      doc.slug,
      doc.key,
      doc.documentKey,
      doc.document_key,
    ]
    for (const candidate of slugCandidates) {
      const norm = normalizeDocSlug(candidate).replace(/^_+|_+$/g, '')
      if (norm && KNOWN_DOC_SLUG_TO_FORM[norm]) {
        return KNOWN_DOC_SLUG_TO_FORM[norm]
      }
    }

    const raw = String(doc?.name ?? '').trim()
    const lower = raw.toLowerCase()
    if (!lower) {
      return labelToFieldName(doc?.name)
    }

    if (/passport[-\s]*(size|photo|photograph)|passport[-\s]*size\s*photograph|headshot/i.test(lower)) {
      return 'passportPhoto'
    }
    if (/\bpassport(s)?\b/i.test(lower)) {
      return 'passport'
    }
    if (/bank\s*statement/i.test(lower)) {
      return 'bankStatement'
    }
    if (/11(th)?\s*grade|secondary\s*11|\b11\s*grade\b/i.test(lower)) {
      return 'grade11Transcript'
    }
    if (/premedical|pre-med|bachelor|undergraduate|\b12(th)?\s*grade\b|\bhsc\b|\bug\b.*transcript/i.test(lower)) {
      return 'preMedTranscript'
    }
    if (/\bc\.?\s*v\.?\b|curriculum\s*vitae|\bresume\b/i.test(lower)) {
      return 'cv'
    }
    if (/mcat|neet|ucat|exam\s*results|marksheet/i.test(lower)) {
      return 'examResults'
    }
    if (/other\s*professional|certification|award/i.test(lower)) {
      return 'otherProfessionalTranscripts'
    }
    if (/sponsor.*financial|financial\s*declaration|signed\s*sponsor/i.test(lower)) {
      return 'sponsorSignedFinancialForm'
    }
    if (/review\s*signature|signature\s*document/i.test(lower)) {
      return 'reviewSignatureUpload'
    }

    return labelToFieldName(doc.name)
  }

  const dynamicDocFields = []
  const seenDocFieldNames = new Set()
  for (const doc of dynDocRequirements) {
    const name = resolveDocumentFormFieldName(doc)
    if (seenDocFieldNames.has(name)) {
      continue
    }
    seenDocFieldNames.add(name)
    dynamicDocFields.push({
      name,
      label: doc.name,
      type: 'file',
      required: Boolean(doc.required),
      accept: normalizeAccept(doc.acceptedTypes) || '.pdf,.jpg,.jpeg,.png',
      maxFileSizeMB: doc.maxSizeMb ?? 10,
      helper: `Accepted: ${doc.acceptedTypes} · Max ${doc.maxSizeMb ?? 10} MB`,
    })
  }

const educationDefaultItem = {
  institution: '',
  address: '',
  country: '',
  startDate: '',
  endDate: '',
  degree: '',
  fieldOfStudy: '',
  gpa: '',
}

const experienceDefaultItem = {
  type: '',
  organization: '',
  role: '',
  startDate: '',
  endDate: '',
  hoursPerWeek: '',
  description: '',
}

const transferDefaultItem = {
  institution: '',
  courses: '',
}

  return [
  {
    id: 'personalDetails',
    title: 'Personal Details',
    description: 'Identity, contact & address',
    fields: [
      {
        name: 'title',
        label: 'Title',
        type: 'select',
        required: true,
        options: opt('Personal Details - Title', []),
        placeholder: 'Select',
        section: 'Identity',
        sectionSubtitle: 'Legal name as it appears on your passport or government ID',
      },
      { name: 'surname', label: 'Surname / Family Name', type: 'text', required: true, section: 'Identity' },
      { name: 'firstName', label: 'First Name / Given Names', type: 'text', required: true, section: 'Identity' },
      { name: 'middleName', label: 'Middle Name(s)', type: 'text', helper: 'As shown on official documents', section: 'Identity' },
      { name: 'preferredName', label: 'Preferred Name', type: 'text', helper: "Name you'd like to be called", section: 'Identity' },
      {
        name: 'pronouns',
        label: 'Pronouns',
        type: 'select',
        options: opt('Personal Details - Pronouns', []),
        placeholder: 'Select pronouns',
        section: 'Identity',
      },
      {
        name: 'nameChanged',
        label: 'Name Change',
        type: 'text',
        helper: 'If you have changed your name in the last five years',
        section: 'Identity',
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        required: true,
        options: opt('Personal Details - Gender', []),
        placeholder: 'Select gender',
        section: 'Identity',
      },
      { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true, helper: 'DD/MM/YYYY', section: 'Identity' },
      {
        name: 'ethnicity',
        label: 'Ethnicity / Race',
        type: 'select',
        options: opt('Personal Details - Ethnicity', []),
        placeholder: 'Select ethnicity',
        section: 'Identity',
      },
      {
        name: 'citizenship',
        label: 'Citizenship',
        type: 'country',
        required: true,
        section: 'Citizenship & Immigration',
        sectionSubtitle: 'Your nationality and immigration details required for enrollment',
      },
      {
        name: 'countryOfResidence',
        label: 'Country of Residence',
        type: 'country',
        required: true,
        helper: 'Where you currently live',
        section: 'Citizenship & Immigration',
      },
      { name: 'passportNumber', label: 'Passport Number', type: 'text', helper: 'As shown on your valid passport', section: 'Citizenship & Immigration' },
      {
        name: 'passportExpiry',
        label: 'Passport Expiry Date',
        type: 'date',
        helper: 'Must be valid for duration of study',
        section: 'Citizenship & Immigration',
      },
      {
        name: 'visaStatus',
        label: 'Visa / Immigration Status',
        type: 'select',
        required: true,
        options: opt('Personal Details - Visa/Immigration Status', []),
        placeholder: 'Select status',
        section: 'Citizenship & Immigration',
      },
      {
        name: 'phoneHome',
        label: 'Home Phone',
        type: 'tel',
        helper: 'Optional',
        section: 'Contact Information',
        sectionSubtitle: 'Email is the primary mode of communication for admissions',
      },
      {
        name: 'phoneMobile',
        label: 'Mobile Phone',
        type: 'tel',
        required: true,
        helper: 'Include country code (e.g., +1)',
        section: 'Contact Information',
      },
      { name: 'email', label: 'Email Address', type: 'email', required: true, section: 'Contact Information' },
      { name: 'permanentAddress', label: 'Street Address', type: 'textarea', required: true, fullWidth: true, section: 'Permanent Address', sectionSubtitle: 'Your primary residential address' },
      { name: 'city', label: 'City', type: 'text', required: true, section: 'Permanent Address' },
      { name: 'stateProvince', label: 'State / Province', type: 'text', section: 'Permanent Address' },
      { name: 'postalCode', label: 'Postal / Zip Code', type: 'text', required: true, section: 'Permanent Address' },
      { name: 'country', label: 'Country', type: 'country', required: true, section: 'Permanent Address' },
      {
        name: 'sameAsPermanent',
        label: 'Mailing address is the same as permanent address',
        type: 'checkbox',
        fullWidth: true,
        defaultValue: true,
        section: 'Mailing Address',
        sectionSubtitle: 'Address where official correspondence will be sent',
      },
      {
        name: 'mailingAddress',
        label: 'Mailing Street Address',
        type: 'textarea',
        fullWidth: true,
        section: 'Mailing Address',
        showWhen: { field: 'sameAsPermanent', equals: false },
      },
      {
        name: 'mailingCity',
        label: 'Mailing City',
        type: 'text',
        section: 'Mailing Address',
        showWhen: { field: 'sameAsPermanent', equals: false },
      },
      {
        name: 'mailingStateProvince',
        label: 'Mailing State / Province',
        type: 'text',
        section: 'Mailing Address',
        showWhen: { field: 'sameAsPermanent', equals: false },
      },
      {
        name: 'mailingPostalCode',
        label: 'Mailing Postal / Zip Code',
        type: 'text',
        section: 'Mailing Address',
        showWhen: { field: 'sameAsPermanent', equals: false },
      },
      {
        name: 'mailingCountry',
        label: 'Mailing Country',
        type: 'country',
        section: 'Mailing Address',
        showWhen: { field: 'sameAsPermanent', equals: false },
      },
    ],
  },
  {
    id: 'emergencyContact',
    title: 'Emergency Contact',
    description: 'Emergency & family information',
    fields: [
      {
        name: 'contactName',
        label: 'Full Name',
        type: 'text',
        required: true,
        section: 'Emergency Contact',
        sectionSubtitle: 'Person to contact in case of emergency during your studies',
      },
      {
        name: 'relationship',
        label: 'Relationship',
        type: 'select',
        required: true,
        options: opt('Emergency Contact - Relationship', []),
        placeholder: 'Select relationship',
        section: 'Emergency Contact',
      },
      {
        name: 'contactPhone',
        label: 'Phone Number',
        type: 'tel',
        required: true,
        helper: 'Include country code',
        section: 'Emergency Contact',
      },
      { name: 'contactEmail', label: 'Email Address', type: 'email', required: true, section: 'Emergency Contact' },
      { name: 'contactCountry', label: 'Country of Residence', type: 'country', section: 'Emergency Contact' },
      {
        name: 'contactAddress',
        label: 'Home Address',
        type: 'textarea',
        fullWidth: true,
        helper: 'If different from your permanent address',
        section: 'Emergency Contact',
      },
      {
        name: 'fatherName',
        label: 'Father Full Name',
        type: 'text',
        section: 'Parent / Guardian Information',
        sectionSubtitle: 'Required for minors; recommended for all applicants',
      },
      { name: 'fatherOccupation', label: 'Father Occupation', type: 'text', section: 'Parent / Guardian Information' },
      { name: 'fatherEmail', label: 'Father Email Address', type: 'email', section: 'Parent / Guardian Information' },
      { name: 'fatherPhone', label: 'Father Phone Number', type: 'tel', section: 'Parent / Guardian Information' },
      { name: 'motherName', label: 'Mother Full Name', type: 'text', section: 'Parent / Guardian Information' },
      { name: 'motherOccupation', label: 'Mother Occupation', type: 'text', section: 'Parent / Guardian Information' },
      { name: 'motherEmail', label: 'Mother Email Address', type: 'email', section: 'Parent / Guardian Information' },
      { name: 'motherPhone', label: 'Mother Phone Number', type: 'tel', section: 'Parent / Guardian Information' },
    ],
  },
  {
    id: 'academicBackground',
    title: 'Academic Background',
    description: 'Education & qualifications',
    fields: [
      {
        name: 'educationEntries',
        type: 'repeatable',
        sectionTitle: 'Educational Background',
        sectionSubtitle: 'List all institutions attended, starting with the most recent',
        sectionNote:
          'Include your most recent qualifying education and any prior institutions relevant to your application.',
        itemBadge: 'Institution',
        addLabel: 'Add Another Institution',
        minItems: 1,
        defaultItem: educationDefaultItem,
        itemFields: [
          {
            name: 'institution',
            label: 'Institution Name',
            type: 'text',
            required: true,
            placeholder: 'e.g., University of Lagos',
          },
          {
            name: 'country',
            label: 'Country',
            type: 'country',
            required: true,
            placeholder: 'Search country...',
          },
          {
            name: 'address',
            label: 'Address / City',
            type: 'text',
            required: true,
            placeholder: 'City, State',
          },
          {
            name: 'fieldOfStudy',
            label: 'Field of Study',
            type: 'text',
            required: true,
            helper: 'e.g., Biology, Pre-Medicine',
            placeholder: 'Major / Field of study',
          },
          {
            name: 'degree',
            label: 'Degree / Qualification',
            type: 'text',
            required: true,
            placeholder: 'e.g., Bachelor of Science',
          },
          {
            name: 'gpa',
            label: 'GPA / Grade',
            type: 'text',
            helper: 'e.g., 3.5/4.0 or First Class',
            placeholder: 'GPA or classification',
          },
          { name: 'startDate', label: 'Start Date', type: 'month' },
          { name: 'endDate', label: 'End / Expected End Date', type: 'month' },
        ],
      },
      {
        name: '__abAdmissionNote',
        type: 'note',
        noteTitle: 'Admission Sought For',
        noteBody: 'Select the program and intake period you are applying for',
        fullWidth: true,
      },
      {
        name: 'programType',
        label: 'Program',
        type: 'radioGroup',
        required: true,
        options: programTypeOptions,
        disabled: programTypeOptions.length === 0,
        fullWidth: true,
      },
      {
        name: 'transferCredits',
        type: 'repeatable',
        sectionTitle: 'Transfer Credits',
        sectionSubtitle: 'For students transferring from another medical school',
        sectionNote:
          'If you are transferring from another medical school or have completed relevant coursework elsewhere, please list the details below.',
        itemBadge: 'Transfer',
        addLabel: 'Add Another Transfer Credit',
        minItems: 1,
        defaultItem: transferDefaultItem,
        itemFields: [
          {
            name: 'institution',
            label: 'Institution Name & Address',
            type: 'text',
            placeholder: "e.g., St. George's University, Grenada",
          },
          {
            name: 'courses',
            label: 'Courses Completed & Passed',
            type: 'text',
            placeholder: 'e.g., Anatomy, Biochemistry',
          },
        ],
        showWhen: transferCreditsShowWhen,
        fullWidth: true,
        variant: 'transfer',
      },
      {
        name: 'subProgram',
        label: 'Sub-Program',
        type: 'select',
        options: [],
        dynamicOptions: subProgramsByProgram,
        placeholder: 'Select sub-program (optional)',
        helper: 'If unsure, leave this blank and our admissions team will guide you',
        showWhen: { field: 'programType', notEquals: '' },
      },
      {
        name: 'semester',
        label: 'Preferred Semester',
        type: 'select',
        required: true,
        options: opt('Admission Sought - Preferred Semester', []),
        placeholder: 'Select semester',
      },
      {
        name: 'year',
        label: 'Preferred Year',
        type: 'select',
        required: true,
        options: opt('Admission Sought - Preferred Year', []),
        placeholder: 'Select year',
      },
      {
        name: '__abEnglishNote',
        type: 'note',
        noteTitle: 'English Language Proficiency',
        noteBody: 'Required for non-native English speakers',
        noteCallout:
          'If English is not your first language, you may be required to submit proof of English proficiency. Confirm speaking and writing proficiency below, then add your test details if applicable.',
        fullWidth: true,
      },
      {
        name: 'englishProficiency',
        label: 'Proficiency Level',
        type: 'select',
        required: true,
        options: opt('English Language Proficiency - Proficiency Level', []),
        defaultValue: 'Speaking and writing',
        placeholder: 'Select',
      },
      {
        name: 'otherLanguagesSpoken',
        label: 'Other Language Spoken',
        type: 'textarea',
        fullWidth: true,
        helper: 'Optional — list any languages you speak in addition to English.',
        placeholder: 'e.g., Hindi (native), Spanish (intermediate)',
      },
      {
        name: 'englishTestType',
        label: 'Test Type',
        type: 'select',
        options: opt('English Language Proficiency - Test Type', []),
        placeholder: 'Select test',
        showWhen: { field: 'englishProficiency', notEquals: '' },
      },
      {
        name: 'englishTestScore',
        label: 'Overall Score',
        type: 'text',
        helper: 'e.g., TOEFL 90, IELTS 7.0',
        placeholder: 'Enter score',
        showWhen: { field: 'englishProficiency', notEquals: '' },
      },
      {
        name: '__abTestNote',
        type: 'note',
        noteTitle: 'Standardized Tests',
        noteBody: 'Optional — MUCM does not require MCAT/UCAT for admission',
        noteCallout:
          'MUCM follows a holistic admissions process and does not require standardized test scores (MCAT, UCAT, etc.). However, if you have taken any of these exams, you may include your scores to strengthen your application.',
        fullWidth: true,
      },
      {
        name: 'hasStandardizedTest',
        label: 'Have you taken a standardized test?',
        type: 'yesNo',
        fullWidth: true,
      },
      {
        name: 'standardizedTestType',
        label: 'Test Type',
        type: 'select',
        options: opt('Standardized Tests - Test Type', []),
        placeholder: 'Select test',
        showWhen: { field: 'hasStandardizedTest', equals: 'Yes' },
      },
      {
        name: 'standardizedTestScore',
        label: 'Score',
        type: 'text',
        helper: 'Overall or composite score',
        placeholder: 'Enter score',
        showWhen: { field: 'hasStandardizedTest', equals: 'Yes' },
      },
    ],
  },
  {
    id: 'experienceMotivation',
    title: 'Experience & Motivation',
    description: 'Your journey to medicine',
    fields: [
      {
        name: 'experiences',
        type: 'repeatable',
        sectionTitle: 'Experience & Activities',
        sectionSubtitle: 'Clinical, research, volunteer, leadership, and work experience',
        sectionNote:
          'List your most meaningful experiences that demonstrate your commitment to medicine and personal growth. Include clinical exposure, research, community service, leadership roles, and relevant employment. This section is optional but strongly recommended.',
        itemBadge: 'Experience',
        addLabel: 'Add Another Experience',
        minItems: 1,
        defaultItem: experienceDefaultItem,
        itemFields: [
          {
            name: 'type',
            label: 'Type of Experience',
            type: 'select',
            options: opt('Experience & Motivation - Type of Experience', []),
            placeholder: 'Select type',
          },
          {
            name: 'organization',
            label: 'Organization / Institution',
            type: 'text',
            placeholder: "e.g., St. John's Hospital",
          },
          { name: 'role', label: 'Role / Position', type: 'text', placeholder: 'e.g., Clinical Intern' },
          {
            name: 'hoursPerWeek',
            label: 'Hours per Week',
            type: 'text',
            helper: 'Approximate average',
            placeholder: 'e.g., 20',
          },
          { name: 'startDate', label: 'Start Date', type: 'month' },
          {
            name: 'endDate',
            label: 'End Date',
            type: 'month',
            helper: 'Leave blank if ongoing',
          },
          {
            name: 'description',
            label: 'Brief Description',
            type: 'textarea',
            fullWidth: true,
            helper: 'Describe your responsibilities and what you learned (max 150 words)',
            placeholder: 'Describe your role, responsibilities, and key takeaways...',
          },
        ],
      },
      {
        name: '__expStatementNote',
        type: 'note',
        noteTitle: 'Personal Statement',
        noteBody: 'Tell us about your journey and motivation for pursuing medicine',
        noteCallout:
          'Your personal statement is an opportunity to share your unique story. Explain why you want to study medicine, what experiences have shaped your decision, and why you believe MUCM is the right fit for you. Aim for 300–500 words.',
        fullWidth: true,
      },
      {
        name: 'whyMedicine',
        label: 'Why do you want to study medicine?',
        type: 'textarea',
        required: true,
        fullWidth: true,
        helper: 'What inspired you to pursue a career in medicine?',
        placeholder: 'Share the experiences, events, or people that inspired your interest...',
      },
      {
        name: 'whyMUCM',
        label: 'Why MUCM?',
        type: 'textarea',
        required: true,
        fullWidth: true,
        helper: 'What attracts you to Metropolitan University College of Medicine?',
        placeholder: 'Describe what draws you to MUCM specifically...',
      },
      {
        name: 'personalStatement',
        label: 'Personal Statement Essay',
        type: 'textarea',
        required: true,
        fullWidth: true,
        helper: 'Combine your story, motivation, and fit in one essay (300–500 words recommended)',
        placeholder: 'Write your personal statement here...',
      },
    ],
  },
  {
    id: 'disclosures',
    title: 'Disclosures',
    description: 'Additional information',
    fields: [
      {
        name: '__disciplineNote',
        type: 'note',
        noteTitle: 'Discipline Information',
        noteBody: 'Please answer honestly — each case is reviewed individually',
        noteCallout:
          'A "Yes" answer does not automatically disqualify your application. Each case is reviewed individually by our admissions committee with full consideration of context.',
        fullWidth: true,
      },
      {
        name: 'hasBeenDisciplined',
        label:
          'Have you ever been placed on probation, suspended, removed, dismissed, or expelled from any school or academic program since 9th grade?',
        type: 'yesNo',
        required: true,
        fullWidth: true,
      },
      {
        name: 'disciplineActionExplanation',
        label: 'Please provide an explanation',
        type: 'textarea',
        fullWidth: true,
        required: true,
        helper: 'Include approximate dates of each incident',
        placeholder: 'Please provide details and approximate dates...',
        showWhen: { field: 'hasBeenDisciplined', equals: 'Yes' },
      },
      {
        name: 'hasBeenConvicted',
        label:
          'Other than traffic offenses, have you ever been convicted of any misdemeanor, felony, or other crime?',
        type: 'yesNo',
        required: true,
        fullWidth: true,
      },
      {
        name: 'convictionExplanation',
        label: 'Please provide an explanation',
        type: 'textarea',
        fullWidth: true,
        required: true,
        helper: 'Include approximate dates of each incident',
        placeholder: 'Please provide details and approximate dates...',
        showWhen: { field: 'hasBeenConvicted', equals: 'Yes' },
      },
      {
        name: '__disabilityNote',
        type: 'note',
        noteTitle: 'Disability & Accommodation',
        noteBody: 'MUCM is committed to providing equal opportunity for all students',
        noteCallout:
          'This information is collected solely to ensure we can provide appropriate support and accommodations. It will not affect your admissions decision.',
        fullWidth: true,
      },
      {
        name: 'hasDisability',
        label:
          'Do you have a disability, chronic illness, or medical condition that may affect your studies?',
        type: 'yesNo',
        required: true,
        fullWidth: true,
      },
      {
        name: 'disabilityDetails',
        label: 'Please describe',
        type: 'textarea',
        fullWidth: true,
        helper: 'This information is kept confidential',
        showWhen: { field: 'hasDisability', equals: 'Yes' },
      },
      {
        name: 'requiresAccommodation',
        label:
          'Will you require any special accommodations during your studies (e.g., extended exam time, accessible facilities)?',
        type: 'yesNo',
        required: true,
        fullWidth: true,
      },
      {
        name: 'accommodationDetails',
        label: 'Accommodation details',
        type: 'textarea',
        fullWidth: true,
        helper: 'Describe the accommodations you would need',
        showWhen: { field: 'requiresAccommodation', equals: 'Yes' },
      },
      {
        name: 'howHeard',
        label: 'Referral Source',
        type: 'select',
        options: opt('Disclosures - Referral Source', []),
        placeholder: 'Select an option',
        section: 'Referral',
      },
    ],
  },
  {
    id: 'documents',
    title: 'Documents',
    description: 'Upload supporting files',
    fields: [
      {
        name: '__docIntro',
        type: 'note',
        noteTitle: 'Supporting Documents',
        noteBody:
          'Required documents are listed first, then optional uploads. Use PDF, JPEG, or PNG unless noted; each file must be within the maximum size shown for that field (typically 5–10 MB).',
        fullWidth: true,
      },
      ...dynamicDocFields,
    ],
  },
  {
    id: 'financialSupport',
    title: 'Financial Support',
    description: 'Funding & sponsorship',
    fields: [
      {
        name: '__finHdr',
        type: 'note',
        noteTitle: 'Financial Support Declaration',
        noteBody: 'How your education at MUCM will be funded',
        noteCallout:
          'All applicants must complete this financial support declaration. This information is required to verify your ability to meet tuition and living expenses during your studies at Metropolitan University College of Medicine. Please select the option that best describes your funding arrangement.',
        fullWidth: true,
      },
      {
        name: '__finStudentHdr',
        type: 'note',
        noteTitle: 'Student Information',
        noteVariant: 'plain',
        fullWidth: true,
      },
      {
        name: 'studentName',
        label: 'Student Full Name',
        type: 'text',
        readOnly: true,
        fullWidth: true,
        helper: 'Filled automatically from your Personal Details.',
        placeholder: '—',
      },
      {
        name: 'studentId',
        label: 'Student ID',
        type: 'text',
        helper: 'Leave blank if not yet assigned',
        placeholder: 'Will be assigned upon admission',
      },
      {
        name: 'programOfStudy',
        label: 'Program of Study',
        type: 'text',
        readOnly: true,
        fullWidth: true,
        helper: 'Filled automatically from Admission Sought (program & sub-program).',
        placeholder: '—',
      },
      {
        name: 'expectedStartDate',
        label: 'Expected Start Date',
        type: 'text',
        readOnly: true,
        fullWidth: true,
        helper: 'Filled automatically from your preferred semester and year.',
        placeholder: '—',
      },
      {
        name: '__finPayHdr',
        type: 'note',
        noteTitle: 'Select Payment Option',
        noteBody: 'Choose the option that best describes how your education will be funded',
        noteVariant: 'plain',
        fullWidth: true,
      },
      {
        name: 'paymentOption',
        label: 'Payment option',
        type: 'radioGroup',
        required: true,
        options: paymentOptions,
        fullWidth: true,
      },
      {
        name: 'selfFundedSource',
        label: 'Source of Funds',
        type: 'textarea',
        required: true,
        fullWidth: true,
        helper: 'e.g., Personal savings, family funds, student loan, etc.',
        placeholder: 'Please describe the source(s) of your funding...',
        showWhen: { field: 'paymentOption', equals: 'A' },
      },
      {
        name: '__finOptB',
        type: 'note',
        noteTitle: 'Individual Sponsor Details',
        noteBadge: 'Option B',
        fullWidth: true,
        showWhen: { field: 'paymentOption', equals: 'B' },
      },
      {
        name: 'sponsorFullName',
        label: 'Sponsor Full Name',
        type: 'text',
        required: true,
        showWhen: { field: 'paymentOption', equals: 'B' },
      },
      {
        name: 'sponsorRelationship',
        label: 'Relationship to Student',
        type: 'text',
        required: true,
        showWhen: { field: 'paymentOption', equals: 'B' },
      },
      {
        name: 'sponsorOccupation',
        label: 'Occupation',
        type: 'text',
        showWhen: { field: 'paymentOption', equals: 'B' },
      },
      {
        name: 'sponsorEmployer',
        label: 'Employer / Business Name',
        type: 'text',
        showWhen: { field: 'paymentOption', equals: 'B' },
      },
      {
        name: 'sponsorAddress',
        label: 'Street Address',
        type: 'text',
        fullWidth: true,
        showWhen: { field: 'paymentOption', equals: 'B' },
      },
      {
        name: 'sponsorCity',
        label: 'City',
        type: 'text',
        showWhen: { field: 'paymentOption', equals: 'B' },
      },
      {
        name: 'sponsorState',
        label: 'State / Province',
        type: 'text',
        showWhen: { field: 'paymentOption', equals: 'B' },
      },
      {
        name: 'sponsorPostalCode',
        label: 'Postal Code',
        type: 'text',
        showWhen: { field: 'paymentOption', equals: 'B' },
      },
      {
        name: 'sponsorCountry',
        label: 'Country',
        type: 'country',
        showWhen: { field: 'paymentOption', equals: 'B' },
      },
      {
        name: 'sponsorPhone',
        label: 'Phone Number',
        type: 'tel',
        showWhen: { field: 'paymentOption', equals: 'B' },
      },
      {
        name: 'sponsorEmail',
        label: 'Email Address',
        type: 'email',
        showWhen: { field: 'paymentOption', equals: 'B' },
      },
      {
        name: '__finOptC',
        type: 'note',
        noteTitle: 'Organization Sponsor Details',
        noteBadge: 'Option C',
        fullWidth: true,
        showWhen: { field: 'paymentOption', equals: 'C' },
      },
      {
        name: 'orgName',
        label: 'Organization Name',
        type: 'text',
        required: true,
        showWhen: { field: 'paymentOption', equals: 'C' },
      },
      {
        name: 'orgContactPerson',
        label: 'Contact Person',
        type: 'text',
        required: true,
        showWhen: { field: 'paymentOption', equals: 'C' },
      },
      {
        name: 'orgContactTitle',
        label: 'Contact Person Title',
        type: 'text',
        showWhen: { field: 'paymentOption', equals: 'C' },
      },
      {
        name: 'orgAddress',
        label: 'Organization Street Address',
        type: 'text',
        fullWidth: true,
        showWhen: { field: 'paymentOption', equals: 'C' },
      },
      {
        name: 'orgCity',
        label: 'Organization City',
        type: 'text',
        showWhen: { field: 'paymentOption', equals: 'C' },
      },
      {
        name: 'orgState',
        label: 'Organization State / Province',
        type: 'text',
        showWhen: { field: 'paymentOption', equals: 'C' },
      },
      {
        name: 'orgPostalCode',
        label: 'Organization Postal Code',
        type: 'text',
        showWhen: { field: 'paymentOption', equals: 'C' },
      },
      {
        name: 'orgCountry',
        label: 'Organization Country',
        type: 'country',
        showWhen: { field: 'paymentOption', equals: 'C' },
      },
      {
        name: 'orgPhone',
        label: 'Organization Phone Number',
        type: 'tel',
        showWhen: { field: 'paymentOption', equals: 'C' },
      },
      {
        name: 'orgEmail',
        label: 'Organization Email Address',
        type: 'email',
        showWhen: { field: 'paymentOption', equals: 'C' },
      },
      {
        name: '__finSponsorSignedForm',
        type: 'note',
        noteTitle: 'Sponsor-signed Step 7 form',
        noteBody:
          'Download the Step 7 financial declaration form and have your sponsor (individual or organization) complete and sign it. Then upload the signed PDF below.',
        noteVariant: 'plain',
        fullWidth: true,
        showWhen: { or: [{ field: 'paymentOption', equals: 'B' }, { field: 'paymentOption', equals: 'C' }] },
        downloadLink: {
          href: '/forms/mucm-step-7-sponsor-financial-declaration.pdf',
          fileName: 'mucm-step-7-sponsor-financial-declaration.pdf',
          label: 'Download Step 7 sponsor form (PDF)',
          prefillFromValues: true,
        },
      },
      {
        name: 'sponsorSignedFinancialForm',
        label: 'Upload signed sponsor form',
        type: 'file',
        accept: '.pdf',
        maxFileSizeMB: 10,
        required: true,
        fullWidth: true,
        helper: 'Signed PDF from the downloaded Step 7 form (max 10 MB).',
        showWhen: { or: [{ field: 'paymentOption', equals: 'B' }, { field: 'paymentOption', equals: 'C' }] },
      },
      {
        name: '__finDocsHdr',
        type: 'note',
        noteTitle: 'Supporting financial documentation',
        noteBody: 'Check each document you are including with this application',
        noteVariant: 'plain',
        fullWidth: true,
        showWhen: { field: 'paymentOption', notEquals: '' },
      },
      {
        name: 'hasBankStatement',
        label:
          'Bank statement(s) showing sufficient funds to cover at least one year of tuition and living expenses (minimum 3 months recent)',
        type: 'checkbox',
        fullWidth: true,
        showWhen: { field: 'paymentOption', notEquals: '' },
      },
      {
        name: 'hasIncomeProof',
        label:
          'Proof of income (pay stubs, tax returns, or employment letter) — for self-funded or individual sponsor',
        type: 'checkbox',
        fullWidth: true,
        showWhen: { field: 'paymentOption', notEquals: '' },
      },
      {
        name: 'hasSponsorLetter',
        label:
          'Sponsor letter / affidavit of support — signed letter from sponsor confirming financial commitment',
        type: 'checkbox',
        fullWidth: true,
        showWhen: { field: 'paymentOption', notEquals: '' },
      },
      {
        name: 'hasScholarshipLetter',
        label: 'Scholarship or grant award letter — official documentation from the awarding body',
        type: 'checkbox',
        fullWidth: true,
        showWhen: { field: 'paymentOption', notEquals: '' },
      },
      {
        name: 'hasLoanApproval',
        label: 'Student loan pre-approval or approval letter from a recognized financial institution',
        type: 'checkbox',
        fullWidth: true,
        showWhen: { field: 'paymentOption', notEquals: '' },
      },
      {
        name: '__finCertHdr',
        type: 'note',
        noteTitle: 'Certification & Declaration',
        noteBody: 'Please read carefully and confirm',
        noteVariant: 'plain',
        fullWidth: true,
        showWhen: { field: 'paymentOption', notEquals: '' },
      },
      {
        name: '__finStudentCert',
        type: 'note',
        noteTitle: 'Student Certification',
        noteVariant: 'sub',
        fullWidth: true,
        showWhen: { field: 'paymentOption', notEquals: '' },
      },
      {
        name: 'certifyAccurate',
        label:
          'I certify that all financial information provided in this form is true, complete, and accurate to the best of my knowledge.',
        type: 'checkbox',
        required: true,
        fullWidth: true,
        showWhen: { field: 'paymentOption', notEquals: '' },
      },
      {
        name: 'certifyFinancialResponsibility',
        label:
          'I understand that I am ultimately responsible for ensuring that all tuition, fees, and living expenses are paid in full by the published deadlines, regardless of the funding source indicated above.',
        type: 'checkbox',
        required: true,
        fullWidth: true,
        showWhen: { field: 'paymentOption', notEquals: '' },
      },
      {
        name: 'certifyDate',
        label: 'Date of Certification',
        type: 'date',
        helper: 'DD/MM/YYYY',
        showWhen: { field: 'paymentOption', notEquals: '' },
      },
      {
        name: 'studentSignatureMethod',
        label: 'Your signature',
        type: 'radioGroup',
        required: true,
        defaultValue: 'type',
        options: [
          {
            value: 'upload',
            label: 'Upload signature image',
            description: 'PNG or JPEG (max 5 MB). Your file is shown as a preview.',
          },
          {
            value: 'type',
            label: 'Type your name',
            description: 'Handwriting-style preview from your name.',
          },
        ],
        fullWidth: true,
        showWhen: { field: 'paymentOption', equals: 'A' },
      },
      {
        name: 'studentSignatureUpload',
        label: 'Upload signature',
        type: 'file',
        accept: '.png,.jpg,.jpeg',
        maxFileSizeMB: 5,
        fullWidth: true,
        compact: true,
        storeAsDataUrl: true,
        required: true,
        helper: 'PNG or JPEG, max 5 MB.',
        showWhen: {
          and: [
            { field: 'paymentOption', equals: 'A' },
            { field: 'studentSignatureMethod', equals: 'upload' },
          ],
        },
      },
      {
        name: 'studentSignatureTyped',
        label: 'Type to sign',
        type: 'text',
        signaturePreview: true,
        signaturePreviewCompact: true,
        fullWidth: true,
        required: true,
        placeholder: 'Type your full name as on official documents',
        helper: 'Quick pen-style preview (not a formal font).',
        showWhen: {
          and: [
            { field: 'paymentOption', equals: 'A' },
            { field: 'studentSignatureMethod', equals: 'type' },
          ],
        },
      },
      {
        name: '__finSponsorCertHdr',
        type: 'note',
        noteTitle: 'Sponsor / Organization Certification',
        noteBadge: 'Requires sponsor action',
        noteBody:
          'The sponsor or authorized representative must complete the downloaded Step 7 form (uploaded above) and confirm the statements below. Keep a copy of the signed PDF for your records.',
        fullWidth: true,
        showWhen: { or: [{ field: 'paymentOption', equals: 'B' }, { field: 'paymentOption', equals: 'C' }] },
      },
      {
        name: 'sponsorCertifySupport',
        label:
          'Sponsor confirms they will provide the financial support necessary for the student to complete their program at MUCM (tuition, living expenses, and associated costs), per the applicable sponsor type selected above.',
        type: 'checkbox',
        fullWidth: true,
        showWhen: { or: [{ field: 'paymentOption', equals: 'B' }, { field: 'paymentOption', equals: 'C' }] },
      },
      {
        name: 'sponsorCertifyDate',
        label: 'Sponsor Certification Date',
        type: 'date',
        helper: 'DD/MM/YYYY',
        showWhen: { or: [{ field: 'paymentOption', equals: 'B' }, { field: 'paymentOption', equals: 'C' }] },
      },
    ],
  },
  {
    id: 'reviewSubmit',
    title: 'Review & Submit',
    description: 'Verify your application',
    fields: [
      {
        name: '__reviewBullets',
        type: 'note',
        noteTitle: 'Authorization & declaration',
        reviewBullets: [
          'Confirm all information in this application (including any supplemental information and uploaded documents) is factually true and honestly presented, and that you are the person submitting this application.',
          'Acknowledge that any misrepresentation or omission of facts may result in denial of admission or dismissal from the university.',
          'Consent to MUCM contacting the institutions and references listed in this application for verification purposes.',
        ],
        fullWidth: true,
      },
      {
        name: 'applicationAgreement',
        label:
          'I have read and agree to the above authorization and declaration. I confirm that all information provided is accurate and complete to the best of my knowledge.',
        type: 'checkbox',
        required: true,
        fullWidth: true,
        declarationStyle: true,
      },
      {
        name: '__reviewSignatureNote',
        type: 'note',
        noteTitle: 'Applicant Signature',
        noteBody: 'Choose how you want to sign this declaration before submission.',
        fullWidth: true,
      },
      {
        name: 'reviewSignatureMethod',
        label: 'Your signature',
        type: 'radioGroup',
        required: true,
        defaultValue: 'type',
        options: [
          {
            value: 'upload',
            label: 'Upload signature image',
            description: 'PNG or JPEG (max 5 MB). Your file is shown as a preview.',
          },
          {
            value: 'type',
            label: 'Type your name',
            description: 'Handwriting-style preview from your name.',
          },
        ],
        fullWidth: true,
      },
      {
        name: 'reviewSignatureUpload',
        label: 'Upload signature',
        type: 'file',
        accept: '.png,.jpg,.jpeg,.webp',
        maxFileSizeMB: 5,
        fullWidth: true,
        compact: true,
        storeAsDataUrl: true,
        required: true,
        helper: 'PNG or JPEG image only, max 5 MB.',
        showWhen: { field: 'reviewSignatureMethod', equals: 'upload' },
      },
      {
        name: 'reviewSignatureTyped',
        label: 'Type to sign',
        type: 'text',
        signaturePreview: true,
        signaturePreviewCompact: true,
        fullWidth: true,
        required: true,
        placeholder: 'Type your full name as on official documents',
        helper: 'Quick pen-style preview (not a formal font).',
        showWhen: { field: 'reviewSignatureMethod', equals: 'type' },
      },
    ],
  },
]

}

// Static default — used before API responds (same as before)
export const applicationSteps = buildApplicationSteps({}, [], [])

export function flattenFieldDefinitions() {
  const list = []
  for (const step of applicationSteps) {
    for (const field of step.fields) {
      if (field.type === 'repeatable') {
        list.push(field)
        for (const sub of field.itemFields ?? []) {
          list.push({ ...sub, parentRepeatable: field.name })
        }
      } else {
        list.push(field)
      }
    }
  }
  return list
}