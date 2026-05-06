function trimStr(v) {
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Derives Financial Support "Student Information" fields from earlier application answers.
 * @param {object} values - form values
 * @param {Array}  programOptions  - dynamic programTypeOptions array from buildApplicationSteps
 * @param {Array}  subProgramOpts  - dynamic subProgramOptions array from buildApplicationSteps
 */
export function getAutofillStudentInfo(values, programOptions = [], subProgramOpts = []) {
  const nameParts = [
    trimStr(values?.firstName),
    trimStr(values?.middleName),
    trimStr(values?.surname),
  ].filter(Boolean)
  const studentName = nameParts.join(' ')

  const pt = programOptions.find((o) => o.value === values?.programType)
  const programLabel = pt?.label ?? ''
  const sp = subProgramOpts.find((o) => o.value === values?.subProgram)
  const subLabel = sp?.label ?? ''
  let programOfStudy = programLabel
  if (programLabel && subLabel) {
    programOfStudy = `${programLabel} — ${subLabel}`
  } else if (!programLabel && subLabel) {
    programOfStudy = subLabel
  }

  const sem = trimStr(values?.semester)
  const yr = trimStr(values?.year)
  let expectedStartDate = ''
  if (sem && yr) {
    expectedStartDate = `${sem} ${yr}`
  } else {
    expectedStartDate = sem || yr
  }

  return { studentName, programOfStudy, expectedStartDate }
}
