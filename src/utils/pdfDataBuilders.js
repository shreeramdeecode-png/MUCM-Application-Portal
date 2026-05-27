import {
  getRepeatableDisplayRows,
  isFieldVisibleForSubmissionReview,
} from './formVisibility.js'
import { getSingleFieldDisplayValue } from './submissionDisplay.js'
import { applicationSteps } from '../data/applicationSteps.js'

/**
 * Builds the sections and entries array required for the Application Summary PDF.
 * @param {Object} formValues - The values to build the summary from.
 * @param {Array} steps - The application steps definition (defaults to global applicationSteps).
 * @returns {Array} sections - Array of { title, entries } objects.
 */
export function buildPdfSections(formValues, steps = applicationSteps, options = {}) {
  const sections = []
  const reviewOptions = { programOptions: options.programOptions ?? [] }

  steps
    .filter((step) => step.id !== 'reviewSubmit')
    .forEach((step) => {
      const visibleFields = step.fields.filter((field) =>
        isFieldVisibleForSubmissionReview(field, formValues, reviewOptions),
      )
      if (visibleFields.length === 0) return

      const entries = []
      visibleFields.forEach((field) => {
        if (field.type === 'repeatable') {
          const items = getRepeatableDisplayRows(field, formValues)
          const itemLines = []
          if (items.length === 0) {
            itemLines.push('No entries')
          } else {
            items.forEach((row, idx) => {
              itemLines.push(`${field.itemBadge ?? 'Transfer'} ${idx + 1}`)
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
            value: getSingleFieldDisplayValue(field, formValues[field.name]),
          })
        }
      })
      sections.push({ title: step.title, entries })
    })

  return sections
}
