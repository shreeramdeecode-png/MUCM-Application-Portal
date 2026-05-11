import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepSidebar from '../components/application/StepSidebar.jsx'
import ProfileDropdown from '../components/common/ProfileDropdown.jsx'
import PrimaryButton from '../components/common/PrimaryButton.jsx'
import { apiUrl } from '../config/baseUrl.js'
import { applicationSteps } from '../data/applicationSteps.js'
import { isFieldVisible } from '../utils/formVisibility.js'
import { getSingleFieldDisplayValue } from '../utils/submissionDisplay.js'
import {
  clearApplicantHydrationSessionFlags,
  getApplicantStorageScope,
  migrateApplicantDraftStorage,
  submissionsStorageKey,
} from '../utils/applicantStorageKeys.js'
import { downloadApplicationSummaryPdf } from '../utils/applicationFormPdf.js'
import { downloadPrefilledStep7Pdf } from '../utils/step7SponsorPdf.js'
import { buildPdfSections } from '../utils/pdfDataBuilders.js'
import { Download, FileText, Landmark } from 'lucide-react'

const crestLogo =
  'https://d2xsxph8kpxj0f.cloudfront.net/310519663394975842/o5YxQXzG37vUfAnZtRoyQg/mucm-crest-logo_aac17a92.png'
const LEGACY_SUBMISSIONS_KEY = 'mucm-submitted-applications'
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

/** Backend `files` keys → `documentType` query param for POST `/:rowId/document/upload` */
const BACKEND_KEY_TO_UPLOAD_DOCUMENT_TYPE = {
  passport: 'passport',
  bank_statement: 'bankStatement',
  premedical_Bachelor_ug_HSC_Certificate: 'preMedTranscript',
  Secondary_11grade: 'grade11Transcript',
  cv_resume: 'cv',
  passport_photo: 'passportPhoto',
  other_professional_transcripts: 'otherProfessionalTranscripts',
  exam_results_marksheet: 'examResults',
  sponsor_signed_financial_form: 'sponsorSignedFinancialForm',
  review_signature_document: 'reviewSignatureDocument',
}

/** Form field `name` (submission snapshot) → upload documentType */
const FORM_FIELD_TO_UPLOAD_DOCUMENT_TYPE = {
  passport: 'passport',
  passports: 'passport',
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

function resolveUploadDocumentType(doc) {
  const backendKey = doc.key
  if (backendKey && BACKEND_KEY_TO_UPLOAD_DOCUMENT_TYPE[backendKey]) {
    return BACKEND_KEY_TO_UPLOAD_DOCUMENT_TYPE[backendKey]
  }
  const fieldName = doc.name
  if (fieldName && FORM_FIELD_TO_UPLOAD_DOCUMENT_TYPE[fieldName]) {
    return FORM_FIELD_TO_UPLOAD_DOCUMENT_TYPE[fieldName]
  }
  return ''
}

async function fetchApplicationRowIdByApplicationId(applicationId, authHeader, paths) {
  const appId = String(applicationId || '').trim()
  if (!appId) return ''

  for (const basePath of paths) {
    try {
      const endpoint = `${basePath}/by-application-id/${encodeURIComponent(appId)}`
      const response = await fetch(apiUrl(endpoint), { headers: authHeader })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data.success !== false) {
        const row = data.data ?? data.application ?? data
        const id = String(row?.id ?? '').trim()
        if (id) return id
      }
    } catch {
      continue
    }
  }
  return ''
}

function SubmissionAnswers({ formValues }) {
  const stepsWithFields = useMemo(() => {
    if (!formValues || typeof formValues !== 'object') {
      return []
    }
    return applicationSteps
      .filter((s) => s.id !== 'reviewSubmit')
      .map((step) => ({
        step,
        visibleFields: step.fields.filter(
          (field) =>
            field.type !== 'note' &&
            !String(field.name).startsWith('__') &&
            isFieldVisible(field, formValues),
        ),
      }))
      .filter(({ visibleFields }) => visibleFields.length > 0)
  }, [formValues])

  if (stepsWithFields.length === 0) {
    return null
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0A1628]/40">
        All submitted answers
      </p>
      {stepsWithFields.map(({ step, visibleFields }) => (
        <div
          key={step.id}
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          <div className="border-b border-[#0A1628]/8 bg-[#F8F7F4] px-5 py-2.5 sm:px-6">
            <h4 className="text-base font-semibold text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
              {step.title}
            </h4>
            {step.description ? (
              <p className="mt-0.5 text-xs text-[#0A1628]/50">{step.description}</p>
            ) : null}
          </div>
          <div className="space-y-0 p-5 sm:p-6">
            {visibleFields.map((field) => (
              <div
                key={`${step.id}-${field.name}`}
                className="border-b border-[#0A1628]/8 py-2.5 last:border-b-0"
              >
                {field.type === 'repeatable' ? (
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0A1628]/45">
                      {field.sectionTitle ?? field.label ?? field.name}
                    </p>
                    {Array.isArray(formValues[field.name]) && formValues[field.name].length > 0 ? (
                      formValues[field.name].map((row, rowIndex) => (
                        <div
                          key={`${field.name}-row-${rowIndex}`}
                          className="rounded-lg border border-[#0A1628]/8 bg-[#F8F7F4] px-3 py-2.5"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0A1628]/45">
                            {field.itemBadge ?? 'Item'} {rowIndex + 1}
                          </p>
                          <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {(field.itemFields ?? []).map((sub) => (
                              <p
                                key={`${field.name}-${rowIndex}-${sub.name}`}
                                className="text-xs text-[#0A1628]/72"
                              >
                                <span className="font-semibold text-[#0A1628]/82">
                                  {String(sub.label ?? sub.name).toUpperCase()}:
                                </span>{' '}
                                {getSingleFieldDisplayValue(sub, row?.[sub.name])}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#0A1628]/55">No entries added.</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-start sm:gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0A1628]/45">
                      {field.label}
                    </p>
                    {field.type === 'file' &&
                    typeof formValues[field.name] === 'string' &&
                    formValues[field.name].startsWith('data:image/') ? (
                      <div className="space-y-1.5">
                        <p className="text-xs text-[#0A1628]/55">Uploaded signature</p>
                        <img
                          src={formValues[field.name]}
                          alt=""
                          className="max-h-24 max-w-[240px] rounded-lg border border-[#0A1628]/10 bg-white object-contain"
                        />
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap text-[#0A1628]/78">
                        {getSingleFieldDisplayValue(field, formValues[field.name])}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SubmittedApplicationsPage() {
  const navigate = useNavigate()
  const [activeModule, setActiveModule] = useState('Submitted Applications')
  const authSession = (() => {
    try {
      return JSON.parse(window.localStorage.getItem('mucm-auth-session') ?? '{}')
    } catch {
      return {}
    }
  })()
  migrateApplicantDraftStorage(authSession)
  const userEmail = authSession?.email ?? ''
  const authToken = String(authSession?.token ?? '').trim()

  const applicantScope = useMemo(
    () =>
      getApplicantStorageScope({
        userId: authSession?.userId,
        id: authSession?.id,
        email: authSession?.email,
        token: authToken,
      }),
    [authSession?.userId, authSession?.id, authSession?.email, authToken],
  )

  const submissionsPersistKey = useMemo(() => submissionsStorageKey(applicantScope), [applicantScope])

  const submissions = useMemo(() => {
    try {
      const scopedRaw = JSON.parse(window.localStorage.getItem(submissionsPersistKey) ?? '[]')
      const legacyRaw = JSON.parse(window.localStorage.getItem(LEGACY_SUBMISSIONS_KEY) ?? '[]')
      const scoped = Array.isArray(scopedRaw) ? scopedRaw : []
      const legacy = Array.isArray(legacyRaw) ? legacyRaw : []
      const byId = new Map()
      for (const item of legacy) {
        if (item?.id && item.userEmail === userEmail) {
          byId.set(item.id, item)
        }
      }
      for (const item of scoped) {
        if (item?.id && item.userEmail === userEmail) {
          byId.set(item.id, item)
        }
      }
      return [...byId.values()].sort((a, b) => {
        const ta = new Date(a.submittedAt || 0).getTime()
        const tb = new Date(b.submittedAt || 0).getTime()
        return tb - ta
      })
    } catch {
      return []
    }
  }, [submissionsPersistKey, userEmail])

  const [selectedSubmissionId, setSelectedSubmissionId] = useState(submissions[0]?.id ?? '')
  const selectedSubmission = submissions.find((item) => item.id === selectedSubmissionId) ?? submissions[0] ?? null
  const [apiDocuments, setApiDocuments] = useState([])
  const [apiDocumentsLoading, setApiDocumentsLoading] = useState(false)
  const [apiDocumentsError, setApiDocumentsError] = useState('')
  const fileReplaceRef = useRef(null)
  const [resolvedRowId, setResolvedRowId] = useState('')
  const [documentsRefreshKey, setDocumentsRefreshKey] = useState(0)
  const [pendingUploadDocumentType, setPendingUploadDocumentType] = useState('')
  const [replaceBusy, setReplaceBusy] = useState(false)
  const [replaceNotice, setReplaceNotice] = useState('')

  function getAuthHeader() {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }

  function buildApplicationsPaths() {
    return ['/api/v1/applications', '/api/applications', '/applications', '/application']
  }

  useEffect(() => {
    if (!selectedSubmission || !authToken) {
      setResolvedRowId('')
      return undefined
    }

    const cached = String(selectedSubmission.applicationRowId || '').trim()
    if (cached) {
      setResolvedRowId(cached)
      return undefined
    }

    let cancelled = false
    ;(async () => {
      const rowId = await fetchApplicationRowIdByApplicationId(
        selectedSubmission.id,
        getAuthHeader(),
        buildApplicationsPaths(),
      )
      if (!cancelled) setResolvedRowId(rowId)
    })()

    return () => {
      cancelled = true
    }
  }, [selectedSubmission, authToken])

  async function postSubmittedDocumentUpload(rowId, documentType, file) {
    const paths = buildApplicationsPaths()
    let lastError = null
    const headers = getAuthHeader()

    for (const basePath of paths) {
      const endpoint = `${basePath}/${encodeURIComponent(rowId)}/document/upload?documentType=${encodeURIComponent(documentType)}`
      const formData = new FormData()
      formData.append('file', file)
      try {
        const response = await fetch(apiUrl(endpoint), {
          method: 'POST',
          headers,
          body: formData,
        })
        const data = await response.json().catch(() => ({}))
        if (response.ok && data.success !== false) {
          return String(data?.data?.storedPath || '')
        }
        if (response.status === 404) {
          lastError = new Error(data.message || 'Upload endpoint not found.')
          continue
        }
        throw new Error(data.message || 'Failed to upload document.')
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Upload failed.')
      }
    }

    throw lastError || new Error('Document upload failed.')
  }

  function handleReplaceDocumentClick(doc) {
    const uploadType = resolveUploadDocumentType(doc)
    if (!uploadType) {
      setReplaceNotice('This document cannot be replaced automatically. Use Document in the menu if needed.')
      return
    }
    if (!resolvedRowId) {
      setReplaceNotice('Could not resolve your application on the server yet. Try again in a moment.')
      return
    }
    if (!authToken) {
      setReplaceNotice('Please sign in again to upload.')
      return
    }
    setReplaceNotice('')
    setPendingUploadDocumentType(uploadType)
    window.requestAnimationFrame(() => fileReplaceRef.current?.click())
  }

  async function handleReplaceFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    const uploadType = pendingUploadDocumentType
    setPendingUploadDocumentType('')
    if (!file || !uploadType || !resolvedRowId) return

    setReplaceBusy(true)
    setReplaceNotice('')
    try {
      await postSubmittedDocumentUpload(resolvedRowId, uploadType, file)
      setReplaceNotice('Document updated successfully.')
      setDocumentsRefreshKey((n) => n + 1)
      window.setTimeout(() => setReplaceNotice(''), 5000)
    } catch (error) {
      setReplaceNotice(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setReplaceBusy(false)
    }
  }

  useEffect(() => {
    const applicationId = String(selectedSubmission?.id || '').trim()
    if (!applicationId) {
      setApiDocuments([])
      setApiDocumentsError('')
      return
    }

    let cancelled = false
    setApiDocumentsLoading(true)
    setApiDocumentsError('')

    ;(async () => {
      let lastError = null
      for (const basePath of buildApplicationsPaths()) {
        const endpoint = `${basePath}/by-application-id/${encodeURIComponent(applicationId)}/document`
        try {
          const response = await fetch(apiUrl(endpoint), {
            headers: {
              ...getAuthHeader(),
            },
          })
          const data = await response.json().catch(() => ({}))
          if (response.ok && data.success !== false) {
            const files = data?.data?.files || {}
            const keys = [
              ...BACKEND_DOCUMENT_ORDER.filter((key) => Object.prototype.hasOwnProperty.call(files, key)),
              ...Object.keys(files).filter((key) => !BACKEND_DOCUMENT_ORDER.includes(key)),
            ]
            const requiredByBackendKey = {
              passport: true,
              bank_statement: true,
              premedical_Bachelor_ug_HSC_Certificate: true,
              Secondary_11grade: true,
              cv_resume: true,
              passport_photo: true,
            }
            const mapped = keys.map((key) => {
              const entry = files[key] || {}
              return {
                key,
                label: BACKEND_DOCUMENT_LABELS[key] || key.replace(/_/g, ' '),
                value: entry.path || '',
                url: entry.url || '',
                required: Boolean(requiredByBackendKey[key]),
              }
            })
            if (!cancelled) {
              setApiDocuments(mapped)
              setApiDocumentsLoading(false)
            }
            return
          }
          if (response.status === 404) {
            lastError = new Error(data.message || 'Documents not found for this submission.')
            continue
          }
          throw new Error(data.message || 'Failed to load documents.')
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Failed to load documents.')
          continue
        }
      }
      if (!cancelled) {
        setApiDocuments([])
        setApiDocumentsError(lastError?.message || 'Failed to load documents.')
        setApiDocumentsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedSubmission, authToken, documentsRefreshKey])

  const displayedDocuments = apiDocuments.length > 0 ? apiDocuments : (selectedSubmission?.documents || [])

  function handleModuleChange(moduleName) {
    setActiveModule(moduleName)
    if (moduleName === 'Submitted Applications') {
      return
    }
    navigate('/application', { state: { initialModule: moduleName } })
  }

  function handleLogout() {
    const scope = getApplicantStorageScope({
      userId: authSession?.userId,
      id: authSession?.id,
      email: authSession?.email,
      token: authToken,
    })
    clearApplicantHydrationSessionFlags(scope)
    window.localStorage.removeItem('mucm-auth-session')
    window.localStorage.removeItem('mucm-support-center-tab')
    navigate('/login')
  }

  async function handleDownloadSummary(submission) {
    if (!submission?.formValues) return
    const sections = buildPdfSections(submission.formValues)
    await downloadApplicationSummaryPdf({
      referenceId: submission.id || 'mucm-application',
      sections,
    })
  }

  async function handleDownloadSponsorForm(submission) {
    if (!submission?.formValues) return
    const downloadLink = {
      href: '/forms/mucm-step-7-sponsor-financial-declaration.pdf',
      fileName: 'mucm-step-7-sponsor-financial-declaration.pdf',
      label: 'Download Step 7 sponsor form (PDF)',
      prefillFromValues: true,
    }
    await downloadPrefilledStep7Pdf(submission.formValues, downloadLink)
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="page-gutter-x border-b border-border bg-card/95 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src={crestLogo}
              alt="MUCM Crest"
              className="h-10 w-10 rounded-lg border border-border bg-card p-1 shadow-sm"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0A1628]/45">
                APPLICATION ARCHIVE
              </p>
              <h1 className="text-base text-[#0A1628] [font-family:'DM_Serif_Display',serif] sm:text-lg">
                Submitted Applications
              </h1>
            </div>
          </div>
          <ProfileDropdown email={userEmail} onLogout={handleLogout} />
        </div>
      </header>

      <div className="grid min-h-screen grid-cols-1 lg:h-[100dvh] lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)] lg:overflow-hidden">
        <StepSidebar activeModule={activeModule} onModuleChange={handleModuleChange} />

        <section className="flex flex-col lg:h-[100dvh] lg:overflow-y-auto">
          <div className="page-gutter-x hidden items-center justify-between border-b border-border bg-card/95 py-2.5 backdrop-blur-md lg:sticky lg:top-0 lg:z-20 lg:flex">
            <div className="flex items-center gap-3">
              <img
                src={crestLogo}
                alt="MUCM Crest"
                className="h-10 w-10 rounded-xl border border-border bg-card p-1 shadow-sm"
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628]/45">
                  APPLICATION ARCHIVE
                </p>
                <h1 className="text-xl text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
                  Submitted Applications
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PrimaryButton variant="outline" type="button" onClick={() => navigate('/before-you-begin')}>
                Back
              </PrimaryButton>
              <PrimaryButton type="button" onClick={() => navigate('/application')}>
                New Application
              </PrimaryButton>
              <ProfileDropdown email={userEmail} onLogout={handleLogout} />
            </div>
          </div>

          <div className="page-gutter-x space-y-3 py-3 sm:py-5 lg:py-6">
            {submissions.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
                <h2 className="text-2xl text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
                  No submitted applications yet
                </h2>
                <p className="mt-2 text-sm text-[#0A1628]/60">
                  Once you submit, your application and document statuses will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:h-[calc(100dvh-8rem)] lg:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="rounded-2xl border border-border bg-card p-3 shadow-sm lg:sticky lg:top-6 lg:h-fit">
                  <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0A1628]/45">
                    Submitted IDs
                  </p>
                  <div className="space-y-1.5">
                    {submissions.map((submission) => {
                      const isSelected = selectedSubmission?.id === submission.id
                      return (
                        <div
                          key={submission.id}
                          className={`group relative w-full rounded-xl border transition-all duration-200 ${
                            isSelected
                              ? 'border-[#D4A843]/65 bg-[#fff8e8] shadow-sm'
                              : 'border-border bg-white hover:border-[#D4A843]/35 hover:bg-[#F8F7F4]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedSubmissionId(submission.id)}
                            className="w-full px-3 py-2.5 text-left"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className={`text-sm font-bold ${isSelected ? 'text-[#0A1628]' : 'text-[#0A1628]/80'}`}>
                                  {submission.id}
                                </p>
                                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[#0A1628]/40">
                                  {new Date(submission.submittedAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownloadSummary(submission)
                                }}
                                title="Download Summary PDF"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4A843]/30 bg-white text-[#b98a22] shadow-sm transition-all hover:scale-110 hover:border-[#D4A843]/60 hover:bg-[#fff8e8] active:scale-95"
                              >
                                <Download className="h-4 w-4" strokeWidth={2.5} />
                              </div>
                            </div>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </aside>

                {selectedSubmission ? (
                  <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:h-full">
                    <div className="border-b border-[#0A1628]/8 bg-[#F8F7F4] px-6 py-3 sm:px-8">
                      <h3 className="text-lg text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
                        Submission {selectedSubmission.id}
                      </h3>
                    </div>
                    <div className="bg-[#F8F7F4] px-6 py-4 sm:px-8 lg:h-[calc(100%-2.9rem)] lg:overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-border bg-card p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0A1628]/40">
                            Applicant Details
                          </p>
                          <p className="mt-1 text-sm text-[#0A1628]/75">
                            Name: {selectedSubmission.applicantName}
                          </p>
                          <p className="text-sm text-[#0A1628]/75">
                            Email: {selectedSubmission.formValues?.email || 'Not provided'}
                          </p>
                          <p className="text-sm text-[#0A1628]/75">
                            Phone: {selectedSubmission.formValues?.phoneMobile || 'Not provided'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0A1628]/40">
                            Application Meta
                          </p>
                          <p className="mt-1 text-sm text-[#0A1628]/75">
                            Submitted by: {selectedSubmission.userEmail}
                          </p>
                          <p className="text-sm text-[#0A1628]/75">
                            Submission ID: {selectedSubmission.id}
                          </p>
                        </div>
                      </div>

                      <SubmissionAnswers formValues={selectedSubmission.formValues} />

                      {/* Download Center */}
                      <div className="mt-3 overflow-hidden rounded-xl border border-[#D4A843]/25 bg-gradient-to-br from-card via-secondary/40 to-[#fff8e8]/50 shadow-sm">
                        <div className="border-b border-[#D4A843]/15 bg-[#D4A843]/5 px-4 py-2.5 sm:px-6">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a6918]/80">
                            Download Center
                          </p>
                          <h4 className="mt-0.5 text-sm font-semibold text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
                            Export Application Documents
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">

                          {/* Sponsor Form Download (Conditional) */}
                          {['B', 'C'].includes(selectedSubmission.formValues?.paymentOption) ? (
                            <div className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-[#D4A843]/40 hover:shadow-md">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 shadow-sm transition group-hover:bg-[#D4A843]/15 group-hover:text-[#b98a22]">
                                  <Landmark className="h-5 w-5" strokeWidth={1.75} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-[#0A1628]">Sponsor Declaration</p>
                                  <p className="mt-0.5 text-xs leading-relaxed text-[#0A1628]/50">
                                    Prefilled Step 7 form for sponsor signature.
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDownloadSponsorForm(selectedSubmission)}
                                className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-[#D4A843]/45 bg-gradient-to-r from-[#D4A843]/12 to-[#D4A843]/5 px-4 py-2.5 text-sm font-semibold text-[#5c4510] shadow-sm transition hover:border-[#D4A843]/70 hover:from-[#D4A843]/18 hover:to-[#D4A843]/8"
                              >
                                <Download className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                                Download Sponsor Form (PDF)
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
                              <p className="text-xs font-medium text-[#0A1628]/35">
                                Sponsor form not required for self-funded applications.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-border bg-card p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0A1628]/40">
                          Documents
                        </p>
                        {apiDocumentsLoading ? (
                          <p className="mt-2 text-xs text-[#0A1628]/55">Loading documents from server...</p>
                        ) : null}
                        {apiDocumentsError ? (
                          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-700">
                            {apiDocumentsError}
                          </p>
                        ) : null}
                        {replaceBusy ? (
                          <p className="mt-2 text-xs text-[#0A1628]/55">Uploading replacement…</p>
                        ) : null}
                        {replaceNotice ? (
                          <p
                            className={`mt-2 rounded-lg border px-2.5 py-2 text-xs ${
                              replaceNotice.includes('successfully')
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-rose-200 bg-rose-50 text-rose-800'
                            }`}
                          >
                            {replaceNotice}
                          </p>
                        ) : null}
                        <input
                          ref={fileReplaceRef}
                          type="file"
                          className="hidden"
                          accept="application/pdf,image/*,.pdf,.doc,.docx"
                          onChange={handleReplaceFileChange}
                        />
                        <div className="mt-2 space-y-2">
                          {displayedDocuments.map((doc) => {
                            const uploadType = resolveUploadDocumentType(doc)
                            const canReplace =
                              Boolean(uploadType && resolvedRowId && authToken)
                            return (
                              <div
                                key={`${selectedSubmission.id}-${doc.key || doc.name || doc.label}`}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#0A1628]/8 bg-[#F8F7F4] px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[#0A1628]/80">{doc.label}</p>
                                  <p className="text-xs text-[#0A1628]/50">
                                    {doc.value ? doc.value : 'Not uploaded'}
                                  </p>
                                  {doc.url ? (
                                    <a
                                      href={doc.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1 inline-block text-xs font-medium text-[#b98a22] underline underline-offset-2 hover:text-[#8a6918]"
                                    >
                                      View uploaded document
                                    </a>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                  {canReplace ? (
                                    <button
                                      type="button"
                                      disabled={replaceBusy}
                                      onClick={() => handleReplaceDocumentClick(doc)}
                                      className="rounded-lg border border-[#D4A843]/50 bg-white px-2.5 py-1 text-xs font-semibold text-[#8a6918] shadow-sm transition hover:bg-[#fff8e8] disabled:pointer-events-none disabled:opacity-50"
                                    >
                                      {doc.value ? 'Replace document' : 'Upload document'}
                                    </button>
                                  ) : null}
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      doc.value
                                        ? 'bg-green-100 text-green-700'
                                        : doc.required
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {doc.value ? 'Uploaded' : doc.required ? 'Required Missing' : 'Optional'}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </article>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default SubmittedApplicationsPage
