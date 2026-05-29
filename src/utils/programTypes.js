/**
 * Detect Transfer Doctor of Medicine (MD) program from API code or display name.
 */
export function isTransferMdProgramDefinition(program) {
  if (!program || typeof program !== 'object') return false
  const code = String(program.code ?? '').trim().toLowerCase()
  const name = String(program.name ?? '').trim().toLowerCase()
  if (!code && !name) return false

  if (code === 'transfer-md' || code === 'transfer_md') return true
  if (code.includes('transfer') && (code.includes('md') || code.includes('medicine'))) {
    return true
  }
  if (
    name.includes('transfer') &&
    (name.includes('medicine') || name.includes('(md)') || name.includes(' md'))
  ) {
    return true
  }
  return false
}

export function getTransferMdProgramCodes(programs = []) {
  const codes = programs.filter(isTransferMdProgramDefinition).map((p) => p.code).filter(Boolean)
  return codes.length > 0 ? codes : ['transfer-md']
}

export function isTransferMdProgram(programType, programOptions = []) {
  const value = String(programType ?? '').trim()
  if (!value) return false

  const codes = getTransferMdProgramCodes(
    programOptions.map((o) => ({
      code: o.value,
      name: o.label,
    })),
  )
  if (codes.includes(value)) return true

  const opt = programOptions.find(
    (o) => String(o.value ?? '').trim() === value || String(o.label ?? '').trim() === value,
  )
  if (opt) {
    return isTransferMdProgramDefinition({ code: opt.value, name: opt.label })
  }

  const lower = value.toLowerCase()
  return lower.includes('transfer') && (lower.includes('md') || lower.includes('medicine'))
}
