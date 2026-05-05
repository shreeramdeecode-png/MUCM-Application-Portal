import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import StepForm from '../components/application/StepForm.jsx'
import StepSidebar from '../components/application/StepSidebar.jsx'
import PrimaryButton from '../components/common/PrimaryButton.jsx'
import ProfileDropdown from '../components/common/ProfileDropdown.jsx'
import {
  createSupportTicket,
  fetchMySupportTickets,
  fetchPublishedFaqs,
  fetchSupportTicketCategories,
} from '../api/faqApi.js'
import { apiUrl } from '../config/baseUrl.js'
import { applicationSteps } from '../data/applicationSteps.js'
import { countries } from '../data/countries.js'
import {
  faqSections,
  faqSupport,
  moduleNavigation,
} from '../data/sidebarModulesContent.js'
import { usePersistentState } from '../hooks/usePersistentState.js'
import { getAutofillStudentInfo } from '../utils/studentInfoAutofill.js'
import { downloadApplicationSummaryPdf } from '../utils/applicationFormPdf.js'
import { getSingleFieldDisplayValue } from '../utils/submissionDisplay.js'
import { getSelectValues, isFieldVisible } from '../utils/formVisibility.js'
import {
  filterFaqsByContext,
  groupFaqRowsByCategory,
  sanitizeFaqHtml,
  searchFaqRows,
} from '../utils/faqUtils.js'

const crestLogo =
  'https://d2xsxph8kpxj0f.cloudfront.net/310519663394975842/o5YxQXzG37vUfAnZtRoyQg/mucm-crest-logo_aac17a92.png'
const SUBMISSIONS_KEY = 'mucm-submitted-applications'
const ACTIVE_APPLICATION_KEY = 'mucm-active-application'
const SUBMIT_COOLDOWN_DAYS = Number(import.meta.env.VITE_APPLICATION_RESUBMIT_COOLDOWN_DAYS) || 30
const DOCUMENT_TYPE_BY_FIELD = {
  passport: 'passport',
  bankStatement: 'bankStatement',
  preMedTranscript: 'preMedTranscript',
  grade11Transcript: 'grade11Transcript',
  cv: 'cv',
  passportPhoto: 'passportPhoto',
  otherProfessionalTranscripts: 'otherProfessionalTranscripts',
  examResults: 'examResults',
  sponsorSignedFinancialForm: 'sponsorSignedFinancialForm',
  reviewSignatureUpload: 'reviewSignatureDocument',
}
const BACKEND_DOCUMENT_LABELS = {
  passport: 'Passport',
  bank_statement: 'Bank Statement (Minimum 3 Months)',
  premedical_Bachelor_ug_HSC_Certificate: 'Premedical / Bachelor / Undergraduate / 12th Grade Transcript',
  Secondary_11grade: '11th Grade Transcript',
  cv_resume: 'CV / Resume',
  passport_photo: 'Passport-Size Photograph',
  other_professional_transcripts: 'Other professional transcripts / certifications / awards',
  exam_results_marksheet: 'Exam Results Marksheet (MCAT / NEET / UCAT)',
  sponsor_signed_financial_form: 'Upload signed sponsor form',
  review_signature_document: 'Review Signature Document',
}
const BACKEND_DOCUMENT_ORDER = [
  'passport',
  'bank_statement',
  'premedical_Bachelor_ug_HSC_Certificate',
  'Secondary_11grade',
  'cv_resume',
  'passport_photo',
  'other_professional_transcripts',
  'exam_results_marksheet',
  'sponsor_signed_financial_form',
  'review_signature_document',
]

function getSupportTicketStatusStyles(status) {
  switch (String(status ?? '').toLowerCase()) {
    case 'resolved':
      return {
        pill: 'bg-green-100 text-green-900 ring-1 ring-green-200/80',
        border: 'border-l-[3px] border-l-green-600',
      }
    case 'pending':
      return {
        pill: 'bg-sky-100 text-sky-900 ring-1 ring-sky-200/80',
        border: 'border-l-[3px] border-l-sky-600',
      }
    default:
      return {
        pill: 'bg-amber-100 text-amber-950 ring-1 ring-amber-200/80',
        border: 'border-l-[3px] border-l-amber-500',
      }
  }
}

function getSupportTicketStatusHint(status) {
  switch (String(status ?? '').toLowerCase()) {
    case 'resolved':
      return 'This request is closed. Email us if you still need assistance.'
    case 'in progress':
    case 'pending':
      return 'Our team is actively reviewing your message.'
    default:
      return 'We have received your ticket and will reply by email.'
  }
}

function getSupportTicketStatusLabel(status) {
  const normalized = String(status ?? '').toLowerCase()
  if (normalized === 'resolved') return 'Resolved'
  if (normalized === 'in progress') return 'In progress'
  if (normalized === 'pending') return 'Pending'
  return 'Open'
}

function getAuthSession() {
  try {
    return JSON.parse(window.localStorage.getItem('mucm-auth-session') ?? '{}')
  } catch {
    return {}
  }
}

function decodeJwtSub(token) {
  if (!token || typeof token !== 'string') return ''
  const parts = token.split('.')
  if (parts.length < 2) return ''
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4 || 4)) % 4)}`
    const json =
      typeof window !== 'undefined' && typeof window.atob === 'function'
        ? window.atob(padded)
        : atob(padded)
    const parsed = JSON.parse(json)
    return String(parsed?.sub ?? '').trim()
  } catch {
    return ''
  }
}

function formatWhen(value) {
  if (!value) return 'Unknown time'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Unknown time'
    return date.toLocaleString()
  } catch {
    return 'Unknown time'
  }
}

const initialForm = applicationSteps.reduce((accumulator, step) => {
  step.fields.forEach((field) => {
    if (field.type === 'checkbox') {
      accumulator[field.name] = field.defaultValue ?? false
    } else {
      accumulator[field.name] = field.defaultValue ?? ''
    }
  })
  return accumulator
}, {})

function ApplicationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const desktopScrollRef = useRef(null)
  const autoSaveTimerRef = useRef(null)
  const hasInitializedAutoSaveRef = useRef(false)
  const authSession = getAuthSession()
  const userEmail = authSession?.email ?? ''
  const authToken = String(authSession?.token ?? '').trim()
  const portalUserId =
    String(authSession?.userId ?? '').trim() ||
    String(authSession?.id ?? '').trim() ||
    decodeJwtSub(authToken)
  const [activeModule, setActiveModule] = useState('Application form')
  const [currentStepIndex, setCurrentStepIndex] = usePersistentState(
    'mucm-current-step',
    0,
  )
  const [formValues, setFormValues] = usePersistentState(
    'mucm-application-form',
    initialForm,
  )
  const [validationErrors, setValidationErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [draftNotice, setDraftNotice] = useState('')
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved')
  const [submitted, setSubmitted] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    email: userEmail,
    categoryId: '',
    question: '',
  })
  const [ticketNotice, setTicketNotice] = useState('')
  const [ticketHistory, setTicketHistory] = useState([])
  const [supportTicketCategories, setSupportTicketCategories] = useState([])
  const [supportTicketLoading, setSupportTicketLoading] = useState(false)
  const [supportTicketSubmitting, setSupportTicketSubmitting] = useState(false)
  const [supportCenterTab, setSupportCenterTab] = usePersistentState(
    'mucm-support-center-tab',
    'faq',
  )
  const [lastSubmissionId, setLastSubmissionId] = useState('')
  const [submittedSnapshot, setSubmittedSnapshot] = useState(null)
  const [faqApiRows, setFaqApiRows] = useState([])
  const [faqLoading, setFaqLoading] = useState(false)
  const [faqError, setFaqError] = useState('')
  const [faqSearch, setFaqSearch] = useState('')
  const [faqCategory, setFaqCategory] = useState('')
  const [statusNotifications, setStatusNotifications] = useState([])
  const [cooldownNotice, setCooldownNotice] = useState({
    isBlocked: false,
    nextAllowedAt: null,
    open: false,
  })
  const [activeApplication, setActiveApplication] = usePersistentState(
    ACTIVE_APPLICATION_KEY,
    {
      id: '',
      applicationId: '',
    },
  )
  const applicationsPrefixRef = useRef(import.meta.env.VITE_APPLICATIONS_PREFIX || '/api/v1/applications')

  function getAuthHeader() {
    if (authToken) {
      return { Authorization: `Bearer ${authToken}` }
    }
    return {}
  }

  function buildApplicationsPaths() {
    const preferredPrefix = applicationsPrefixRef.current || '/api/v1/applications'
    const candidates = [
      preferredPrefix,
      '/api/v1/applications',
      '/api/applications',
      '/applications',
      '/application',
    ]
    const uniquePrefixes = [...new Set(candidates)]
    return uniquePrefixes.map((prefix) => prefix.replace(/\/+$/, '') || '/applications')
  }

  async function postOrPutApplication(path, method, payload) {
    let lastError = null

    for (const basePath of buildApplicationsPaths()) {
      const endpoint = `${basePath}${path}`
      let response
      let data = {}

      try {
        response = await fetch(apiUrl(endpoint), {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify(payload),
        })
        data = await response.json().catch(() => ({}))
      } catch {
        throw new Error('API server is unreachable. Please verify backend server and API base URL.')
      }

      if (response.ok && data.success !== false) {
        applicationsPrefixRef.current = basePath
        return data
      }

      if (response.status === 404) {
        lastError = new Error(data.message || 'Application endpoint not found.')
        continue
      }

      throw new Error(data.message || 'Failed to save application.')
    }

    throw lastError || new Error('Application endpoint not found.')
  }

  async function fetchApplicationByApplicationId(applicationId) {
    let lastError = null
    const safeApplicationId = encodeURIComponent(String(applicationId || '').trim())
    if (!safeApplicationId) {
      return null
    }

    for (const basePath of buildApplicationsPaths()) {
      const endpoint = `${basePath}/by-application-id/${safeApplicationId}`
      let response
      let data = {}

      try {
        response = await fetch(apiUrl(endpoint), {
          headers: {
            ...getAuthHeader(),
          },
        })
        data = await response.json().catch(() => ({}))
      } catch {
        throw new Error('API server is unreachable. Please verify backend server and API base URL.')
      }

      if (response.ok && data.success !== false) {
        applicationsPrefixRef.current = basePath
        return data.data || data.application || data
      }

      if (response.status === 404) {
        const message = String(data?.message || '').toLowerCase()
        // Route exists, but this application id does not exist in backend DB.
        // Stop probing fallback prefixes to avoid noisy repeated 404 requests.
        if (message.includes('application not found')) {
          applicationsPrefixRef.current = basePath
          return null
        }
        lastError = new Error(data.message || 'Application not found.')
        continue
      }

      throw new Error(data.message || 'Failed to fetch application.')
    }

    if (lastError) {
      return null
    }
    return null
  }

  function normalizeText(value) {
    if (value === undefined || value === null) return null
    if (typeof value === 'string') {
      const trimmed = value.trim()
      return trimmed === '' ? null : trimmed
    }
    return value
  }

  function yesNoToBoolean(value) {
    if (value === 'Yes') return true
    if (value === 'No') return false
    return null
  }

  function monthToDateOnly(value) {
    const normalized = normalizeText(value)
    if (!normalized) return null
    return /^\d{4}-\d{2}$/.test(String(normalized)) ? `${normalized}-01` : normalized
  }

  function hasAnyValue(obj) {
    return Object.values(obj).some((value) => {
      if (value === undefined || value === null) return false
      if (typeof value === 'string') return value.trim() !== ''
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'object') return Object.keys(value).length > 0
      return true
    })
  }

  function valuesEquivalent(a, b) {
    if (a === undefined || a === null || a === '') return b === undefined || b === null || b === ''
    if (b === undefined || b === null || b === '') return false
    if (typeof a === 'boolean' || typeof b === 'boolean') return Boolean(a) === Boolean(b)
    return String(a).trim() === String(b).trim()
  }

  function rowMatchesPayload(payload, row) {
    if (!row || typeof row !== 'object') return false
    return Object.entries(payload).every(([key, value]) => valuesEquivalent(value, row[key]))
  }

  async function requestApplicationApi(method, path, payload) {
    let lastError = null

    for (const basePath of buildApplicationsPaths()) {
      const endpoint = `${basePath}${path}`
      let response
      let data = {}
      try {
        response = await fetch(apiUrl(endpoint), {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: payload === undefined ? undefined : JSON.stringify(payload),
        })
        data = await response.json().catch(() => ({}))
      } catch {
        throw new Error('API server is unreachable. Please verify backend server and API base URL.')
      }

      if (response.ok && data.success !== false) {
        applicationsPrefixRef.current = basePath
        return data
      }
      if (response.status === 404) {
        lastError = new Error(data.message || 'Application endpoint not found.')
        continue
      }
      throw new Error(data.message || `Failed API request for ${path}`)
    }
    throw lastError || new Error('Application endpoint not found.')
  }

  async function fetchApplicationFullById(applicationRowId) {
    const data = await requestApplicationApi('GET', `/${applicationRowId}?full=true`)
    return data.data || {}
  }

  async function upsertSingletonSection(applicationRowId, pathSegment, payload, existingRow) {
    const rowId = existingRow?.id
    if (rowId) {
      await requestApplicationApi('PUT', `/${applicationRowId}/${pathSegment}/${rowId}`, payload)
      return
    }
    if (!hasAnyValue(payload)) {
      return
    }
    await requestApplicationApi('POST', `/${applicationRowId}/${pathSegment}`, payload)
  }

  async function upsertListSection(applicationRowId, pathSegment, items, existingRows = [], options = {}) {
    const createOnly = Boolean(options.createOnly)
    const list = Array.isArray(items) ? items : []
    const existing = Array.isArray(existingRows) ? existingRows : []

    for (let index = 0; index < list.length; index += 1) {
      const payload = list[index]
      const existingRow = existing[index]
      if (createOnly) {
        if (!hasAnyValue(payload)) {
          continue
        }
        if (rowMatchesPayload(payload, existingRow)) {
          continue
        }
        await requestApplicationApi('POST', `/${applicationRowId}/${pathSegment}`, payload)
        continue
      }
      if (existingRow?.id) {
        await requestApplicationApi('PUT', `/${applicationRowId}/${pathSegment}/${existingRow.id}`, payload)
      } else if (hasAnyValue(payload)) {
        await requestApplicationApi('POST', `/${applicationRowId}/${pathSegment}`, payload)
      }
    }

    if (createOnly) {
      return
    }

    for (let index = list.length; index < existing.length; index += 1) {
      const rowToDelete = existing[index]
      if (rowToDelete?.id) {
        await requestApplicationApi('DELETE', `/${applicationRowId}/${pathSegment}/${rowToDelete.id}`)
      }
    }
  }

  function buildSectionPayloads() {
    const emergencyPayload = {
      full_name: normalizeText(formValues.contactName),
      relationship: normalizeText(formValues.relationship),
      phone: normalizeText(formValues.contactPhone),
      email: normalizeText(formValues.contactEmail),
      country: normalizeText(formValues.contactCountry),
      home_address: normalizeText(formValues.contactAddress),
    }

    const academicInstitutionRows = (Array.isArray(formValues.educationEntries) ? formValues.educationEntries : [])
      .filter((row) => hasAnyValue(row || {}))
      .map((row) => ({
        institution_details: {
          institution: normalizeText(row?.institution),
          address: normalizeText(row?.address),
          country: normalizeText(row?.country),
          startDate: normalizeText(row?.startDate),
          endDate: normalizeText(row?.endDate),
          degree: normalizeText(row?.degree),
          fieldOfStudy: normalizeText(row?.fieldOfStudy),
          gpa: normalizeText(row?.gpa),
        },
      }))

    const essayWhyMedicine = normalizeText(formValues.whyMedicine)
    const essayWhyMUCM = normalizeText(formValues.whyMUCM)
    const essayPersonalStatement = normalizeText(formValues.personalStatement)

    let experienceRows = (Array.isArray(formValues.experiences) ? formValues.experiences : [])
      .filter((row) => hasAnyValue(row || {}))
      .map((row) => ({
        experience_type: normalizeText(row?.type),
        role_position: normalizeText(row?.role),
        organization: normalizeText(row?.organization),
        hours_per_week: normalizeText(row?.hoursPerWeek),
        start_date: monthToDateOnly(row?.startDate),
        end_date: monthToDateOnly(row?.endDate),
        is_current: !normalizeText(row?.endDate),
        description: normalizeText(row?.description),
        // Kept for legacy DB compatibility (also saved on application table).
        why_medicine: essayWhyMedicine,
        why_mucm: essayWhyMUCM,
        per_statement_essay: essayPersonalStatement,
      }))

    if (experienceRows.length === 0 && (essayWhyMedicine || essayWhyMUCM || essayPersonalStatement)) {
      experienceRows = [
        {
          why_medicine: essayWhyMedicine,
          why_mucm: essayWhyMUCM,
          per_statement_essay: essayPersonalStatement,
        },
      ]
    }

    return {
      personalDetails: {
        title: normalizeText(formValues.title),
        first_name: normalizeText(formValues.firstName),
        middle_name: normalizeText(formValues.middleName),
        surname: normalizeText(formValues.surname),
        preferred_name: normalizeText(formValues.preferredName),
        pronouns: normalizeText(formValues.pronouns),
        date_of_birth: normalizeText(formValues.dateOfBirth),
        gender: normalizeText(formValues.gender),
        name_change: normalizeText(formValues.nameChanged),
        ethnicity_race: normalizeText(formValues.ethnicity),
        nationality_citizenship: normalizeText(formValues.citizenship),
        country_of_residence: normalizeText(formValues.countryOfResidence),
        passport_number: normalizeText(formValues.passportNumber),
        passport_expiry_date: normalizeText(formValues.passportExpiry),
        visa_immigration_status: normalizeText(formValues.visaStatus),
        email: normalizeText(formValues.email),
        mobile_phone: normalizeText(formValues.phoneMobile),
        home_phone: normalizeText(formValues.phoneHome),
        street_address: normalizeText(formValues.permanentAddress),
        city: normalizeText(formValues.city),
        state_province: normalizeText(formValues.stateProvince),
        postal_code: normalizeText(formValues.postalCode),
        country: normalizeText(formValues.country),
        mailing_same_as_permanent: Boolean(formValues.sameAsPermanent),
        mailing_street_address: formValues.sameAsPermanent
          ? null
          : normalizeText(formValues.mailingAddress),
        mailing_city: formValues.sameAsPermanent ? null : normalizeText(formValues.mailingCity),
        mailing_state_province: formValues.sameAsPermanent
          ? null
          : normalizeText(formValues.mailingStateProvince),
        mailing_postal_code: formValues.sameAsPermanent
          ? null
          : normalizeText(formValues.mailingPostalCode),
        mailing_country: formValues.sameAsPermanent ? null : normalizeText(formValues.mailingCountry),
      },
      emergencyContacts: hasAnyValue(emergencyPayload) ? [emergencyPayload] : [],
      parentGuardian: {
        father_name: normalizeText(formValues.fatherName),
        father_occupation: normalizeText(formValues.fatherOccupation),
        father_email: normalizeText(formValues.fatherEmail),
        father_phone: normalizeText(formValues.fatherPhone),
        mother_name: normalizeText(formValues.motherName),
        mother_occupation: normalizeText(formValues.motherOccupation),
        mother_email: normalizeText(formValues.motherEmail),
        mother_phone: normalizeText(formValues.motherPhone),
      },
      academicInstitutions: academicInstitutionRows,
      englishProficiency: {
        proficiency_level: normalizeText(formValues.englishProficiency),
        other_languages_spoken: normalizeText(formValues.otherLanguagesSpoken),
        test_type: normalizeText(formValues.englishTestType),
        test_score: normalizeText(formValues.englishTestScore),
      },
      standardizedTests: [
        {
          is_taken: yesNoToBoolean(formValues.hasStandardizedTest),
          test_type: normalizeText(formValues.standardizedTestType),
          score: normalizeText(formValues.standardizedTestScore),
        },
      ],
      admissionSought: {
        program_type: normalizeText(formValues.programType),
        sub_program: normalizeText(formValues.subProgram),
        transfer_credits: (Array.isArray(formValues.transferCredits) ? formValues.transferCredits : []).filter(
          (row) => hasAnyValue(row || {}),
        ),
        preferred_semester: normalizeText(formValues.semester),
        preferred_year: formValues.year ? Number(formValues.year) : null,
      },
      disclosures: {
        discipline_action: yesNoToBoolean(formValues.hasBeenDisciplined),
        discipline_explanation: normalizeText(formValues.disciplineActionExplanation),
        criminal_conviction: yesNoToBoolean(formValues.hasBeenConvicted),
        conviction_explanation: normalizeText(formValues.convictionExplanation),
        disability: yesNoToBoolean(formValues.hasDisability),
        disability_details: normalizeText(formValues.disabilityDetails),
        special_accomadations: yesNoToBoolean(formValues.requiresAccommodation),
        accommodation_details: normalizeText(formValues.accommodationDetails),
        referral_source: normalizeText(formValues.howHeard),
        referral_source_other: normalizeText(formValues.howHeardOther),
        referral_description: normalizeText(formValues.referralDescription),
      },
      experiences: experienceRows,
      documents: {
        upload_progress: true,
        passport: normalizeText(formValues.passport),
        bank_statement: normalizeText(formValues.bankStatement),
        premedical_Bachelor_ug_HSC_Certificate: normalizeText(formValues.preMedTranscript),
        Secondary_11grade: normalizeText(formValues.grade11Transcript),
        cv_resume: normalizeText(formValues.cv),
        passport_photo: normalizeText(formValues.passportPhoto),
        other_professional_transcripts: normalizeText(formValues.otherProfessionalTranscripts),
        exam_results_marksheet: normalizeText(formValues.examResults),
        sponsor_signed_financial_form: normalizeText(formValues.sponsorSignedFinancialForm),
      },
      financialSupport: {
        student_full_name: normalizeText(formValues.studentName),
        student_id: normalizeText(formValues.studentId),
        program_of_study: normalizeText(formValues.programOfStudy),
        expected_start_date: normalizeText(formValues.expectedStartDate),
        paymentOption: normalizeText(formValues.paymentOption),
        selfFundedSource: normalizeText(formValues.selfFundedSource),
        sponsor_full_name: normalizeText(formValues.sponsorFullName),
        sponsorRelationship: normalizeText(formValues.sponsorRelationship),
        occupation: normalizeText(formValues.sponsorOccupation),
        sponsorEmployer: normalizeText(formValues.sponsorEmployer),
        sponsorAddress: normalizeText(formValues.sponsorAddress),
        sponsor_city: normalizeText(formValues.sponsorCity),
        sponsor_state: normalizeText(formValues.sponsorState),
        sponsorPostalCode: normalizeText(formValues.sponsorPostalCode),
        sponsor_country: normalizeText(formValues.sponsorCountry),
        sponsor_phone: normalizeText(formValues.sponsorPhone),
        sponsor_email: normalizeText(formValues.sponsorEmail),
        orgName: normalizeText(formValues.orgName),
        org_contact_person: normalizeText(formValues.orgContactPerson),
        orgContactTitle: normalizeText(formValues.orgContactTitle),
        orgAddress: normalizeText(formValues.orgAddress),
        org_city: normalizeText(formValues.orgCity),
        org_state: normalizeText(formValues.orgState),
        orgPostalCode: normalizeText(formValues.orgPostalCode),
        org_country: normalizeText(formValues.orgCountry),
        org_phone: normalizeText(formValues.orgPhone),
        org_email: normalizeText(formValues.orgEmail),
        hasBankStatement: Boolean(formValues.hasBankStatement),
        hasIncomeProof: Boolean(formValues.hasIncomeProof),
        hasSponsorLetter: Boolean(formValues.hasSponsorLetter),
        hasScholarshipLetter: Boolean(formValues.hasScholarshipLetter),
        hasLoanApproval: Boolean(formValues.hasLoanApproval),
        certifyAccurate: Boolean(formValues.certifyAccurate),
        certifyFinancialResponsibility: Boolean(formValues.certifyFinancialResponsibility),
        certifyDate: normalizeText(formValues.certifyDate),
        sponsorCertifySupport: Boolean(formValues.sponsorCertifySupport),
        sponsorCertifyDate: normalizeText(formValues.sponsorCertifyDate),
        studentSignatureMethod: normalizeText(formValues.studentSignatureMethod),
        studentSignatureTyped: normalizeText(formValues.studentSignatureTyped),
        studentSignatureUpload: normalizeText(formValues.studentSignatureUpload),
        sponsorSignedFinancialForm: normalizeText(formValues.sponsorSignedFinancialForm),
      },
    }
  }

  async function syncApplicationSections(applicationRowId) {
    if (!applicationRowId) {
      throw new Error('Application ID is missing while syncing sections.')
    }

    const fullApplication = await fetchApplicationFullById(applicationRowId)
    const payloads = buildSectionPayloads()

    await upsertSingletonSection(
      applicationRowId,
      'personal-details',
      payloads.personalDetails,
      fullApplication.personal_details,
    )
    await upsertListSection(
      applicationRowId,
      'emergency-contacts',
      payloads.emergencyContacts,
      fullApplication.emergency_contacts,
    )
    await upsertSingletonSection(
      applicationRowId,
      'parent-guardian',
      payloads.parentGuardian,
      fullApplication.parent_guardian_info,
    )
    await upsertListSection(
      applicationRowId,
      'academic-institutions',
      payloads.academicInstitutions,
      fullApplication.academic_institutions,
    )
    await upsertSingletonSection(
      applicationRowId,
      'english-proficiency',
      payloads.englishProficiency,
      fullApplication.english_proficiency,
    )
    await upsertListSection(
      applicationRowId,
      'standardized-tests',
      payloads.standardizedTests,
      fullApplication.standardized_tests,
    )
    await upsertSingletonSection(
      applicationRowId,
      'admission-sought',
      payloads.admissionSought,
      fullApplication.admission_sought,
    )
    await upsertSingletonSection(
      applicationRowId,
      'disclosures',
      payloads.disclosures,
      fullApplication.disclosure,
    )
    await upsertListSection(applicationRowId, 'experiences', payloads.experiences, fullApplication.experiences)
    await upsertSingletonSection(applicationRowId, 'document', payloads.documents, fullApplication.document)
    await upsertSingletonSection(
      applicationRowId,
      'financial-support',
      payloads.financialSupport,
      fullApplication.financial_support,
    )
  }

  function buildApplicationPayload({ stepIndex, isComplete }) {
    return {
      application_id: activeApplication.applicationId || `APP-${Date.now()}`,
      current_status: isComplete ? 'submitted' : 'draft',
      completed_steps: Math.max(1, stepIndex + 1),
      is_complete: isComplete,
      submitted_at: isComplete ? new Date().toISOString() : undefined,
      why_medicine: formValues.whyMedicine || undefined,
      why_mucm: formValues.whyMUCM || undefined,
      personal_statement: formValues.personalStatement || undefined,
      application_agreement_accepted: Boolean(formValues.applicationAgreement),
      application_agreement_at: formValues.applicationAgreement ? new Date().toISOString() : undefined,
      review_signature_method: normalizeText(formValues.reviewSignatureMethod),
      review_signature_typed: normalizeText(formValues.reviewSignatureTyped),
      review_signature_upload: normalizeText(formValues.reviewSignatureUpload),
    }
  }

  async function persistApplication({ stepIndex, isComplete }) {
    const payload = buildApplicationPayload({ stepIndex, isComplete })
    let existingId = activeApplication.id

    if (!existingId && activeApplication.applicationId) {
      const existing = await fetchApplicationByApplicationId(activeApplication.applicationId)
      existingId = existing?.id || ''
      if (existingId) {
        setActiveApplication((previous) => ({ ...previous, id: String(existingId) }))
      }
    }

    if (!existingId) {
      const data = await postOrPutApplication('', 'POST', payload)
      let createdId = data.id || data.data?.id || data.application?.id || ''
      const createdApplicationId =
        data.application_id || data.data?.application_id || payload.application_id

      if (!createdId && createdApplicationId) {
        const fetched = await fetchApplicationByApplicationId(createdApplicationId)
        createdId = fetched?.id || ''
      }
      if (!createdId) {
        throw new Error('Application created but could not resolve application row ID.')
      }

      setActiveApplication({
        id: String(createdId ?? ''),
        applicationId: String(createdApplicationId ?? payload.application_id),
      })
      return {
        id: String(createdId ?? ''),
        applicationId: String(createdApplicationId ?? payload.application_id),
      }
    }

    await postOrPutApplication(`/${existingId}`, 'PUT', payload)
    return { ...activeApplication, id: String(existingId) }
  }

  function evaluateSubmitCooldown() {
    try {
      const allSubmissions = JSON.parse(window.localStorage.getItem(SUBMISSIONS_KEY) ?? '[]')
      const mySubmissions = (Array.isArray(allSubmissions) ? allSubmissions : []).filter(
        (item) => item.userEmail === userEmail && item.submittedAt,
      )
      if (mySubmissions.length === 0) {
        return { isBlocked: false, nextAllowedAt: null }
      }

      const latestSubmission = mySubmissions.reduce((latest, item) => {
        const ts = new Date(item.submittedAt).getTime()
        return Number.isFinite(ts) && ts > latest ? ts : latest
      }, 0)

      if (!latestSubmission) {
        return { isBlocked: false, nextAllowedAt: null }
      }

      const nextAllowedAt = latestSubmission + SUBMIT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
      const isBlocked = Date.now() < nextAllowedAt
      return { isBlocked, nextAllowedAt: isBlocked ? nextAllowedAt : null }
    } catch {
      return { isBlocked: false, nextAllowedAt: null }
    }
  }

  useEffect(() => {
    if (!draftNotice) {
      return undefined
    }
    const timeoutId = window.setTimeout(() => setDraftNotice(''), 4500)
    return () => window.clearTimeout(timeoutId)
  }, [draftNotice])

  useEffect(() => {
    if (activeModule !== 'FAQ' || supportCenterTab !== 'faq') {
      return
    }
    let cancelled = false
    setFaqLoading(true)
    setFaqError('')
    fetchPublishedFaqs()
      .then((rows) => {
        if (cancelled) return
        setFaqApiRows(rows)
      })
      .catch((error) => {
        if (cancelled) return
        setFaqError(error.message || 'Unable to load FAQs right now.')
      })
      .finally(() => {
        if (!cancelled) setFaqLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeModule, supportCenterTab])

  useEffect(() => {
    if (activeModule !== 'FAQ' || supportCenterTab !== 'tickets') {
      return
    }
    if (!portalUserId || !authToken) {
      setTicketNotice('Please login again to access support tickets.')
      return
    }

    let cancelled = false
    setSupportTicketLoading(true)
    setTicketNotice('')

    Promise.all([
      fetchSupportTicketCategories(authToken),
      fetchMySupportTickets({ userId: portalUserId, token: authToken }),
    ])
      .then(([categories, tickets]) => {
        if (cancelled) return
        setSupportTicketCategories(categories)
        setTicketHistory(Array.isArray(tickets) ? tickets : [])
        setTicketForm((previous) => {
          const hasSelected = categories.some((item) => item.id === previous.categoryId)
          const fallbackId = categories[0]?.id ?? ''
          return {
            ...previous,
            email: userEmail,
            categoryId: hasSelected ? previous.categoryId : fallbackId,
          }
        })
      })
      .catch((error) => {
        if (cancelled) return
        setTicketNotice(error.message || 'Unable to load support ticket details right now.')
      })
      .finally(() => {
        if (!cancelled) setSupportTicketLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeModule, supportCenterTab, portalUserId, authToken, userEmail])

  useEffect(() => {
    if (submitted) {
      return
    }
    const status = evaluateSubmitCooldown()
    setCooldownNotice({
      isBlocked: status.isBlocked,
      nextAllowedAt: status.nextAllowedAt,
      open: status.isBlocked,
    })
  }, [submitted, userEmail])

  useEffect(() => {
    // Keep UX consistent: every step opens from the top.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    if (desktopScrollRef.current) {
      desktopScrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [currentStepIndex, activeModule, submitted, supportCenterTab])

  useEffect(() => {
    const requestedModule = location.state?.initialModule
    if (!requestedModule) {
      return
    }
    setActiveModule(requestedModule)
    // Consume one-time router state so browser refresh does not reopen the module.
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true })
  }, [location.state, location.pathname, location.search, location.hash, navigate])

  useEffect(() => {
    setFormValues((prev) => {
      const m = prev.studentSignatureMethod
      if (m === 'upload' || m === 'type') {
        return prev
      }
      const hasUpload = prev.studentSignatureUpload && String(prev.studentSignatureUpload).trim()
      return { ...prev, studentSignatureMethod: hasUpload ? 'upload' : 'type' }
    })
  }, [])

  useEffect(() => {
    // Repair legacy saved value: select can visually show first option
    // while stored value is invalid and fails validation.
    setFormValues((prev) => {
      const englishField = applicationSteps
        .flatMap((step) => step.fields)
        .find((field) => field.name === 'englishProficiency')
      const allowed = getSelectValues(englishField?.options ?? [])
      const current = String(prev.englishProficiency ?? '').trim()
      if (allowed.includes(current)) {
        return prev
      }
      return {
        ...prev,
        englishProficiency:
          String(englishField?.defaultValue ?? '').trim() || String(allowed[0] ?? ''),
      }
    })
  }, [])

  useEffect(() => {
    if (submitted) {
      return
    }
    setFormValues((prev) => {
      const auto = getAutofillStudentInfo(prev)
      if (
        prev.studentName === auto.studentName &&
        prev.programOfStudy === auto.programOfStudy &&
        prev.expectedStartDate === auto.expectedStartDate
      ) {
        return prev
      }
      return { ...prev, ...auto }
    })
  }, [
    submitted,
    formValues.firstName,
    formValues.middleName,
    formValues.surname,
    formValues.programType,
    formValues.subProgram,
    formValues.semester,
    formValues.year,
  ])

  useEffect(() => {
    if (submitted) {
      return undefined
    }

    if (!hasInitializedAutoSaveRef.current) {
      hasInitializedAutoSaveRef.current = true
      return undefined
    }

    setAutoSaveStatus('saving')
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current)
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      setAutoSaveStatus('saved')
    }, 450)

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [formValues, currentStepIndex, submitted])

  const currentStep = useMemo(
    () => applicationSteps[currentStepIndex] ?? applicationSteps[0],
    [currentStepIndex],
  )
  const uploadedDocuments = useMemo(() => {
    const documentStep =
      applicationSteps.find((step) => step.id === 'documents')?.fields ?? []

    return documentStep
      .filter((field) => field.type === 'file')
      .map((field) => ({
      label: field.label,
      value: formValues[field.name],
      required: Boolean(field.required),
      }))
  }, [formValues])
  const submittedApplications = useMemo(() => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(SUBMISSIONS_KEY) ?? '[]')
      const all = Array.isArray(raw) ? raw : []
      return all.filter((item) => item.userEmail === userEmail)
    } catch {
      return []
    }
  }, [userEmail, submitted, lastSubmissionId])
  const [selectedDocumentSubmissionId, setSelectedDocumentSubmissionId] = useState('')
  const [serverDocumentData, setServerDocumentData] = useState(null)
  const [serverDocumentLoading, setServerDocumentLoading] = useState(false)
  const [serverDocumentError, setServerDocumentError] = useState('')
  const selectedDocumentSubmission = useMemo(() => {
    return (
      submittedApplications.find((item) => item.id === selectedDocumentSubmissionId) ??
      submittedApplications[0] ??
      null
    )
  }, [submittedApplications, selectedDocumentSubmissionId])
  const selectedDocumentSubmissionKey = selectedDocumentSubmission?.id ?? ''
  const selectedDocumentSubmissionRowId = String(
    selectedDocumentSubmission?.applicationRowId || '',
  ).trim()

  useEffect(() => {
    if (submittedApplications.length === 0) {
      if (selectedDocumentSubmissionId !== '') {
        setSelectedDocumentSubmissionId('')
      }
      return
    }
    const exists = submittedApplications.some((item) => item.id === selectedDocumentSubmissionId)
    if (!exists) {
      setSelectedDocumentSubmissionId(submittedApplications[0].id)
    }
  }, [submittedApplications, selectedDocumentSubmissionId])

  function resolveStoredFileUrl(storedPath) {
    const raw = String(storedPath ?? '').trim()
    if (!raw) return ''
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) return raw
    const normalized = raw.startsWith('/') ? raw : `/${raw}`
    return apiUrl(normalized)
  }

  function mapNotificationTone(statusLabel) {
    const s = String(statusLabel || '').toLowerCase()
    if (s.includes('incomplete') || s.includes('drop') || s.includes('rejected')) return 'Action Needed'
    if (
      s.includes('submitted') ||
      s.includes('validation') ||
      s.includes('review') ||
      s.includes('complete') ||
      s.includes('enrolled')
    ) {
      return 'Success'
    }
    return 'Info'
  }

  function formatNotificationTime(iso) {
    if (!iso) return 'Just now'
    const ts = new Date(iso).getTime()
    if (!Number.isFinite(ts)) return 'Just now'
    const diffMs = Date.now() - ts
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
    return new Date(ts).toLocaleString()
  }

  async function uploadApplicationDocumentField(fieldName, file) {
    const documentType = DOCUMENT_TYPE_BY_FIELD[fieldName]
    if (!documentType) {
      return file?.name || ''
    }

    const stepIndex = applicationSteps.findIndex((step) => step.id === 'documents')
    const safeStepIndex = stepIndex >= 0 ? stepIndex : currentStepIndex
    const meta = await persistApplication({ stepIndex: safeStepIndex, isComplete: false })
    const rowId = String(meta?.id || '').trim()
    if (!rowId) {
      throw new Error('Unable to resolve application ID for document upload.')
    }

    let lastError = null
    for (const basePath of buildApplicationsPaths()) {
      const endpoint = `${basePath}/${rowId}/document/upload?documentType=${encodeURIComponent(documentType)}`
      const formData = new FormData()
      formData.append('file', file)
      try {
        const response = await fetch(apiUrl(endpoint), {
          method: 'POST',
          headers: {
            ...getAuthHeader(),
          },
          body: formData,
        })
        const data = await response.json().catch(() => ({}))
        if (response.ok && data.success !== false) {
          applicationsPrefixRef.current = basePath
          return String(data?.data?.storedPath || '')
        }
        if (response.status === 404) {
          lastError = new Error(data.message || 'Document upload endpoint not found.')
          continue
        }
        throw new Error(data.message || 'Failed to upload document.')
      } catch (error) {
        if (error instanceof Error) {
          throw error
        }
        throw new Error('Failed to upload document.')
      }
    }
    throw lastError || new Error('Document upload endpoint not found.')
  }

  useEffect(() => {
    if (activeModule !== 'Document') return
    const preferredApplicationId = String(
      selectedDocumentSubmissionKey || activeApplication.applicationId || '',
    ).trim()
    if (!preferredApplicationId) {
      setServerDocumentData(null)
      setServerDocumentError('')
      return
    }

    let cancelled = false
    setServerDocumentLoading(true)
    setServerDocumentError('')
    ;(async () => {
      if (selectedDocumentSubmissionRowId) {
        const listData = await requestApplicationApi('GET', `/${selectedDocumentSubmissionRowId}/document`)
        const rows = Array.isArray(listData?.data) ? listData.data : []
        return rows[0] || null
      }

      const candidateApplicationIds = [
        preferredApplicationId,
        String(activeApplication.applicationId || '').trim(),
      ].filter(Boolean)
      const uniqueCandidates = [...new Set(candidateApplicationIds)]

      let matchedApplication = null
      for (const appId of uniqueCandidates) {
        matchedApplication = await fetchApplicationByApplicationId(appId)
        if (matchedApplication?.id) break
      }

      if (!matchedApplication?.id) {
        return null
      }

      const listData = await requestApplicationApi('GET', `/${matchedApplication.id}/document`)
      const rows = Array.isArray(listData?.data) ? listData.data : []
      return rows[0] || null
    })()
      .then((documentRow) => {
        if (cancelled) return
        setServerDocumentData(documentRow)
      })
      .catch((error) => {
        if (cancelled) return
        setServerDocumentData(null)
        setServerDocumentError(error?.message || 'Unable to load uploaded documents from server.')
      })
      .finally(() => {
        if (!cancelled) setServerDocumentLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    activeModule,
    selectedDocumentSubmissionKey,
    selectedDocumentSubmissionRowId,
    activeApplication.applicationId,
  ])

  useEffect(() => {
    if (activeModule !== 'Notification') return
    if (!authToken) {
      setStatusNotifications([])
      return
    }

    let cancelled = false
    requestApplicationApi('GET', '/notifications/my')
      .then((data) => {
        if (cancelled) return
        const rows = Array.isArray(data?.data) ? data.data : []
        setStatusNotifications(
          rows.map((row) => ({
            id: row.id,
            title: row.status_label ? `Status changed: ${row.status_label}` : 'Application status updated',
            message: row.message || 'Your application status was updated by admissions.',
            status: mapNotificationTone(row.status_label || row.status_key),
            time: formatNotificationTime(row.created_at),
          })),
        )
      })
      .catch(() => {
        if (cancelled) return
        setStatusNotifications([])
      })

    return () => {
      cancelled = true
    }
  }, [activeModule, authToken])

  function validateField(field, value) {
    const stringValue = typeof value === 'string' ? value.trim() : value

    if (field.required) {
      if (field.type === 'checkbox' && !value) {
        return 'This field is required.'
      }
      if (field.type !== 'checkbox' && !stringValue) {
        return 'This field is required.'
      }
    }

    if (!stringValue && !field.required) {
      return ''
    }

    if (field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(String(stringValue))) {
        return 'Please enter a valid email address.'
      }
    }

    if (field.type === 'tel') {
      const phoneRaw = String(stringValue).trim()
      // Treat "country code only" as empty for optional phone fields.
      if (!field.required && /^\+\d{1,4}$/.test(phoneRaw)) {
        return ''
      }
      const digits = phoneRaw.replace(/\D/g, '')
      if (digits.length < 7) {
        return 'Please enter a valid phone number.'
      }
    }

    if ((field.type === 'select' || field.type === 'radioGroup') && field.options?.length > 0) {
      const allowed = getSelectValues(field.options)
      if (!allowed.includes(String(stringValue))) {
        return 'Please select a valid option.'
      }
    }

    if (field.type === 'country') {
      const exists = countries.some(
        (country) => country.toLowerCase() === String(stringValue).toLowerCase(),
      )
      if (!exists) {
        return 'Please select a valid country from the list.'
      }
    }

    if (field.type === 'date' && stringValue) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(stringValue))) {
        return 'Please enter a valid date as DD/MM/YYYY.'
      }
      const [y, mo, d] = String(stringValue).split('-').map(Number)
      const dt = new Date(y, mo - 1, d)
      if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
        return 'Please enter a valid date.'
      }
    }

    return ''
  }

  function validateRepeatableNested(field, rows, valuesToCheck) {
    const nested = {}
    const list =
      Array.isArray(rows) && rows.length > 0
        ? rows
        : [typeof field.defaultItem === 'object' && field.defaultItem !== null ? { ...field.defaultItem } : {}]
    list.forEach((row, rowIndex) => {
      for (const sub of field.itemFields ?? []) {
        if (!isFieldVisible(sub, valuesToCheck)) {
          continue
        }
        const message = validateField(sub, row?.[sub.name])
        if (message) {
          nested[`${field.name}__${rowIndex}__${sub.name}`] = message
        }
      }
    })
    return nested
  }

  function validateStep(step, valuesToCheck) {
    const stepErrors = {}

    step.fields.forEach((field) => {
      if (!isFieldVisible(field, valuesToCheck)) {
        return
      }
      if (field.type === 'repeatable') {
        Object.assign(
          stepErrors,
          validateRepeatableNested(field, valuesToCheck[field.name], valuesToCheck),
        )
        return
      }
      const message = validateField(field, valuesToCheck[field.name])
      if (message) {
        stepErrors[field.name] = message
      }
    })

    return stepErrors
  }

  function updateField(name, value) {
    setFormValues((previous) => {
      const next = { ...previous, [name]: value }
      if (name === 'hasBeenDisciplined' && value !== 'Yes') {
        next.disciplineActionExplanation = ''
      }
      if (name === 'hasBeenConvicted' && value !== 'Yes') {
        next.convictionExplanation = ''
      }
      if (name === 'hasDisability' && value !== 'Yes') {
        next.disabilityDetails = ''
      }
      if (name === 'requiresAccommodation' && value !== 'Yes') {
        next.accommodationDetails = ''
      }
      if (name === 'studentSignatureMethod') {
        if (value === 'upload') {
          next.studentSignatureTyped = ''
        } else if (value === 'type') {
          next.studentSignatureUpload = ''
        }
      }
      if (name === 'reviewSignatureMethod') {
        if (value === 'upload') {
          next.reviewSignatureTyped = ''
        } else if (value === 'type') {
          next.reviewSignatureUpload = ''
        }
      }
      return next
    })

    setValidationErrors((previous) => {
      const nextErrors = { ...previous }
      if (name === 'hasBeenDisciplined') {
        delete nextErrors.disciplineActionExplanation
      }
      if (name === 'hasBeenConvicted') {
        delete nextErrors.convictionExplanation
      }
      if (name === 'hasDisability') {
        delete nextErrors.disabilityDetails
      }
      if (name === 'requiresAccommodation') {
        delete nextErrors.accommodationDetails
      }
      if (name === 'studentSignatureMethod') {
        delete nextErrors.studentSignatureUpload
        delete nextErrors.studentSignatureTyped
      }
      if (name === 'reviewSignatureMethod') {
        delete nextErrors.reviewSignatureUpload
        delete nextErrors.reviewSignatureTyped
      }

      const activeField =
        applicationSteps
          .flatMap((step) => step.fields)
          .find((field) => field.name === name) ?? null

      const mergedValues = { ...formValues, [name]: value }

      if (activeField?.type === 'repeatable') {
        for (const k of Object.keys(nextErrors)) {
          if (k.startsWith(`${name}__`)) {
            delete nextErrors[k]
          }
        }
        Object.assign(
          nextErrors,
          validateRepeatableNested(activeField, value, mergedValues),
        )
        return nextErrors
      }

      if (activeField) {
        const message = validateField(activeField, value)
        if (message) {
          nextErrors[name] = message
        } else {
          delete nextErrors[name]
        }
      }

      return nextErrors
    })
    setFormError('')
  }

  async function handleNext() {
    const stepErrors = validateStep(currentStep, formValues)

    if (Object.keys(stepErrors).length > 0) {
      setValidationErrors((previous) => ({ ...previous, ...stepErrors }))
      setFormError('Please fix the highlighted fields before continuing.')
      return
    }

    setValidationErrors({})
    setFormError('')
    const nextStepIndex = Math.min(currentStepIndex + 1, applicationSteps.length - 1)
    try {
      // Explicit checkpoint save on every Save & Continue click.
      window.localStorage.setItem('mucm-application-form', JSON.stringify(formValues))
      window.localStorage.setItem('mucm-current-step', JSON.stringify(nextStepIndex))
    } catch {
      // ignore quota / private mode
    }
    try {
      const meta = await persistApplication({ stepIndex: nextStepIndex, isComplete: false })
      await syncApplicationSections(meta.id)
      setCurrentStepIndex(nextStepIndex)
      setDraftNotice('Progress saved to server. Moving to next step.')
    } catch (error) {
      setFormError(error.message || 'Unable to save progress to server.')
    }
  }

  function handlePrevious() {
    setCurrentStepIndex((previous) => Math.max(previous - 1, 0))
  }

  function handleStepClick(targetStepIndex) {
    const safeTarget = Math.max(0, Math.min(Number(targetStepIndex) || 0, applicationSteps.length - 1))

    // Always allow navigating backwards.
    if (safeTarget <= currentStepIndex) {
      setCurrentStepIndex(safeTarget)
      return
    }

    const aggregateErrors = {}
    let firstInvalidStep = -1

    for (let index = 0; index < safeTarget; index += 1) {
      const step = applicationSteps[index]
      const stepErrors = validateStep(step, formValues)
      if (Object.keys(stepErrors).length > 0) {
        if (firstInvalidStep === -1) {
          firstInvalidStep = index
        }
        Object.assign(aggregateErrors, stepErrors)
      }
    }

    if (firstInvalidStep !== -1) {
      setValidationErrors((previous) => ({ ...previous, ...aggregateErrors }))
      setFormError('Please complete the current step before moving to the next one.')
      setCurrentStepIndex(firstInvalidStep)
      return
    }

    setValidationErrors({})
    setFormError('')
    setCurrentStepIndex(safeTarget)
  }

  async function handleSaveDraft() {
    try {
      window.localStorage.setItem('mucm-application-form', JSON.stringify(formValues))
      window.localStorage.setItem('mucm-current-step', JSON.stringify(currentStepIndex))
    } catch {
      // ignore quota / private mode
    }
    try {
      const meta = await persistApplication({ stepIndex: currentStepIndex, isComplete: false })
      await syncApplicationSections(meta.id)
      setFormError('')
      setDraftNotice('Draft saved to server successfully.')
    } catch (error) {
      setFormError(error.message || 'Unable to save draft to server.')
    }
  }

  function handleModuleChange(moduleName) {
    if (moduleName === 'Submitted Applications') {
      navigate('/submitted-applications')
      return
    }
    setActiveModule(moduleName)
  }

  async function handleSubmit() {
    const cooldownStatus = evaluateSubmitCooldown()
    if (cooldownStatus.isBlocked) {
      setCooldownNotice({
        isBlocked: true,
        nextAllowedAt: cooldownStatus.nextAllowedAt,
        open: true,
      })
      setFormError('You have already submitted an application. New submission is allowed after cooldown period.')
      return
    }

    let firstInvalidStep = -1
    const allErrors = {}

    applicationSteps.forEach((step, stepIndex) => {
      const stepErrors = validateStep(step, formValues)
      if (Object.keys(stepErrors).length > 0 && firstInvalidStep === -1) {
        firstInvalidStep = stepIndex
      }
      Object.assign(allErrors, stepErrors)
    })

    if (Object.keys(allErrors).length > 0) {
      setValidationErrors(allErrors)
      setFormError('Please complete all required fields with valid values.')
      if (firstInvalidStep >= 0) {
        setCurrentStepIndex(firstInvalidStep)
      }
      return
    }

    setValidationErrors({})
    setFormError('')
    let persistedApplicationMeta = activeApplication
    try {
      persistedApplicationMeta = await persistApplication({
        stepIndex: applicationSteps.length - 1,
        isComplete: true,
      })
      await syncApplicationSections(persistedApplicationMeta.id)
    } catch (error) {
      setFormError(error.message || 'Unable to submit application to server.')
      return
    }
    const documentFields =
      applicationSteps
        .find((step) => step.id === 'documents')
        ?.fields.filter((field) => field.type === 'file') ?? []
    const applicationId = persistedApplicationMeta.applicationId || `APP-${Date.now()}`
    const submittedAt = new Date().toISOString()
    const snapshot =
      typeof structuredClone === 'function'
        ? structuredClone(formValues)
        : JSON.parse(JSON.stringify(formValues))
    const submittedRecord = {
      id: applicationId,
      applicationRowId: String(persistedApplicationMeta.id || ''),
      submittedAt,
      userEmail,
      applicantName: `${formValues.firstName ?? ''} ${formValues.surname ?? ''}`.trim() || 'Applicant',
      formValues: snapshot,
      documents: documentFields.map((field) => ({
        name: field.name,
        label: field.label,
        required: Boolean(field.required),
        value: formValues[field.name] ?? '',
      })),
    }
    try {
      const existing = JSON.parse(window.localStorage.getItem(SUBMISSIONS_KEY) ?? '[]')
      const safeExisting = Array.isArray(existing) ? existing : []
      safeExisting.unshift(submittedRecord)
      window.localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(safeExisting))
    } catch {
      // ignore storage issues
    }
    setSubmittedSnapshot(snapshot)
    setLastSubmissionId(applicationId)
    // Clear current draft so returning to /application starts a new blank form.
    setCurrentStepIndex(0)
    setFormValues(initialForm)
    setActiveApplication({ id: '', applicationId: '' })
    setSubmitted(true)
  }

  function resetApplication() {
    setCurrentStepIndex(0)
    setFormValues(initialForm)
    setSubmitted(false)
    setSubmittedSnapshot(null)
    setLastSubmissionId('')
    setActiveApplication({ id: '', applicationId: '' })
  }

  async function handleDownloadApplicationForm() {
    const valuesForPdf = submitted && submittedSnapshot ? submittedSnapshot : formValues
    const sections = []
    applicationSteps
      .filter((step) => step.id !== 'reviewSubmit')
      .forEach((step) => {
        const visibleFields = step.fields.filter(
          (field) =>
            field.type !== 'note' &&
            !String(field.name ?? '').startsWith('__') &&
            isFieldVisible(field, valuesForPdf),
        )
        if (visibleFields.length === 0) return

        const entries = []
        visibleFields.forEach((field) => {
          if (field.type === 'repeatable') {
            const items = Array.isArray(valuesForPdf[field.name]) ? valuesForPdf[field.name] : []
            const itemLines = []
            if (items.length === 0) {
              itemLines.push('No entries')
            } else {
              items.forEach((row, idx) => {
                itemLines.push(`${field.itemBadge ?? 'Item'} ${idx + 1}`)
                ;(field.itemFields ?? []).forEach((sub) => {
                  itemLines.push(`  ${sub.label ?? sub.name}: ${getSingleFieldDisplayValue(sub, row?.[sub.name])}`)
                })
              })
            }
            entries.push({
              label: field.sectionTitle ?? field.label ?? field.name,
              value: itemLines.join('\n'),
            })
          } else {
            entries.push({
              label: field.label,
              value: getSingleFieldDisplayValue(field, valuesForPdf[field.name]),
            })
          }
        })
        sections.push({ title: step.title, entries })
      })

    await downloadApplicationSummaryPdf({
      referenceId: lastSubmissionId || 'mucm-application',
      sections,
    })
  }

  function handleLogout() {
    window.localStorage.removeItem('mucm-auth-session')
    navigate('/login')
  }

  function updateTicketField(name, value) {
    setTicketForm((previous) => ({ ...previous, [name]: value }))
    if (ticketNotice) {
      setTicketNotice('')
    }
  }

  async function handleRaiseTicket(event) {
    event.preventDefault()
    const question = ticketForm.question.trim()
    if (!ticketForm.email.trim() || !question) {
      setTicketNotice('Please enter your email, category, and question before raising a ticket.')
      return
    }
    if (!portalUserId || !authToken) {
      setTicketNotice('Please login again to submit a support ticket.')
      return
    }

    setSupportTicketSubmitting(true)
    setTicketNotice('')
    try {
      const created = await createSupportTicket({
        userId: portalUserId,
        token: authToken,
        categoryId: ticketForm.categoryId,
        question,
      })
      const latest = await fetchMySupportTickets({ userId: portalUserId, token: authToken })
      setTicketHistory(Array.isArray(latest) ? latest : [])
      const categoryLabel =
        created?.category ||
        supportTicketCategories.find((item) => item.id === ticketForm.categoryId)?.name ||
        'the selected category'
      setTicketNotice(
        `Ticket raised successfully under ${categoryLabel}. It is stored in support tickets and emailed to admissions.`,
      )
      setTicketForm((previous) => ({ ...previous, email: userEmail, question: '' }))
    } catch (error) {
      setTicketNotice(error.message || 'Failed to submit support ticket. Please try again.')
    } finally {
      setSupportTicketSubmitting(false)
    }
  }

  function renderAutoSaveBadge(size = 'desktop') {
    const isSaving = autoSaveStatus === 'saving'
    const containerSize =
      size === 'mobile'
        ? 'inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px]'
        : 'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px]'
    const palette = isSaving ? 'text-amber-700' : 'text-emerald-700'

    return (
      <p className={`${containerSize} ${palette}`}>
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
          }`}
        />
        <span className="font-medium">{isSaving ? 'Saving...' : 'Changes saved'}</span>
      </p>
    )
  }

  function renderModuleContent() {
    if (activeModule === 'Notification') {
      const actionNeeded = statusNotifications.filter(
        (item) => item.status === 'Action Needed',
      ).length
      const successCount = statusNotifications.filter(
        (item) => item.status === 'Success',
      ).length

      return (
        <section className="page-gutter-x space-y-4 py-4 sm:py-6 lg:py-8">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628]/45">
              Activity Hub
            </p>
            <h2 className="text-3xl text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
              Notifications
            </h2>
            <p className="mt-1 text-sm text-[#0A1628]/55">
              Important updates, reminders, and status changes for your application.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A1628]/45">Total Alerts</p>
              <p className="mt-1 text-2xl font-semibold text-[#0A1628]">
                {statusNotifications.length}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700/70">Action Needed</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700">{actionNeeded}</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700/70">Successful Updates</p>
              <p className="mt-1 text-2xl font-semibold text-green-700">{successCount}</p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h3 className="text-lg font-semibold text-[#0A1628]">Recent Activity</h3>
            {statusNotifications.map((item, index) => (
              <article
                key={item.id || item.title}
                className="relative rounded-xl border border-border bg-muted p-4"
              >
                {index !== statusNotifications.length - 1 ? (
                  <span className="pointer-events-none absolute bottom-[-14px] left-4 top-[calc(100%_-_4px)] w-px bg-[#0A1628]/12" />
                ) : null}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-[#0A1628]">{item.title}</h3>
                    <p className="mt-1 text-sm text-[#0A1628]/60">{item.message}</p>
                    <p className="mt-2 text-xs text-[#0A1628]/45">{item.time}</p>
                  </div>
                  <span className="whitespace-nowrap rounded-full bg-[#D4A843]/15 px-2.5 py-1 text-xs font-semibold text-[#7a5a14]">
                    {item.status}
                  </span>
                </div>
              </article>
            ))}
            {statusNotifications.length === 0 ? (
              <p className="text-sm text-[#0A1628]/60">No status notifications yet.</p>
            ) : null}
          </div>
        </section>
      )
    }

    if (activeModule === 'FAQ') {
      const supportTickets = (Array.isArray(ticketHistory) ? ticketHistory : []).map((ticket) => ({
        ...ticket,
        createdAt: ticket.createdAt || ticket.created_at || null,
        applicantEmail: ticket.applicantEmail || ticket.submittedBy || ticket.user_email || '',
        messages:
          Array.isArray(ticket.messages) && ticket.messages.length > 0
            ? ticket.messages
            : [
                ...(ticket.message
                  ? [
                      {
                        id: `${ticket.id || 'ticket'}-ask`,
                        from: 'applicant',
                        body: ticket.message,
                        sentAt: ticket.created_at || ticket.createdAt,
                      },
                    ]
                  : []),
                ...(ticket.admin_reply_message
                  ? [
                      {
                        id: `${ticket.id || 'ticket'}-reply`,
                        from: 'admin',
                        body: ticket.admin_reply_message,
                        sentAt: ticket.admin_replied_at || ticket.updated_at || ticket.updatedAt,
                      },
                    ]
                  : []),
              ],
      }))
      const tab =
        supportCenterTab === 'tickets' || supportCenterTab === 'faq'
          ? supportCenterTab
          : 'faq'
      const supportTabButtonClass = (id) =>
        `inline-flex min-h-[2.5rem] flex-1 items-center justify-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A843] sm:flex-none sm:min-w-[7.5rem] ${
          tab === id
            ? 'bg-[#f8f8f7] text-[#0A1628] shadow-sm ring-1 ring-[#D4A843]/50'
            : 'text-[#0A1628]/55 hover:bg-[#f8f8f7]/70 hover:text-[#0A1628]'
        }`

      const visibleFaqSections = faqApiRows.length
        ? groupFaqRowsByCategory(
            searchFaqRows(
              filterFaqsByContext(faqApiRows, currentStep?.id),
              faqSearch,
            ),
          )
        : faqSections
      const faqCategoryList = visibleFaqSections.map((section) => section.title)
      const filteredFaqSections = faqCategory
        ? visibleFaqSections.filter((section) => section.title === faqCategory)
        : visibleFaqSections

      return (
        <section className="page-gutter-x space-y-4 py-4 sm:py-6 lg:py-8">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628]/45">
              Support Center
            </p>
            <h2 className="text-3xl text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
              {tab === 'faq' ? 'Frequently Asked Questions' : 'Tickets'}
            </h2>
            <p className="mt-1 text-sm text-[#0A1628]/55">
              {tab === 'faq'
                ? 'Browse common answers and best practices for a smooth submission.'
                : 'Contact admissions, raise a request, and track your open tickets.'}
            </p>
          </div>

          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            role="tablist"
            aria-label="Support center sections"
          >
            <div className="inline-flex w-full max-w-md rounded-xl border border-border bg-muted p-1 sm:w-auto">
              <button
                type="button"
                role="tab"
                id="support-tab-faq"
                aria-selected={tab === 'faq'}
                className={supportTabButtonClass('faq')}
                onClick={() => setSupportCenterTab('faq')}
              >
                FAQ
              </button>
              <button
                type="button"
                role="tab"
                id="support-tab-tickets"
                aria-selected={tab === 'tickets'}
                className={supportTabButtonClass('tickets')}
                onClick={() => setSupportCenterTab('tickets')}
              >
                Tickets
              </button>
            </div>
          </div>

          {tab === 'faq' ? (
            <div
              role="tabpanel"
              id="support-panel-faq"
              aria-labelledby="support-tab-faq"
              className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                <input
                  type="search"
                  value={faqSearch}
                  onChange={(event) => setFaqSearch(event.target.value)}
                  placeholder="Search FAQs..."
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-[#0A1628] outline-none transition focus:border-[#D4A843]"
                />
                <select
                  value={faqCategory}
                  onChange={(event) => setFaqCategory(event.target.value)}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-[#0A1628] outline-none transition focus:border-[#D4A843]"
                >
                  <option value="">All categories</option>
                  {faqCategoryList.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              {faqLoading ? (
                <p className="text-sm text-[#0A1628]/60">Loading FAQs...</p>
              ) : null}
              {faqError ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {faqError}
                </p>
              ) : null}
              {filteredFaqSections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0A1628]/45">
                    {section.title}
                  </h3>
                  {section.items.map((item) => (
                    <details
                      key={item.question}
                      className="group rounded-xl border border-border bg-muted px-3 py-2.5"
                    >
                      <summary className="cursor-pointer list-none text-sm font-semibold text-[#0A1628] [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center justify-between gap-2">
                          {item.question}
                          <span className="text-xs text-[#0A1628]/40 transition group-open:rotate-45">
                            +
                          </span>
                        </span>
                      </summary>
                      <div
                        className="mt-2 border-t border-[#0A1628]/10 pt-2 text-sm text-[#0A1628]/60"
                        dangerouslySetInnerHTML={{ __html: sanitizeFaqHtml(item.answer) }}
                      />
                    </details>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div
              role="tabpanel"
              id="support-panel-tickets"
              aria-labelledby="support-tab-tickets"
              className="mx-auto w-full max-w-3xl"
            >
              <aside className="rounded-2xl border border-[#D4A843]/35 bg-gradient-to-br from-[#fff7df] to-white p-4 shadow-sm sm:p-5">
                <h3 className="text-lg font-semibold text-[#0A1628]">{faqSupport.title}</h3>
                <p className="mt-1 text-sm text-[#0A1628]/60">{faqSupport.description}</p>

                <form
                  className="mt-4 rounded-xl border border-border bg-card p-3"
                  onSubmit={handleRaiseTicket}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0A1628]/45">
                    Raise Ticket
                  </p>
                  <label className="mt-2 block">
                    <span className="text-xs font-semibold text-[#0A1628]/70">Email</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={ticketForm.email}
                      onChange={(event) => updateTicketField('email', event.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-[#0A1628] outline-none transition placeholder:text-[#0A1628]/35 focus:border-[#D4A843]"
                    />
                  </label>
                  <label className="mt-2 block">
                    <span className="text-xs font-semibold text-[#0A1628]/70">Category</span>
                    <select
                      value={ticketForm.categoryId}
                      onChange={(event) => updateTicketField('categoryId', event.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-[#0A1628] outline-none transition placeholder:text-[#0A1628]/35 focus:border-[#D4A843]"
                    >
                      {supportTicketCategories.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-2 block">
                    <span className="text-xs font-semibold text-[#0A1628]/70">Question</span>
                    <textarea
                      value={ticketForm.question}
                      onChange={(event) => updateTicketField('question', event.target.value)}
                      placeholder="Describe your issue or question clearly..."
                      className="mt-1 min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-[#0A1628] outline-none transition placeholder:text-[#0A1628]/35 focus:border-[#D4A843]"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={supportTicketSubmitting}
                    className="mt-3 inline-flex items-center justify-center rounded-lg bg-[#0A1628] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#163457]"
                  >
                    {supportTicketSubmitting ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                  {supportTicketLoading ? (
                    <p className="mt-2 text-xs text-[#0A1628]/55">Loading support categories and tickets...</p>
                  ) : null}
                  {ticketNotice ? (
                    <p className="mt-2 text-xs text-[#0A1628]/65">{ticketNotice}</p>
                  ) : null}

                  <div className="mt-4 border-t border-[#0A1628]/10 pt-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0A1628]/45">
                        My tickets
                      </p>
                      {supportTickets.length > 0 ? (
                        <span className="text-[11px] font-medium tabular-nums text-[#0A1628]/50">
                          {supportTickets.length}{' '}
                          {supportTickets.length === 1 ? 'ticket' : 'tickets'}
                        </span>
                      ) : null}
                    </div>
                    {supportTickets.length === 0 ? (
                      <p className="mt-2 text-xs text-[#0A1628]/50">
                        No tickets yet. When you submit one, it will appear here with full details
                        and status.
                      </p>
                    ) : (
                      <ul className="mt-3 max-h-[min(28rem,70vh)] space-y-3 overflow-y-auto pr-0.5">
                        {supportTickets.map((ticket, ticketIndex) => {
                          const status = ticket.status ?? 'open'
                          const { pill: statusPillClass, border: statusBorderClass } =
                            getSupportTicketStatusStyles(status)
                          const statusHint = getSupportTicketStatusHint(status)
                          let raised = null
                          try {
                            raised = ticket.createdAt ? new Date(ticket.createdAt) : null
                          } catch {
                            raised = null
                          }
                          const raisedFull =
                            raised && !Number.isNaN(raised.getTime())
                              ? raised.toLocaleString(undefined, {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : ''
                          return (
                            <li
                              key={ticket.id ?? `ticket-${ticketIndex}`}
                              className={`rounded-xl border border-border bg-muted p-3 shadow-sm ${statusBorderClass}`}
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="line-clamp-1 text-sm font-semibold text-[#0A1628]">
                                    {ticket.subject ?? 'Support ticket'}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-[#0A1628]/55">
                                    Submitted {raisedFull || '—'}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span className="inline-flex rounded-full bg-[#0A1628]/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#0A1628]/70">
                                    {ticket.category ?? 'Application'}
                                  </span>
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusPillClass}`}
                                  >
                                    {getSupportTicketStatusLabel(status)}
                                  </span>
                                </div>
                              </div>

                              <dl className="mt-3 space-y-2 border-t border-[#0A1628]/8 pt-3 text-xs">
                                {ticket.applicantEmail ? (
                                  <div>
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#0A1628]/45">
                                      Contact email
                                    </dt>
                                    <dd className="mt-0.5 break-all text-[#0A1628]">
                                      {ticket.applicantEmail}
                                    </dd>
                                  </div>
                                ) : null}
                                <div className="rounded-lg bg-[#0A1628]/[0.03] px-2.5 py-2 text-[11px] leading-snug text-[#0A1628]/65">
                                  {statusHint}
                                </div>
                                <div>
                                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#0A1628]/45">
                                    Conversation
                                  </dt>
                                  <dd className="mt-1">
                                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border bg-card/95 px-3 py-2.5 text-sm leading-relaxed text-[#0A1628]/85 [overflow-wrap:anywhere] whitespace-pre-wrap">
                                      {(Array.isArray(ticket.messages) ? ticket.messages : []).length ? (
                                        ticket.messages.map((message) => (
                                          <div key={message.id} className="rounded-md bg-white px-2 py-1.5">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0A1628]/45">
                                              {message.from === 'admin' ? 'Admin reply' : 'You'} · {formatWhen(message.sentAt)}
                                            </p>
                                            <p className="mt-0.5">{message.body}</p>
                                          </div>
                                        ))
                                      ) : (
                                        <p>—</p>
                                      )}
                                    </div>
                                  </dd>
                                </div>
                              </dl>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </form>
              </aside>
            </div>
          )}
        </section>
      )
    }

    if (activeModule === 'Document') {
      const sourceDocuments =
        serverDocumentData?.files
          ? (() => {
              const files = serverDocumentData.files || {}
              const orderedKeys = [
                ...BACKEND_DOCUMENT_ORDER.filter((key) => Object.prototype.hasOwnProperty.call(files, key)),
                ...Object.keys(files).filter((key) => !BACKEND_DOCUMENT_ORDER.includes(key)),
              ]
              return orderedKeys
                .map((key) => {
                  const entry = files[key] || {}
                  const pathValue = entry.path || ''
                  // Prefer local API host from stored path so local/dev backend files open correctly.
                  const urlValue = resolveStoredFileUrl(pathValue) || entry.url || ''
                  return {
                    key,
                    label: BACKEND_DOCUMENT_LABELS[key] || key.replace(/_/g, ' '),
                    value: pathValue,
                    url: urlValue,
                    required: false,
                  }
                })
                .filter((item) => String(item.value || '').trim() !== '')
            })()
          : selectedDocumentSubmission?.documents && selectedDocumentSubmission.documents.length > 0
          ? selectedDocumentSubmission.documents.map((doc) => ({
              key: doc.name || doc.label,
              label: doc.label,
              value: doc.value,
              url: resolveStoredFileUrl(doc.value),
              required: Boolean(doc.required),
            })).filter((item) => String(item.value || '').trim() !== '')
          : uploadedDocuments.map((doc) => ({
              key: doc.label,
              ...doc,
              url: resolveStoredFileUrl(doc.value),
            })).filter((item) => String(item.value || '').trim() !== '')
      const requiredDocs = sourceDocuments.filter((item) => item.required)
      const uploadedRequiredCount = requiredDocs.filter((item) => item.value).length
      const completionPercent = requiredDocs.length
        ? Math.round((uploadedRequiredCount / requiredDocs.length) * 100)
        : 0

      return (
        <section className="page-gutter-x space-y-4 py-4 sm:py-6 lg:py-8">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628]/45">
              File Management
            </p>
            <h2 className="text-3xl text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
              Document Center
            </h2>
            <p className="mt-1 text-sm text-[#0A1628]/55">
              Monitor required uploads, document status, and completion progress. Select a submitted
              application ID to view its saved documents.
            </p>
          </div>

          {submittedApplications.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0A1628]/45">
                  Submitted IDs
                </p>
                <div className="space-y-1.5">
                  {submittedApplications.map((submission) => {
                    const isSelected = selectedDocumentSubmission?.id === submission.id
                    return (
                      <button
                        key={submission.id}
                        type="button"
                        onClick={() => setSelectedDocumentSubmissionId(submission.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? 'border-[#D4A843]/65 bg-[#fff8e8] text-[#0A1628]'
                            : 'border-border bg-white text-[#0A1628]/70 hover:border-[#D4A843]/35 hover:bg-[#F8F7F4]'
                        }`}
                      >
                        <p className="font-semibold">{submission.id}</p>
                        <p className="mt-0.5 text-xs text-[#0A1628]/45">
                          {new Date(submission.submittedAt).toLocaleString()}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </aside>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0A1628]/45">
                  Viewing Submission
                </p>
                <p className="mt-1 text-sm font-semibold text-[#0A1628]">
                  {selectedDocumentSubmission?.id ?? 'Current draft'}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A1628]/45">Required Uploaded</p>
              <p className="mt-1 text-2xl font-semibold text-[#0A1628]">
                {uploadedRequiredCount}/{requiredDocs.length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A1628]/45">Total Files</p>
              <p className="mt-1 text-2xl font-semibold text-[#0A1628]">{sourceDocuments.length}</p>
            </div>
            <div className="rounded-xl border border-[#D4A843]/35 bg-[#fff8e8] p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5a14]">Completion</p>
              <p className="mt-1 text-2xl font-semibold text-[#7a5a14]">{completionPercent}%</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            {serverDocumentLoading ? (
              <p className="mb-3 text-xs text-[#0A1628]/55">Loading uploaded documents from server...</p>
            ) : null}
            {serverDocumentError ? (
              <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {serverDocumentError}
              </p>
            ) : null}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-[#0A1628]/55">
                <span>Required documents completion</span>
                <span className="font-semibold text-[#0A1628]">{completionPercent}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#0A1628]/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-[#D4A843] to-[#b98a22] transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {sourceDocuments.length > 0 ? sourceDocuments.map((item) => (
                <div
                  key={item.key || item.label}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-muted px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0A1628]/85">{item.label}</p>
                    <p className="truncate text-xs text-[#0A1628]/50">
                      {item.value ? item.value : 'Not uploaded'}
                    </p>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-medium text-[#b98a22] underline underline-offset-2 hover:text-[#8a6918]"
                      >
                        View uploaded document
                      </a>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.value
                        ? 'bg-green-100 text-green-700'
                        : item.required
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.value ? 'Uploaded' : item.required ? 'Required' : 'Optional'}
                  </span>
                </div>
              )) : (
                <p className="rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-[#0A1628]/60">
                  No uploaded documents found for this application ID.
                </p>
              )}
            </div>
          </div>
        </section>
      )
    }

    return (
      <StepForm
        step={currentStep}
        stepNumber={currentStepIndex + 1}
        totalSteps={applicationSteps.length}
        steps={applicationSteps}
        currentIndex={currentStepIndex}
        onStepClick={handleStepClick}
        values={formValues}
        errors={validationErrors}
        formError={formError}
        draftNotice={draftNotice}
        onChange={updateField}
        onFileUpload={uploadApplicationDocumentField}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSaveDraft={handleSaveDraft}
        canGoBack={currentStepIndex > 0}
        isLastStep={currentStepIndex === applicationSteps.length - 1}
        onSubmit={handleSubmit}
      />
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {cooldownNotice.open && !submitted && activeModule === 'Application form' ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="pointer-events-auto w-full max-w-lg rounded-xl border border-[#D4A843]/40 bg-white p-5 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7a5a14]">
              Submission Notice
            </p>
            <h2 className="mt-1 text-2xl text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
              Application already submitted
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#0A1628]/70">
              You already submitted an application. Next new application submission will be allowed after{' '}
              <strong>{SUBMIT_COOLDOWN_DAYS} days</strong>.
            </p>
            {cooldownNotice.nextAllowedAt ? (
              <p className="mt-2 text-sm font-semibold text-[#0A1628]/80">
                Next allowed submission: {new Date(cooldownNotice.nextAllowedAt).toLocaleString()}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setCooldownNotice((prev) => ({ ...prev, open: true }))}
                className="rounded-lg border border-[#0A1628]/15 bg-white px-4 py-2 text-sm font-semibold text-[#0A1628]/80 transition hover:border-[#D4A843]/50 hover:bg-[#fff8e8]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {!submitted ? (
        <header className="page-gutter-x border-b border-border bg-card/95 py-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={crestLogo}
                  alt="MUCM Crest"
                  className="h-10 w-10 rounded-lg border border-[#0A1628]/10 bg-white p-1 shadow-sm"
                />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0A1628]/45 sm:text-xs">
                    METROPOLITAN UNIVERSITY COLLEGE OF MEDICINE
                  </p>
                  <h1 className="text-base text-[#0A1628] [font-family:'DM_Serif_Display',serif] sm:text-lg">
                    Application Form
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {renderAutoSaveBadge('mobile')}
                <ProfileDropdown
                  email={userEmail}
                  onLogout={handleLogout}
                  onBackToChecklist={() => navigate('/before-you-begin')}
                />
              </div>
            </div>
          </div>
        </header>
      ) : null}

      {!submitted ? (
        <div className="page-gutter-x border-b border-border bg-card/90 py-2 backdrop-blur lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {moduleNavigation.map((module) => (
              <button
                key={module.name}
                type="button"
                onClick={() => handleModuleChange(module.name)}
                className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  activeModule === module.name
                    ? 'border-[#D4A843]/70 bg-[#D4A843]/20 text-[#0A1628]'
                    : 'border-border bg-card/95 text-muted-foreground'
                }`}
              >
                {module.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {submitted ? (
        <section className="page-gutter-x mx-auto w-full max-w-[780px] py-8 text-center sm:py-10">
          <div className="mx-auto flex w-fit items-center gap-2 text-[#0A1628]/35">
            <img
              src={crestLogo}
              alt="MUCM Crest"
              className="h-11 w-11 rounded-lg border border-[#0A1628]/10 bg-white p-1 shadow-sm"
            />
            <span className="text-xs font-bold uppercase tracking-[0.16em]">
              Metropolitan University College of Medicine
            </span>
          </div>

          <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-100/70">
            <span className="text-2xl text-emerald-600">✓</span>
          </div>

          <img
            src="https://cdn-icons-png.flaticon.com/512/3135/3135755.png"
            alt="Graduates"
            className="mx-auto mt-4 h-28 w-28 object-contain sm:h-32 sm:w-32"
          />

          <h2 className="mt-3 text-4xl text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
            Application Submitted!
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#0A1628]/58">
            Thank you for applying to Metropolitan University College of Medicine.
            Your application has been received and is now under review.
          </p>
          {lastSubmissionId ? (
            <p className="mt-2 text-sm font-semibold text-[#0A1628]/65">
              Reference ID: {lastSubmissionId}
            </p>
          ) : null}

          <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-border bg-card p-5 text-left shadow-lg shadow-[#0A1628]/8 sm:p-6">
            <h3 className="text-3xl font-semibold tracking-tight text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
              What Happens Next?
            </h3>
            <ol className="mt-4 list-decimal space-y-1.5 pl-6 text-lg leading-relaxed text-[#111827]">
              <li>Your application fee invoice will be sent to your registered email</li>
              <li>Complete the <strong>application fee payment</strong></li>
              <li>Our <strong>Admissions Team will review your application</strong></li>
              <li>Attend an <strong>interview with our Admissions Counselor</strong></li>
              <li>Submit any pending or missing documents</li>
              <li>Attend an interview with the Dean of Admissions</li>
              <li>Receive your official Admission Offer Letter</li>
              <li><strong>Sign and return</strong> the Admission Offer Letter</li>
              <li>Your <strong>registration fee invoice</strong> will be shared</li>
              <li>Complete the <strong>registration fee payment</strong></li>
              <li>Receive visa guidance and documentation support</li>
              <li>Apply for your student visa online</li>
              <li>Your <strong>tuition fee invoice</strong> will be shared</li>
              <li>Complete your <strong>tuition fee payment</strong></li>
              <li>Travel to <strong>Antigua</strong></li>
              <li>Begin your <strong>Doctor of Medicine (MD) journey</strong></li>
            </ol>
            <div className="mt-6 border-t border-[#0A1628]/25 pt-5">
              <h4 className="text-2xl font-semibold tracking-tight text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
                Optional CTA Section
              </h4>
              <ul className="mt-3 list-disc space-y-1 pl-6 text-lg italic text-[#111827]">
                <li>Check your email for the next steps</li>
                <li>Our admissions team will contact you shortly</li>
                <li>[Download Our Brochure]</li>
              </ul>
            </div>
          </div>

          <p className="mt-6 text-sm text-[#0A1628]/52">
            Questions? Contact us at{' '}
            <a className="font-semibold text-[#b98a22] hover:text-[#9f741a]" href="mailto:admissions@muantigua.org">
              admissions@muantigua.org
            </a>{' '}
            or call{' '}
            <a className="font-semibold text-[#b98a22] hover:text-[#9f741a]" href="tel:+12685629262">
              +1 (268) 562-9262
            </a>
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton variant="outline" type="button" onClick={handleDownloadApplicationForm}>
              Download Application Form
            </PrimaryButton>
            <PrimaryButton
              variant="outline"
              type="button"
              onClick={() => navigate('/submitted-applications')}
            >
              View Submitted Applications
            </PrimaryButton>
            <PrimaryButton variant="outline" type="button" onClick={resetApplication}>
              Start New Application
            </PrimaryButton>
          </div>
        </section>
      ) : (
        <div className="grid min-h-screen grid-cols-1 lg:h-[100dvh] lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)] lg:overflow-hidden">
          <StepSidebar
            activeModule={activeModule}
            onModuleChange={handleModuleChange}
          />
          <section ref={desktopScrollRef} className="flex min-h-0 flex-col lg:h-[100dvh] lg:overflow-y-auto">
            <div className="page-gutter-x hidden items-center justify-between border-b border-border bg-card/95 py-2.5 backdrop-blur-md lg:sticky lg:top-0 lg:z-20 lg:flex">
              <div className="flex items-center gap-3">
                <img
                  src={crestLogo}
                  alt="MUCM Crest"
                  className="h-10 w-10 rounded-xl border border-border bg-card p-1 shadow-sm"
                />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628]/45">
                    METROPOLITAN UNIVERSITY COLLEGE OF MEDICINE
                  </p>
                  <h1 className="text-xl text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
                    Application Form
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {renderAutoSaveBadge()}
                <ProfileDropdown
                  email={userEmail}
                  onLogout={handleLogout}
                  onBackToChecklist={() => navigate('/before-you-begin')}
                />
              </div>
            </div>
            {renderModuleContent()}
          </section>
        </div>
      )}
    </main>
  )
}

export default ApplicationPage
