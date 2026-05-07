import { useCallback, useEffect, useMemo, useState } from 'react'
import FormField from '../common/FormField.jsx'
import PrimaryButton from '../common/PrimaryButton.jsx'
import { isFieldVisible } from '../../utils/formVisibility.js'
import { getSingleFieldDisplayValue } from '../../utils/submissionDisplay.js'
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Briefcase,
  FileCheck2,
  FileStack,
  FolderOpen,
  Globe,
  HandCoins,
  HeartPulse,
  MapPin,
  Shield,
  ShieldAlert,
  User,
  Users,
} from 'lucide-react'

/**
 * Build section groups from a step's visible fields.
 *
 * Two modes:
 *  1. Section-property mode  – used when any field has a `section` string (Steps 1 & 2).
 *     Fields are grouped by that string in order of first appearance.
 *  2. Note-divider mode – used for all other steps.
 *     A `type:'note'` field opens a new group; every non-note field that follows
 *     belongs to that group until the next note.
 *
 * Returns an array of group objects:
 *   { title, subtitle, noteField, fields }
 */
function buildSectionGroups(fields, values) {
  const visible = fields.filter((f) => isFieldVisible(f, values))
  const usesSectionProp = visible.some((f) => f.section)

  if (usesSectionProp) {
    const map = new Map()
    visible.forEach((field) => {
      const key = field.section ?? '__ungrouped'
      if (!map.has(key)) {
        map.set(key, {
          title: key === '__ungrouped' ? null : key,
          subtitle: field.sectionSubtitle ?? null,
          noteField: null,
          fields: [],
        })
      }
      // Only store the subtitle from the first field that declares it
      const group = map.get(key)
      if (!group.subtitle && field.sectionSubtitle) {
        group.subtitle = field.sectionSubtitle
      }
      group.fields.push(field)
    })
    return Array.from(map.values())
  }

  // Note-divider mode
  const groups = []
  let current = { title: null, subtitle: null, noteField: null, fields: [] }

  visible.forEach((field) => {
    if (field.type === 'note') {
      if (current.fields.length > 0 || current.noteField) {
        groups.push(current)
      }
      current = {
        title: field.noteTitle ?? null,
        subtitle: field.noteBody ?? null,
        noteField: field,
        fields: [],
      }
    } else {
      current.fields.push(field)
    }
  })

  if (current.fields.length > 0 || current.noteField) {
    groups.push(current)
  }

  return groups
}

// Section header rendered above each group card
function SectionHeader({ title, subtitle, compact = false }) {
  if (!title) return null
  const normalized = String(title).toLowerCase()
  const Icon = (() => {
    if (normalized.includes('identity')) return User
    if (normalized.includes('contact')) return Users
    if (normalized.includes('citizenship') || normalized.includes('immigration')) return Globe
    if (normalized.includes('address')) return MapPin
    if (normalized.includes('emergency')) return ShieldAlert
    if (
      normalized.includes('parent') ||
      normalized.includes('guardian') ||
      normalized.includes('father') ||
      normalized.includes('mother')
    ) {
      return Users
    }
    if (normalized.includes('financial') || normalized.includes('sponsor') || normalized.includes('payment')) {
      return HandCoins
    }
    if (normalized.includes('academic') || normalized.includes('education')) return BookOpen
    if (normalized.includes('experience') || normalized.includes('motivation')) return Briefcase
    if (normalized.includes('disclosure')) return Shield
    if (normalized.includes('discipline')) return AlertTriangle
    if (normalized.includes('disability') || normalized.includes('accommodation')) return HeartPulse
    if (normalized.includes('document')) return FolderOpen
    if (normalized.includes('review') || normalized.includes('submit')) return FileCheck2
    return FileCheck2
  })()

  return (
    <div className={`flex items-start ${compact ? 'gap-2.5' : 'mb-4 gap-3.5'}`}>
      <div
        className={`flex flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843]/20 to-[#D4A843]/5 shadow-sm ${
          compact ? 'h-8 w-8' : 'h-10 w-10'
        }`}
      >
        <Icon className={`text-[#D4A843] ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} strokeWidth={2} />
      </div>
      <div>
        <h3
          className={`font-semibold text-foreground [font-family:'DM_Serif_Display',serif] ${
            compact ? 'text-sm leading-snug sm:text-base' : 'text-lg'
          }`}
        >
          {title}
        </h3>
        {subtitle ? (
          <p className={`mt-0.5 text-muted-foreground ${compact ? 'text-sm leading-relaxed' : 'text-sm'}`}>{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}

/**
 * SectionHeader already shows noteTitle + noteBody for note-divider groups.
 * Avoid rendering those again inside FormField; keep badge / callout / bullets / downloadLink only.
 */
function getNoteFieldForForm(group) {
  const note = group.noteField
  if (!note || note.type !== 'note') return null
  if (!group.title) return note
  const stripped = { ...note, noteTitle: undefined, noteBody: undefined }
  const hasMore =
    stripped.noteBadge ||
    stripped.noteCallout ||
    (stripped.reviewBullets && stripped.reviewBullets.length > 0) ||
    Boolean(stripped.downloadLink)
  return hasMore ? stripped : null
}

function StepGroupPanel({
  group,
  groupIndex,
  values,
  errors,
  onChange,
  onFileUpload,
  onUploadActivityChange,
  animationDelay = 0,
}) {
  const hasRegularFields = group.fields.length > 0
  const noteFieldForForm = getNoteFieldForForm(group)

  return (
    <div
      style={{ animationDelay: `${animationDelay}ms` }}
      className="animate-fade-in-up overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      {group.title ? (
        <div className="border-b border-border bg-gradient-to-r from-[#D4A843]/5 to-transparent px-6 py-4 sm:px-8">
          <SectionHeader title={group.title} subtitle={group.subtitle} />
        </div>
      ) : null}

      {noteFieldForForm ? (
        <div className={`px-6 sm:px-8 ${hasRegularFields ? 'pt-6 pb-0' : 'py-6'}`}>
          <FormField
            field={noteFieldForForm}
            value={values[group.noteField.name]}
            error={errors[group.noteField.name]}
            onChange={onChange}
            onUploadActivityChange={onUploadActivityChange}
            allValues={values}
          />
        </div>
      ) : null}

      {hasRegularFields ? (
        <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2 xl:grid-cols-3 sm:p-8">
          {group.fields.map((field, fieldIndex) => {
            const spanWide =
              field.fullWidth ||
              field.type === 'checkbox' ||
              field.type === 'file' ||
              field.type === 'note' ||
              field.type === 'yesNo' ||
              field.type === 'radioGroup' ||
              field.type === 'repeatable'
            return (
              <div
                key={field.name}
                style={{ animationDelay: `${(groupIndex * 4 + fieldIndex) * 24}ms` }}
                className={`animate-fade-in-up ${spanWide ? 'md:col-span-2 xl:col-span-3' : ''}`}
              >
                <FormField
                  field={field}
                  value={values[field.name]}
                  error={errors[field.name]}
                  onChange={onChange}
                  onFileUpload={onFileUpload}
                  onUploadActivityChange={onUploadActivityChange}
                  allValues={values}
                />
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function isValueMissing(field, rawValue) {
  if (field.type === 'checkbox') {
    return !rawValue
  }
  if (field.type === 'repeatable') {
    return !Array.isArray(rawValue) || rawValue.length === 0
  }
  return rawValue === undefined || rawValue === null || rawValue === ''
}

/**
 * Group fields for Step 8 review: use `field.section` when set, else the most recent
 * visible note title in step order, else repeatable `sectionTitle`.
 *
 * Fields are merged by the same subheading across the whole step (not only when adjacent),
 * so one misplaced field — e.g. Identity after Citizenship — does not repeat section headers.
 * Section order follows first occurrence in the step; field order within a section follows
 * the step definition.
 */
function buildReviewSubsectionGroups(reviewStep, values) {
  const rows = []
  let lastNoteTitle = null

  for (const field of reviewStep.fields) {
    if (field.type === 'note') {
      if (isFieldVisible(field, values)) {
        lastNoteTitle = field.noteTitle ?? null
      }
      continue
    }
    if (String(field.name ?? '').startsWith('__')) continue
    if (!isFieldVisible(field, values)) continue

    let subheading = field.section ?? null
    if (!subheading && field.type === 'repeatable') {
      subheading = field.sectionTitle ?? lastNoteTitle
    }
    if (!subheading) {
      subheading = lastNoteTitle
    }

    rows.push({ subheading, field })
  }

  const sectionKey = (sub) => (sub === null || sub === undefined ? '__none' : String(sub))
  const order = []
  const byKey = new Map()

  for (const { subheading, field } of rows) {
    const key = sectionKey(subheading)
    if (!byKey.has(key)) {
      byKey.set(key, [])
      order.push(key)
    }
    byKey.get(key).push(field)
  }

  return order.map((key) => ({
    subheading: key === '__none' ? null : key,
    fields: byKey.get(key),
  }))
}

function StepForm({
  step,
  stepNumber,
  totalSteps,
  steps,
  currentIndex,
  onStepClick,
  values,
  errors,
  formError,
  draftNotice,
  onChange,
  onFileUpload,
  onNext,
  onPrevious,
  onSaveDraft,
  canGoBack,
  isLastStep,
  onSubmit,
  isLoadingStep = false,
}) {
  // 0% on first step, 100% on final step (stepNumber is 1-based for display only).
  const progressPercent =
    totalSteps <= 1 ? 100 : Math.round((currentIndex / (totalSteps - 1)) * 100)
  const [uploadActivityCount, setUploadActivityCount] = useState(0)
  const reportUploadActivity = useCallback((delta) => {
    setUploadActivityCount((c) => Math.max(0, c + delta))
  }, [])

  useEffect(() => {
    setUploadActivityCount(0)
  }, [step.id])

  useEffect(() => {
    // Clear subProgram if it's not valid for the currently selected program.
    const academicStep = steps.find((s) => s.id === 'academicBackground')
    const subProgramField = academicStep?.fields.find((f) => f.name === 'subProgram')
    if (!subProgramField?.dynamicOptions || !values.programType) return
    const validOptions = subProgramField.dynamicOptions[values.programType] ?? []
    const validValues = validOptions.map((o) => (typeof o === 'string' ? o : o.value))
    if (values.subProgram && !validValues.includes(values.subProgram)) {
      onChange('subProgram', '')
    }
  }, [values.programType])

  const fileFieldStats = useMemo(() => {
    const fileFields = step.fields.filter(
      (f) => f.type === 'file' && isFieldVisible(f, values),
    )
    const total = fileFields.length
    const completed = fileFields.filter((f) => {
      const v = values[f.name]
      return v !== undefined && v !== null && String(v).trim() !== ''
    }).length
    return { total, completed }
  }, [step.fields, values])

  const displayedFileCount = Math.min(
    fileFieldStats.total,
    fileFieldStats.completed + uploadActivityCount,
  )

  const groups = buildSectionGroups(step.fields, values)
  const stepCompletion = useMemo(() => {
    return steps.map((stepDef) => {
      const visibleFields = stepDef.fields.filter(
        (field) => field.type !== 'note' && !String(field.name ?? '').startsWith('__') && isFieldVisible(field, values),
      )

      const hasMissingRequired = visibleFields.some(
        (field) => field.required && isValueMissing(field, values[field.name]),
      )
      if (hasMissingRequired) {
        return false
      }

      const stepFieldNames = new Set(visibleFields.map((field) => field.name))
      const hasStepError = Object.keys(errors).some((key) => {
        if (stepFieldNames.has(key)) return true
        return visibleFields.some(
          (field) => field.type === 'repeatable' && key.startsWith(`${field.name}__`),
        )
      })

      return !hasStepError
    })
  }, [steps, values, errors])

  const isReviewStep = step.id === 'reviewSubmit'
  const priorSteps = isReviewStep ? steps.slice(0, -1) : []
  const reviewFields = isReviewStep
    ? priorSteps.flatMap((reviewStep) =>
        reviewStep.fields.filter(
          (field) =>
            field.type !== 'note' &&
            !String(field.name).startsWith('__') &&
            isFieldVisible(field, values),
        ),
      )
    : []
  const missingRequiredCount = reviewFields.filter(
    (field) => field.required && isValueMissing(field, values[field.name]),
  ).length
  const missingNonDocumentRequired = reviewFields.filter(
    (field) =>
      field.required &&
      field.type !== 'file' &&
      isValueMissing(field, values[field.name]),
  ).length
  const requiredDocumentFields = isReviewStep
    ? steps
        .find((s) => s.id === 'documents')
        ?.fields.filter(
          (field) =>
            field.type === 'file' &&
            field.required &&
            isFieldVisible(field, values) &&
            isValueMissing(field, values[field.name]),
        ) ?? []
    : []

  const documentsStepNumber = steps.findIndex((s) => s.id === 'documents') + 1

  const reviewStepFieldsMissing = isReviewStep
    ? step.fields.filter(
        (f) =>
          f.type !== 'note' &&
          !String(f.name).startsWith('__') &&
          f.required &&
          isFieldVisible(f, values) &&
          isValueMissing(f, values[f.name]),
      ).length
    : 0

  const cannotSubmitApplication =
    isLastStep && (missingRequiredCount > 0 || reviewStepFieldsMissing > 0)

  const stepPageVertical = isReviewStep
    ? 'py-3 sm:py-4 lg:py-5'
    : 'py-5 sm:py-6 lg:py-8'

  return (
    <section className={`page-gutter-x w-full bg-transparent ${stepPageVertical}`}>
      {/* Step hero banner */}
      <div
        className={`overflow-hidden rounded-xl border border-border bg-card shadow-md ${isReviewStep ? 'mb-2 shadow-[0_8px_30px_-12px_rgba(10,22,40,0.12)]' : 'mb-3'}`}
      >
        <div
          className={`relative overflow-hidden bg-gradient-to-r from-[#0A1628] via-[#163457] to-[#0A1628] px-6 sm:px-8 ${isReviewStep ? 'py-1.5 sm:py-2' : 'py-2 sm:py-2.5'}`}
        >
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=1400&q=70')] bg-cover bg-center opacity-25" />
          <div className="absolute inset-0 bg-[#08182d]/55" />
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4A843]">
              Step {stepNumber} of {totalSteps}
            </p>
            <h2 className="mt-0.5 text-lg text-white [font-family:'DM_Serif_Display',serif] sm:text-xl">
              {step.title}
            </h2>
            {step.description ? (
              <p className="mt-0.5 text-sm text-white/60 sm:text-base">{step.description}</p>
            ) : null}
          </div>
        </div>
        {isReviewStep ? null : (
          <div className="px-6 py-1.5 sm:px-8 sm:py-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="font-medium">Overall Progress</span>
              <span className="font-bold text-foreground">{progressPercent}%</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-[#D4A843] to-[#b98a22] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Premium Step Tracker */}
      <header
        className={`overflow-hidden rounded-xl border border-border bg-card shadow-sm ${isReviewStep ? 'mb-2 shadow-sm' : 'mb-3'}`}
      >
        {/* Header label */}
        <div
          className={`flex items-center justify-between border-b border-border px-6 sm:px-8 ${isReviewStep ? 'py-1 sm:py-1' : 'py-1.5'}`}
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Application Progress
          </p>
          <span className="rounded-full bg-[#D4A843]/12 px-3 py-1 text-xs font-bold text-[#7a5a14]">
            Step {stepNumber} of {totalSteps}
          </span>
        </div>

        {/* Stepper row */}
        <div
          className={`overflow-x-auto px-6 sm:overflow-visible sm:px-8 ${isReviewStep ? 'py-1 sm:py-1.5' : 'py-2'}`}
        >
          <div className="flex min-w-max items-start gap-0 sm:min-w-0 sm:justify-center">
            {steps.map((item, index) => {
              const isActive = index === currentIndex
              const isCompleted = index < currentIndex && Boolean(stepCompletion[index])
              const isLast = index === steps.length - 1

              return (
                <div key={item.id} className="flex items-start">
                  {/* Step node */}
                  <button
                    type="button"
                    onClick={() => onStepClick(index)}
                    className={`group flex flex-col items-center focus:outline-none ${isReviewStep ? 'gap-0.5' : 'gap-1'}`}
                    style={{ minWidth: '64px' }}
                  >
                    {/* Circle */}
                    <div className="relative">
                      {/* Glow ring for active */}
                      {isActive ? (
                        <span
                          className={`absolute rounded-full bg-[#D4A843]/20 ${isReviewStep ? '-inset-1.5' : '-inset-2'} animate-soft-pulse`}
                        />
                      ) : null}
                      <div
                        className={`relative flex items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 ${
                          isReviewStep ? 'h-6 w-6' : 'h-7 w-7'
                        } ${
                          isActive
                            ? 'border-[#D4A843] bg-[#D4A843] text-white shadow-lg shadow-[#D4A843]/30'
                            : isCompleted
                              ? 'border-[#0A1628] bg-[#0A1628] text-white'
                              : 'border-border bg-muted text-muted-foreground group-hover:border-[#D4A843]/50 group-hover:bg-accent/15 group-hover:text-foreground/80'
                        }`}
                      >
                        {isCompleted ? (
                          <svg
                            className={isReviewStep ? 'h-3 w-3' : 'h-4 w-4'}
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M3 8.5l3.5 3.5 6.5-7"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                    </div>

                    {/* Label */}
                    <span
                      className={`max-w-[72px] text-center text-xs font-semibold leading-tight transition-colors sm:text-sm ${
                        isActive
                          ? 'text-[#D4A843]'
                          : isCompleted
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/80 group-hover:text-muted-foreground'
                      }`}
                    >
                      {item.title}
                    </span>
                  </button>

                  {/* Connector line */}
                  {!isLast ? (
                    <div
                      className={`mx-1 h-0.5 w-6 flex-shrink-0 rounded-full sm:w-8 ${isReviewStep ? 'mt-3' : 'mt-3.5'}`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          index < currentIndex
                            ? 'bg-[#0A1628]'
                            : 'bg-[#0A1628]/12'
                        }`}
                      />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </header>

      {/* Form body */}
      <div key={step.id} className={`animate-fade-in-up ${isReviewStep ? 'space-y-4' : 'space-y-5'}`}>
        {formError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        ) : null}

        {!isReviewStep && fileFieldStats.total > 0 ? (
          <div className="overflow-hidden rounded-xl border border-[#D4A843]/25 bg-gradient-to-br from-card via-secondary/80 to-amber-50/90 px-4 py-3 shadow-sm sm:px-5 sm:py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#D4A843]/20 text-[#b98a22]">
                  <FileStack className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Documents on this step
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    Upload progress
                    {uploadActivityCount > 0 ? (
                      <span className="ml-2 text-sm font-medium text-[#b98a22]">(upload in progress)</span>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-2xl font-bold text-[#D4A843]">{displayedFileCount}</span>
                <span className="text-lg font-medium text-muted-foreground">/</span>
                <span className="text-xl font-semibold text-foreground/80">{fileFieldStats.total}</span>
              </div>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#D4A843]/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#fef08a] via-[#D4A843] to-[#ca8a04] transition-[width] duration-300 ease-out"
                style={{
                  width: `${fileFieldStats.total ? (displayedFileCount / fileFieldStats.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        {isReviewStep ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {requiredDocumentFields.length > 0 ? (
                <div className="flex gap-2.5 rounded-xl border border-amber-200/90 bg-amber-50/95 px-6 py-2.5 shadow-sm sm:px-8 sm:py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" strokeWidth={2} aria-hidden />
                  <p className="text-sm leading-relaxed text-amber-950">
                    <span className="font-semibold">Missing required documents.</span> Go back to Step {documentsStepNumber}{' '}
                    and upload all required files before you can submit.
                  </p>
                </div>
              ) : null}

              {missingNonDocumentRequired > 0 ? (
                <div className="flex gap-2.5 rounded-xl border border-amber-200/90 bg-amber-50/95 px-6 py-2.5 shadow-sm sm:px-8 sm:py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" strokeWidth={2} aria-hidden />
                  <p className="text-sm leading-relaxed text-amber-950">
                    <span className="font-semibold">{missingNonDocumentRequired} required field(s)</span> still need
                    values. Use <strong>Edit</strong> on the section below to fix them.
                  </p>
                </div>
              ) : null}

              {requiredDocumentFields.length === 0 && missingNonDocumentRequired === 0 ? (
                <div className="flex items-start gap-3 rounded-xl border border-[#D4A843]/30 bg-gradient-to-br from-[#D4A843]/15 via-card to-card px-6 py-3 shadow-[0_4px_24px_-12px_rgba(212,168,67,0.35)] sm:px-8 sm:py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D4A843]/25 text-[#8a6918] shadow-inner shadow-[#D4A843]/20">
                    <FileCheck2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold tracking-tight text-foreground [font-family:'DM_Serif_Display',serif] sm:text-base">
                      Ready to submit
                    </p>
                    <p className="mt-1 text-sm leading-snug text-muted-foreground sm:text-base">
                      Review each block below, then confirm the declaration.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {priorSteps.map((reviewStep, reviewIndex) => {
              const subsectionGroups = buildReviewSubsectionGroups(reviewStep, values)

              return (
                <div
                  key={reviewStep.id}
                  style={{ animationDelay: `${reviewIndex * 40}ms` }}
                  className="animate-fade-in-up overflow-hidden rounded-xl border border-[#0A1628]/[0.08] bg-card shadow-[0_4px_24px_-16px_rgba(10,22,40,0.12)] ring-1 ring-[#0A1628]/[0.04]"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-[#0A1628]/[0.06] bg-gradient-to-r from-[#D4A843]/[0.08] via-[#D4A843]/[0.03] to-transparent px-6 py-3 sm:px-8">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A1628] text-[11px] font-bold text-white shadow-sm"
                        aria-hidden
                      >
                        {reviewIndex + 1}
                      </span>
                      <h4 className="min-w-0 text-base font-bold leading-tight text-foreground [font-family:'DM_Serif_Display',serif] sm:text-lg">
                        {reviewStep.title}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStepClick(reviewIndex)}
                      className="shrink-0 rounded-full border border-[#D4A843]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#5c4510] shadow-sm transition hover:border-[#D4A843]/70 hover:bg-[#D4A843]/10 sm:px-4 sm:py-2 sm:text-sm"
                    >
                      Edit
                    </button>
                  </div>

                  {subsectionGroups.length === 0 ? (
                    <div className="px-6 py-5 text-center text-sm text-muted-foreground sm:px-8">
                      No visible values to review for this step.
                    </div>
                  ) : (
                    <div className="space-y-4 bg-gradient-to-b from-muted/25 to-transparent px-6 py-4 sm:px-8 sm:py-5">
                      {subsectionGroups.map((group, groupIdx) => (
                        <div key={`${reviewStep.id}-sub-${groupIdx}`}>
                          {group.subheading ? (
                            <div className="mb-2 flex items-center gap-2">
                              <span className="h-4 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#D4A843] to-[#b98a22]" />
                              <h5 className="text-sm font-semibold leading-snug text-foreground">
                                {group.subheading}
                              </h5>
                            </div>
                          ) : null}
                          <div className="overflow-hidden rounded-xl border border-[#0A1628]/[0.07] bg-background/80 shadow-inner shadow-[#0A1628]/[0.03]">
                            {group.fields.map((field, fi) => {
                              const repeatableLabel =
                                field.type === 'repeatable'
                                  ? field.sectionTitle ?? field.label ?? field.name
                                  : ''
                              const showRepeatableInlineTitle =
                                field.type === 'repeatable' &&
                                (group.subheading == null ||
                                  String(repeatableLabel).trim() !== String(group.subheading).trim())

                              return (
                              <div
                                key={`${reviewStep.id}-${field.name}`}
                                className={`${fi > 0 ? 'border-t border-[#0A1628]/[0.06]' : ''}`}
                              >
                                {field.type === 'repeatable' ? (
                                  <div className="space-y-2 px-5 py-3 sm:px-7">
                                    {showRepeatableInlineTitle ? (
                                      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        {repeatableLabel}
                                      </p>
                                    ) : null}
                                    {Array.isArray(values[field.name]) && values[field.name].length > 0 ? (
                                      values[field.name].map((row, rowIndex) => (
                                        <div
                                          key={`${field.name}-row-${rowIndex}`}
                                          className="rounded-lg border border-border bg-muted/40 px-3 py-2.5"
                                        >
                                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#b98a22]">
                                            {field.itemBadge ?? 'Item'} {rowIndex + 1}
                                          </p>
                                          <div className="mt-2 space-y-0">
                                            {(field.itemFields ?? []).map((sub, subIdx) => (
                                              <div
                                                key={`${field.name}-${rowIndex}-${sub.name}`}
                                                className={`grid grid-cols-1 gap-0.5 py-1.5 sm:grid-cols-[minmax(0,320px)_1fr] sm:gap-4 ${
                                                  subIdx > 0 ? 'border-t border-[#0A1628]/[0.06]' : ''
                                                }`}
                                              >
                                                <p className="text-sm font-semibold leading-snug text-muted-foreground">
                                                  {String(sub.label ?? sub.name)}
                                                </p>
                                                <p className="text-sm leading-relaxed text-foreground sm:text-right">
                                                  {getSingleFieldDisplayValue(sub, row?.[sub.name])}
                                                </p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No entries added.</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 gap-1 px-5 py-2.5 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)] sm:items-start sm:gap-5 sm:px-7 sm:py-3">
                                    <p className="text-sm font-semibold leading-snug text-muted-foreground">
                                      {field.label}
                                    </p>
                                    {field.type === 'file' &&
                                    typeof values[field.name] === 'string' &&
                                    values[field.name].startsWith('data:image/') ? (
                                      <div className="space-y-1.5 sm:text-right">
                                        <p className="text-sm text-muted-foreground">Uploaded signature</p>
                                        <img
                                          src={values[field.name]}
                                          alt=""
                                          className="max-h-24 max-w-[240px] rounded-lg border border-border bg-card object-contain sm:ml-auto"
                                        />
                                      </div>
                                    ) : (
                                      <p className="text-sm font-medium leading-snug text-foreground sm:text-right">
                                        {getSingleFieldDisplayValue(field, values[field.name])}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {groups.map((group, groupIndex) => {
              const hasRegularFields = group.fields.length > 0
              const noteFieldForForm = getNoteFieldForForm(group)
              return (
                <div
                  key={group.title ?? `review-group-${groupIndex}`}
                  className="overflow-hidden rounded-xl border border-[#D4A843]/35 bg-gradient-to-b from-[#fffdf8] via-card to-card shadow-[0_8px_32px_-20px_rgba(212,168,67,0.45)] ring-1 ring-[#D4A843]/15"
                >
                  {group.title ? (
                    <div className="border-b border-[#D4A843]/20 bg-gradient-to-r from-[#D4A843]/10 to-transparent px-6 py-3 sm:px-8">
                      <SectionHeader title={group.title} subtitle={group.subtitle} compact />
                    </div>
                  ) : null}

                  {noteFieldForForm ? (
                    <div className={`px-6 sm:px-8 ${hasRegularFields ? 'pt-4 pb-0' : 'py-4'}`}>
                      <FormField
                        field={noteFieldForForm}
                        value={values[group.noteField.name]}
                        error={errors[group.noteField.name]}
                        onChange={onChange}
                        onFileUpload={onFileUpload}
                        onUploadActivityChange={reportUploadActivity}
                      />
                    </div>
                  ) : null}

                  {hasRegularFields ? (
                    <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3 sm:p-6">
                      {group.fields.map((field) => (
                        <div
                          key={field.name}
                          className={`animate-fade-in-up ${
                            field.fullWidth ||
                            field.type === 'checkbox' ||
                            field.type === 'file' ||
                            field.type === 'yesNo' ||
                            field.type === 'radioGroup' ||
                            field.type === 'repeatable'
                              ? 'md:col-span-2 xl:col-span-3'
                              : ''
                          }`}
                        >
                          <FormField
                            field={field}
                            value={values[field.name]}
                            error={errors[field.name]}
                            onChange={onChange}
                            onFileUpload={onFileUpload}
                            onUploadActivityChange={reportUploadActivity}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : isLoadingStep ? (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-center">
            <p className="text-sm text-muted-foreground animate-pulse">Loading document requirements...</p>
          </div>
        ) : step.fields.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h4 className="text-xl text-foreground [font-family:'DM_Serif_Display',serif]">
              Review Complete
            </h4>
            <p className="mt-2 text-base text-muted-foreground">
              Your application details are saved. Click submit to complete your application.
            </p>
          </div>
        ) : (
          groups.map((group, groupIndex) => (
            <StepGroupPanel
              key={group.title ?? `group-${groupIndex}`}
              group={group}
              groupIndex={groupIndex}
              values={values}
              errors={errors}
              onChange={onChange}
              onFileUpload={onFileUpload}
              onUploadActivityChange={reportUploadActivity}
              animationDelay={groupIndex * 60}
            />
          ))
        )}

        {/* Footer nav */}
        <footer
          className={`space-y-2 shadow-sm ${
            isReviewStep
              ? 'mt-4 space-y-2.5 rounded-xl border border-[#0A1628]/10 bg-gradient-to-b from-card to-muted/20 px-6 py-3 sm:px-8 sm:py-4'
              : 'mt-2 space-y-3 rounded-xl border border-border bg-card p-3.5 sm:p-4'
          }`}
        >
          {draftNotice ? (
            <p
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            >
              {draftNotice}
            </p>
          ) : null}
          <div className="flex flex-col-reverse items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            {canGoBack ? (
              <PrimaryButton variant="outline" type="button" onClick={onPrevious}>
                Previous
              </PrimaryButton>
            ) : (
              <span className="hidden sm:block" />
            )}
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:gap-3">
              <PrimaryButton variant="outline" type="button" onClick={onSaveDraft}>
                Draft
              </PrimaryButton>
              {isLastStep ? (
                <PrimaryButton type="button" disabled={cannotSubmitApplication} onClick={onSubmit}>
                  Submit Application
                </PrimaryButton>
              ) : (
                <PrimaryButton type="button" onClick={onNext}>
                  Save & Continue
                </PrimaryButton>
              )}
            </div>
          </div>
        </footer>
      </div>
    </section>
  )
}

export default StepForm