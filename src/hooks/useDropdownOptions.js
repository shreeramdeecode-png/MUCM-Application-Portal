import { useEffect, useState } from 'react'
import { fetchDocumentRequirements, fetchDropdownCategories, fetchPrograms } from '../api/dropdownApi.js'

const CATEGORY_KEYS = [
  'Personal Details - Title',
  'Personal Details - Pronouns',
  'Personal Details - Gender',
  'Personal Details - Ethnicity',
  'Personal Details - Visa/Immigration Status',
  'Emergency Contact - Relationship',
  'Admission Sought - Preferred Semester',
  'Admission Sought - Preferred Year',
  'English Language Proficiency - Proficiency Level',
  'English Language Proficiency - Test Type',
  'Standardized Tests - Test Type',
  'Experience & Motivation - Type of Experience',
  'Disclosures - Referral Source',
]

function buildOptions(categories) {
  const result = {}
  for (const key of CATEGORY_KEYS) {
    const found = categories.find(
      (c) => String(c.category ?? '').toLowerCase().trim() === key.toLowerCase(),
    )
    result[key] = found?.options ?? []
  }
  return result
}

/**
 * Fetches dropdown options, programs, and document requirements from the API once.
 * Returns { options, programs, docRequirements, loading }
 */
export function useDropdownOptions() {
  const [options, setOptions] = useState(() => buildOptions([]))
  const [programs, setPrograms] = useState([])
  const [docRequirements, setDocRequirements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchDropdownCategories(), fetchPrograms(), fetchDocumentRequirements()])
      .then(([categories, progs, docs]) => {
        if (cancelled) return
        setOptions(buildOptions(categories))
        setPrograms(Array.isArray(progs) ? progs.filter((p) => p.active !== false) : [])
        setDocRequirements(Array.isArray(docs) ? docs : [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return { options, programs, docRequirements, loading }
}
