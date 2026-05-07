/** Sequelize/API sometimes returns one row or `[row]` — normalize for `.id` checks and hydration. */
export function normalizeSingleton(record) {
  if (record == null) return null
  if (Array.isArray(record)) return record[0] ?? null
  return record
}

function str(value) {
  if (value === undefined || value === null || value === false) return ''
  return String(value).trim()
}

function boolToYesNo(value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return ''
}

/** Convert ISO date to month field `yyyy-mm`. */
function monthFromApi(value) {
  const s = str(value)
  if (!s) return ''
  return s.length >= 7 ? s.slice(0, 7) : s
}

function applicationRoot(full) {
  if (!full || typeof full !== 'object') return {}
  if (full.application && typeof full.application === 'object') return full.application
  return full
}

const API_DOC_TO_FORM = {
  passport: 'passport',
  bank_statement: 'bankStatement',
  premedical_Bachelor_ug_HSC_Certificate: 'preMedTranscript',
  Secondary_11grade: 'grade11Transcript',
  cv_resume: 'cv',
  passport_photo: 'passportPhoto',
  other_professional_transcripts: 'otherProfessionalTranscripts',
  exam_results_marksheet: 'examResults',
  sponsor_signed_financial_form: 'sponsorSignedFinancialForm',
  review_signature_document: 'reviewSignatureUpload',
}

/**
 * Maps GET /applications/:id?full=true payload into portal form field names.
 * @returns {{ patch: Record<string, unknown>, suggestedStepIndex: number | null }}
 */
export function buildHydrationPatchFromFullApplication(full, stepCount) {
  const patch = {}
  const root = applicationRoot(full)

  if (str(root.why_medicine)) patch.whyMedicine = str(root.why_medicine)
  if (str(root.why_mucm)) patch.whyMUCM = str(root.why_mucm)
  if (str(root.personal_statement)) patch.personalStatement = str(root.personal_statement)
  if (str(root.review_signature_method)) patch.reviewSignatureMethod = str(root.review_signature_method)
  if (str(root.review_signature_typed)) patch.reviewSignatureTyped = str(root.review_signature_typed)
  if (str(root.review_signature_upload)) patch.reviewSignatureUpload = str(root.review_signature_upload)
  if (root.application_agreement_accepted === true) patch.applicationAgreement = true
  if (root.application_agreement_accepted === false) patch.applicationAgreement = false

  const pd = normalizeSingleton(full.personal_details ?? full.personalDetails)
  if (pd && typeof pd === 'object') {
    Object.assign(patch, {
      title: str(pd.title),
      firstName: str(pd.first_name),
      middleName: str(pd.middle_name),
      surname: str(pd.surname),
      preferredName: str(pd.preferred_name),
      pronouns: str(pd.pronouns),
      dateOfBirth: str(pd.date_of_birth),
      gender: str(pd.gender),
      nameChanged: str(pd.name_change),
      ethnicity: str(pd.ethnicity_race),
      citizenship: str(pd.nationality_citizenship),
      countryOfResidence: str(pd.country_of_residence),
      passportNumber: str(pd.passport_number),
      passportExpiry: str(pd.passport_expiry_date),
      visaStatus: str(pd.visa_immigration_status),
      email: str(pd.email),
      phoneMobile: str(pd.mobile_phone),
      phoneHome: str(pd.home_phone),
      permanentAddress: str(pd.street_address),
      city: str(pd.city),
      stateProvince: str(pd.state_province),
      postalCode: str(pd.postal_code),
      country: str(pd.country),
      sameAsPermanent: Boolean(pd.mailing_same_as_permanent),
      mailingAddress: str(pd.mailing_street_address),
      mailingCity: str(pd.mailing_city),
      mailingStateProvince: str(pd.mailing_state_province),
      mailingPostalCode: str(pd.mailing_postal_code),
      mailingCountry: str(pd.mailing_country),
    })
  }

  const ec = normalizeSingleton(full.emergency_contacts ?? full.emergencyContacts)
  if (ec && typeof ec === 'object') {
    Object.assign(patch, {
      contactName: str(ec.full_name),
      relationship: str(ec.relationship),
      contactPhone: str(ec.phone),
      contactEmail: str(ec.email),
      contactCountry: str(ec.country),
      contactAddress: str(ec.home_address),
    })
  }

  const pg = normalizeSingleton(full.parent_guardian_info ?? full.parentGuardian ?? full.parent_guardian)
  if (pg && typeof pg === 'object') {
    Object.assign(patch, {
      fatherName: str(pg.father_name),
      fatherOccupation: str(pg.father_occupation),
      fatherEmail: str(pg.father_email),
      fatherPhone: str(pg.father_phone),
      motherName: str(pg.mother_name),
      motherOccupation: str(pg.mother_occupation),
      motherEmail: str(pg.mother_email),
      motherPhone: str(pg.mother_phone),
    })
  }

  const academics = Array.isArray(full.academic_institutions)
    ? full.academic_institutions
    : Array.isArray(full.academicInstitutions)
      ? full.academicInstitutions
      : []
  if (academics.length > 0) {
    patch.educationEntries = academics.map((row) => {
      const inst = row?.institution_details ?? row?.institutionDetails ?? row ?? {}
      return {
        institution: str(inst.institution),
        address: str(inst.address),
        country: str(inst.country),
        startDate: monthFromApi(inst.startDate),
        endDate: monthFromApi(inst.endDate),
        degree: str(inst.degree),
        fieldOfStudy: str(inst.fieldOfStudy),
        gpa: str(inst.gpa),
      }
    })
  }

  const ep = normalizeSingleton(full.english_proficiency ?? full.englishProficiency)
  if (ep && typeof ep === 'object') {
    Object.assign(patch, {
      englishProficiency: str(ep.proficiency_level),
      otherLanguagesSpoken: str(ep.other_languages_spoken),
      englishTestType: str(ep.test_type),
      englishTestScore: str(ep.test_score),
    })
  }

  const st = normalizeSingleton(full.standardized_tests ?? full.standardizedTests)
  if (st && typeof st === 'object') {
    patch.hasStandardizedTest = st.is_taken === true ? 'Yes' : st.is_taken === false ? 'No' : ''
    patch.standardizedTestType = str(st.test_type)
    patch.standardizedTestScore = str(st.score)
  }

  const adm = normalizeSingleton(full.admission_sought ?? full.admissionSought)
  if (adm && typeof adm === 'object') {
    patch.programType = str(adm.program_type)
    patch.subProgram = str(adm.sub_program)
    patch.semester = str(adm.preferred_semester)
    patch.year = adm.preferred_year != null && adm.preferred_year !== '' ? String(adm.preferred_year) : ''
    const tc = Array.isArray(adm.transfer_credits) ? adm.transfer_credits : []
    if (tc.length > 0) {
      patch.transferCredits = tc.map((row) => ({
        institution: str(row?.institution),
        courses: str(row?.courses),
      }))
    }
  }

  const disc = normalizeSingleton(full.disclosure ?? full.disclosures)
  if (disc && typeof disc === 'object') {
    Object.assign(patch, {
      hasBeenDisciplined: boolToYesNo(disc.discipline_action),
      disciplineActionExplanation: str(disc.discipline_explanation),
      hasBeenConvicted: boolToYesNo(disc.criminal_conviction),
      convictionExplanation: str(disc.conviction_explanation),
      hasDisability: boolToYesNo(disc.disability),
      disabilityDetails: str(disc.disability_details),
      requiresAccommodation: boolToYesNo(disc.special_accomadations),
      accommodationDetails: str(disc.accommodation_details),
      howHeard: str(disc.referral_source),
      howHeardOther: str(disc.referral_source_other),
      referralDescription: str(disc.referral_description),
    })
  }

  const expList = Array.isArray(full.experiences) ? full.experiences : []
  const mappedExperiences = expList
    .filter((row) => str(row?.experience_type) || str(row?.organization) || str(row?.role_position))
    .map((row) => ({
      type: str(row.experience_type),
      organization: str(row.organization),
      role: str(row.role_position),
      hoursPerWeek: str(row.hours_per_week),
      startDate: monthFromApi(row.start_date),
      endDate: monthFromApi(row.end_date),
      description: str(row.description),
    }))
  if (mappedExperiences.length > 0) {
    patch.experiences = mappedExperiences
  }

  const doc = normalizeSingleton(full.document ?? full.documents)
  if (doc && typeof doc === 'object') {
    for (const [apiKey, formKey] of Object.entries(API_DOC_TO_FORM)) {
      if (doc[apiKey] != null && str(doc[apiKey]) !== '') {
        patch[formKey] = str(doc[apiKey])
      }
    }
  }

  const fin = normalizeSingleton(full.financial_support ?? full.financialSupport)
  if (fin && typeof fin === 'object') {
    Object.assign(patch, {
      studentName: str(fin.student_full_name),
      studentId: str(fin.student_id),
      programOfStudy: str(fin.program_of_study),
      expectedStartDate: str(fin.expected_start_date),
      paymentOption: str(fin.paymentOption),
      selfFundedSource: str(fin.selfFundedSource),
      sponsorFullName: str(fin.sponsor_full_name),
      sponsorRelationship: str(fin.sponsorRelationship),
      sponsorOccupation: str(fin.occupation),
      sponsorEmployer: str(fin.sponsorEmployer),
      sponsorAddress: str(fin.sponsorAddress),
      sponsorCity: str(fin.sponsor_city),
      sponsorState: str(fin.sponsor_state),
      sponsorPostalCode: str(fin.sponsorPostalCode),
      sponsorCountry: str(fin.sponsor_country),
      sponsorPhone: str(fin.sponsor_phone),
      sponsorEmail: str(fin.sponsor_email),
      orgName: str(fin.orgName),
      orgContactPerson: str(fin.org_contact_person),
      orgContactTitle: str(fin.orgContactTitle),
      orgAddress: str(fin.orgAddress),
      orgCity: str(fin.org_city),
      orgState: str(fin.org_state),
      orgPostalCode: str(fin.orgPostalCode),
      orgCountry: str(fin.org_country),
      orgPhone: str(fin.org_phone),
      orgEmail: str(fin.org_email),
      hasBankStatement: Boolean(fin.hasBankStatement),
      hasIncomeProof: Boolean(fin.hasIncomeProof),
      hasSponsorLetter: Boolean(fin.hasSponsorLetter),
      hasScholarshipLetter: Boolean(fin.hasScholarshipLetter),
      hasLoanApproval: Boolean(fin.hasLoanApproval),
      certifyAccurate: Boolean(fin.certifyAccurate),
      certifyFinancialResponsibility: Boolean(fin.certifyFinancialResponsibility),
      certifyDate: str(fin.certifyDate),
      sponsorCertifySupport: Boolean(fin.sponsorCertifySupport),
      sponsorCertifyDate: str(fin.sponsorCertifyDate),
      studentSignatureMethod: str(fin.studentSignatureMethod),
      studentSignatureTyped: str(fin.studentSignatureTyped),
      studentSignatureUpload: str(fin.studentSignatureUpload),
    })
    if (str(fin.sponsorSignedFinancialForm)) {
      patch.sponsorSignedFinancialForm = str(fin.sponsorSignedFinancialForm)
    }
  }

  let suggestedStepIndex = null
  const cs = Number(root.completed_steps ?? full.completed_steps)
  if (Number.isFinite(cs) && cs >= 1 && stepCount > 0) {
    suggestedStepIndex = Math.min(Math.max(cs - 1, 0), stepCount - 1)
  }

  return { patch, suggestedStepIndex }
}
