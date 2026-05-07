import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Download, FileStack } from 'lucide-react'
import { countries } from '../../data/countries.js'
import { countryCallingCodes } from '../../data/countryCallingCodes.js'
import { formatAcceptLabels } from '../../utils/fileFieldMeta.js'
import { normalizeSelectOptions } from '../../utils/formVisibility.js'
import DateInput from './DateInput.jsx'
import FileDropzone from './FileDropzone.jsx'

function sanitizePhoneInput(raw) {
  const value = String(raw ?? '')
  const cleaned = value.replace(/[^\d+\s()-]/g, '')
  const plusNormalized = cleaned.replace(/\+/g, '')
  return cleaned.trimStart().startsWith('+')
    ? `+${plusNormalized}`
    : plusNormalized
}

const PHONE_COUNTRY_CODES = countryCallingCodes.map((item) => ({
  key: `${item.code}-${item.dialCode}`,
  value: item.dialCode,
  label: `${item.name} (${item.dialCode})`,
}))

function splitPhoneValue(raw) {
  const value = sanitizePhoneInput(raw ?? '')
  const match = value.match(/^\+(\d{1,4})(?:[\s-]*)?(.*)$/)
  if (!match) {
    return { countryCode: '+1', localNumber: value }
  }
  const fullCode = `+${match[1]}`
  const knownCode = PHONE_COUNTRY_CODES.some((item) => item.value === fullCode) ? fullCode : '+1'
  const localNumber = knownCode === fullCode ? match[2] : value.replace(/^\+\d{1,4}\s*/, '')
  return { countryCode: knownCode, localNumber }
}

function buildPhoneValue(countryCode, localNumber) {
  const safeCode = String(countryCode || '+1').trim() || '+1'
  const safeLocal = sanitizePhoneInput(localNumber ?? '').replace(/^\+/, '').trim()
  // Keep dial code in form state when local digits are empty so splitPhoneValue does not fall back to +1.
  return safeLocal ? `${safeCode} ${safeLocal}` : safeCode
}

function RadioOptionDescription({ text }) {
  if (!text) return null
  const segments = text.split(/\*\*/)
  if (segments.length === 1) {
    return (
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
    )
  }
  return (
    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
      {segments.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-[#0A1628]/85">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </p>
  )
}

function CountryCombobox({
  field,
  value,
  onChange,
  labelClasses,
  inputClasses,
  error,
}) {
  const { name, label, required, helper, placeholder } = field
  const wrapperRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(() => value ?? '')
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  const filteredCountries = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return countries
    }

    return countries.filter((country) => country.toLowerCase().includes(normalized))
  }, [query])

  function selectCountry(country) {
    setQuery(country)
    setIsOpen(false)
    setActiveIndex(-1)
    onChange(name, country)
  }

  function handleInputChange(event) {
    const nextValue = event.target.value
    setQuery(nextValue)
    setIsOpen(true)
    setActiveIndex(-1)
    onChange(name, nextValue)
  }

  function handleKeyDown(event) {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setIsOpen(true)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (filteredCountries.length === 0) {
        return
      }
      setActiveIndex((previous) =>
        previous >= filteredCountries.length - 1 ? 0 : previous + 1,
      )
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (filteredCountries.length === 0) {
        return
      }
      setActiveIndex((previous) =>
        previous <= 0 ? filteredCountries.length - 1 : previous - 1,
      )
    }

    if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
      event.preventDefault()
      selectCountry(filteredCountries[activeIndex])
    }

    if (event.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <label>
      <span className={labelClasses}>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <div className="mt-2" ref={wrapperRef}>
        <input
          className={`${inputClasses} ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          type="text"
          value={query}
          required={required}
          placeholder={placeholder ?? 'Search and select country'}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${name}-country-listbox`}
          aria-autocomplete="list"
        />

        {isOpen ? (
          <ul
            id={`${name}-country-listbox`}
            role="listbox"
            className="z-30 mt-2 max-h-52 w-full overflow-y-auto rounded-md border border-border bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-border"
          >
            {filteredCountries.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[#0A1628]/55">No countries found</li>
            ) : (
              filteredCountries.map((country, index) => (
                <li key={country}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      index === activeIndex
                        ? 'bg-gradient-to-r from-[#D4A843]/24 to-[#D4A843]/10 text-[#0A1628]'
                        : 'text-[#0A1628]/85 hover:bg-[#D4A843]/12'
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectCountry(country)}
                  >
                    {country}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      {helper ? (
        <small className="mt-1 block text-sm text-muted-foreground">{helper}</small>
      ) : null}
      {error ? (
        <small className="mt-1 block text-xs font-medium text-destructive">{error}</small>
      ) : null}
    </label>
  )
}

function RepeatableBlock({ field, value, onChange, errors, onUploadActivityChange }) {
  const defaultItem = field.defaultItem ?? {}
  const items =
    Array.isArray(value) && value.length > 0
      ? value
      : [typeof structuredClone === 'function' ? structuredClone(defaultItem) : { ...defaultItem }]

  function updateRow(index, subName, subValue) {
    const next = items.map((row, i) =>
      i === index ? { ...row, [subName]: subValue } : row,
    )
    onChange(field.name, next)
  }

  function addRow() {
    const blank =
      typeof structuredClone === 'function' ? structuredClone(defaultItem) : { ...defaultItem }
    onChange(field.name, [...items, blank])
  }

  function removeRow(index) {
    if (items.length <= (field.minItems ?? 1)) {
      return
    }
    onChange(
      field.name,
      items.filter((_, i) => i !== index),
    )
  }

  return (
    <div className="sm:col-span-2 space-y-4">
      {field.sectionTitle ? (
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843]/20 to-[#D4A843]/5 shadow-sm">
            <FileStack className="h-4 w-4 text-[#D4A843]" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#0A1628] [font-family:'DM_Serif_Display',serif]">
              {field.sectionTitle}
            </h3>
            {field.sectionSubtitle ? (
              <p className="text-sm text-muted-foreground">{field.sectionSubtitle}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {field.sectionNote ? (
        <div className="rounded-xl border border-blue-200/40 bg-blue-50/60 p-4">
          <p className="text-sm leading-relaxed text-blue-800/70">{field.sectionNote}</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {items.map((row, rowIndex) => (
          <div
            key={`${field.name}-${rowIndex}`}
            className="relative rounded-md border border-border bg-card p-4 shadow-sm sm:p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-[#D4A843]/10 px-3 py-1 text-xs font-bold text-[#D4A843]">
                {field.itemBadge} {rowIndex + 1}
              </span>
              {items.length > (field.minItems ?? 1) ? (
                <button
                  type="button"
                  onClick={() => removeRow(rowIndex)}
                  className="text-sm font-semibold text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(field.itemFields ?? []).map((sub) => (
                <div
                  key={sub.name}
                  className={sub.fullWidth ? 'sm:col-span-2' : ''}
                >
                  <FormField
                    field={sub}
                    value={row[sub.name]}
                    error={errors[`${field.name}__${rowIndex}__${sub.name}`]}
                    onChange={(subName, subVal) => updateRow(rowIndex, subName, subVal)}
                    onUploadActivityChange={onUploadActivityChange}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D4A843]/30 px-4 py-2.5 text-sm font-semibold text-[#D4A843] transition hover:border-[#D4A843]/50 hover:bg-[#D4A843]/5"
      >
        {field.addLabel ?? 'Add another'}
      </button>
    </div>
  )
}

function FormField({
  field,
  value,
  onChange,
  error,
  onUploadActivityChange,
  onFileUpload,
  allValues = {},
}) {
  const {
    name,
    label,
    type,
    required,
    options = [],
    helper,
    placeholder,
  } = field
  const labelClasses = 'block text-sm font-medium text-foreground'
  const inputClasses =
    'mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

  if (type === 'note') {
    const isPlain = field.noteVariant === 'plain'
    const isSub = field.noteVariant === 'sub'
    return (
      <div className={`sm:col-span-2 ${field.reviewBullets ? 'space-y-2' : 'space-y-2.5'}`}>
        {field.noteBadge ? (
          <span className="inline-block rounded-lg bg-[#D4A843]/12 px-2.5 py-1 text-xs font-bold tracking-wide text-[#7a5a14]">
            {field.noteBadge}
          </span>
        ) : null}
        {field.noteTitle ? (
          <h3
            className={`font-semibold text-[#0A1628] [font-family:'DM_Serif_Display',serif] ${
              isSub
                ? 'text-sm'
                : isPlain
                  ? 'text-sm font-bold uppercase tracking-widest text-[#0A1628]/45'
                  : field.reviewBullets
                    ? 'text-base leading-snug'
                    : 'text-lg'
            }`}
          >
            {field.noteTitle}
          </h3>
        ) : null}
        {field.noteBody ? (
          <p className={`text-sm leading-relaxed ${isPlain ? 'text-[#0A1628]/40' : 'text-[#0A1628]/45'}`}>
            {field.noteBody}
          </p>
        ) : null}
        {field.noteCallout ? (
          <div className="rounded-xl border border-blue-200/50 bg-blue-50/70 p-3.5">
            <p className="text-sm leading-relaxed text-blue-800/70">{field.noteCallout}</p>
          </div>
        ) : null}
        {field.downloadLink ? (
          <p className="mt-2">
            {field.downloadLink.prefillFromValues ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { downloadPrefilledStep7Pdf } = await import('../../utils/step7SponsorPdf.js')
                    await downloadPrefilledStep7Pdf(allValues, field.downloadLink)
                  } catch {
                    // Fallback to static template if generation fails in browser.
                    window.open(field.downloadLink.href, '_blank', 'noopener,noreferrer')
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-[#D4A843]/45 bg-gradient-to-r from-[#D4A843]/12 to-[#D4A843]/5 px-4 py-2.5 text-sm font-semibold text-[#5c4510] shadow-sm transition hover:border-[#D4A843]/70 hover:from-[#D4A843]/18 hover:to-[#D4A843]/8"
              >
                <Download className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {field.downloadLink.label}
              </button>
            ) : (
              <a
                href={field.downloadLink.href}
                download={field.downloadLink.fileName ?? ''}
                className="inline-flex items-center gap-2 rounded-lg border border-[#D4A843]/45 bg-gradient-to-r from-[#D4A843]/12 to-[#D4A843]/5 px-4 py-2.5 text-sm font-semibold text-[#5c4510] shadow-sm transition hover:border-[#D4A843]/70 hover:from-[#D4A843]/18 hover:to-[#D4A843]/8"
              >
                <Download className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {field.downloadLink.label}
              </a>
            )}
          </p>
        ) : null}
        {field.reviewBullets ? (
          <div className="rounded-xl border border-[#D4A843]/25 bg-white/60 p-3 sm:p-4">
            <ul className="space-y-2.5">
              {field.reviewBullets.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-snug text-[#0A1628]/90">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a227]"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="[text-wrap:pretty]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    )
  }

  if (type === 'repeatable') {
    return (
      <RepeatableBlock
        field={field}
        value={value}
        onChange={onChange}
        errors={error && typeof error === 'object' ? error : {}}
        onUploadActivityChange={onUploadActivityChange}
      />
    )
  }

  if (type === 'repeatable') {
    return null
  }

  if (type === 'radioGroup') {
    const opts = field.options ?? []
    return (
      <div>
        <span className={labelClasses}>
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
        <div className="mt-3 space-y-3">
          {opts.map((opt) => {
            const selected = value === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(name, opt.value)}
                className={`w-full rounded-xl border-2 p-4 text-left transition ${
                  selected
                    ? 'border-[#D4A843] bg-[#D4A843]/5 shadow-sm shadow-[#D4A843]/10'
                    : 'border-[#0A1628]/10 hover:border-[#D4A843]/35'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? 'border-[#D4A843]' : 'border-[#0A1628]/20'
                    }`}
                  >
                    {selected ? <div className="h-2.5 w-2.5 rounded-full bg-[#D4A843]" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0A1628]">{opt.label}</p>
                    {opt.description ? <RadioOptionDescription text={opt.description} /> : null}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        {error && typeof error === 'string' ? (
          <small className="mt-2 block text-xs font-medium text-destructive">{error}</small>
        ) : null}
      </div>
    )
  }

  if (type === 'yesNo') {
    return (
      <div>
        <span className={`${labelClasses} leading-snug`}>
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
        <div className="mt-2 flex flex-wrap gap-3">
          {['Yes', 'No'].map((choice) => {
            const selected = value === choice
            return (
              <label
                key={choice}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-medium transition ${
                  selected
                    ? 'border-[#D4A843] bg-[#D4A843]/5 text-[#0A1628]'
                    : 'border-[#0A1628]/10 text-[#0A1628]/60 hover:border-[#D4A843]/35'
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    selected ? 'border-[#D4A843]' : 'border-[#0A1628]/20'
                  }`}
                >
                  {selected ? <span className="h-2 w-2 rounded-full bg-[#D4A843]" /> : null}
                </span>
                <input
                  type="radio"
                  className="sr-only"
                  name={name}
                  value={choice}
                  checked={selected}
                  onChange={() => onChange(name, choice)}
                />
                {choice}
              </label>
            )
          })}
        </div>
        {error ? (
          <small className="mt-2 block text-xs font-medium text-destructive">{error}</small>
        ) : null}
      </div>
    )
  }

  if (type === 'checkbox') {
    const declaration = field.declarationStyle === true
    return (
      <label
        className={`flex cursor-pointer items-start gap-3 transition ${
          declaration
            ? 'rounded-xl border-2 border-[#D4A843]/35 bg-white/90 p-3.5 shadow-inner shadow-[#D4A843]/10 hover:border-[#D4A843]/55 sm:p-4'
            : 'rounded-md border border-border bg-card p-3.5 shadow-sm hover:border-accent/50'
        }`}
      >
        <input
          type="checkbox"
          className={`mt-1 h-[18px] w-[18px] accent-[#D4A843] ${declaration ? 'shrink-0' : ''}`}
          checked={Boolean(value)}
          onChange={(event) => onChange(name, event.target.checked)}
        />
        <span
          className={`leading-relaxed text-foreground/90 ${declaration ? 'text-sm sm:text-[15px]' : 'text-sm'}`}
        >
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
      </label>
    )
  }

  if (type === 'select') {
    const resolvedOptions =
      field.dynamicOptions && allValues.programType
        ? (field.dynamicOptions[allValues.programType] ?? [])
        : options
    const normalized = normalizeSelectOptions(resolvedOptions)
    return (
      <label>
        <span className={labelClasses}>
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
        <select
          className={`${inputClasses} ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          value={value ?? ''}
          required={required}
          onChange={(event) => onChange(name, event.target.value)}
        >
          <option value="" disabled hidden>
            {placeholder ?? 'Select an option'}
          </option>
          {normalized.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {helper ? (
          <small className="mt-1 block text-sm text-muted-foreground">{helper}</small>
        ) : null}
        {error ? (
          <small className="mt-1 block text-xs font-medium text-destructive">{error}</small>
        ) : null}
      </label>
    )
  }

  if (type === 'file') {
    const accept = field.accept ?? '.pdf,.jpg,.jpeg,.png'
    const maxFileSizeMB = field.maxFileSizeMB ?? 5
    const formatsText = formatAcceptLabels(accept)
    return (
      <div className="block">
        <FileDropzone
          accept={accept}
          maxFileSizeMB={maxFileSizeMB}
          value={value ?? ''}
          required={required}
          error={error}
          fieldLabel={label}
          formatsLine={`Accepted formats: ${formatsText}. Maximum file size: ${maxFileSizeMB} MB.`}
          helperText={helper}
          onChange={(next) => onChange(name, next)}
          onUploadFile={onFileUpload ? (file) => onFileUpload(name, file, field) : undefined}
          onUploadActivityChange={onUploadActivityChange}
          storeAsDataUrl={Boolean(field.storeAsDataUrl)}
          compact={Boolean(field.compact)}
        />
      </div>
    )
  }

  if (type === 'country') {
    return (
      <CountryCombobox
        field={field}
        value={value}
        onChange={onChange}
        labelClasses={labelClasses}
        inputClasses={inputClasses}
        error={error}
      />
    )
  }

  if (type === 'textarea') {
    return (
      <label>
        <span className={labelClasses}>
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
        <textarea
          className={`${inputClasses} min-h-24 resize-y ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          value={value ?? ''}
          required={required}
          placeholder={placeholder}
          onChange={(event) => onChange(name, event.target.value)}
        />
        {helper ? (
          <small className="mt-1 block text-sm text-muted-foreground">{helper}</small>
        ) : null}
        {error ? (
          <small className="mt-1 block text-xs font-medium text-destructive">{error}</small>
        ) : null}
      </label>
    )
  }

  if (type === 'tel') {
    const { countryCode, localNumber } = splitPhoneValue(value)
    return (
      <label className="flex flex-col justify-start">
        <span className={`${labelClasses} leading-5`}>
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
        <div className="mt-2 grid grid-cols-[minmax(128px,42%)_minmax(0,1fr)] items-start gap-2">
          <select
            className={`${inputClasses} mt-0 min-w-0 ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            value={countryCode}
            onChange={(event) => onChange(name, buildPhoneValue(event.target.value, localNumber))}
            aria-label={`${label} country code`}
          >
            {PHONE_COUNTRY_CODES.map((option) => (
              <option key={option.key} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            className={`${inputClasses} mt-0 min-w-0 ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            type="tel"
            value={localNumber}
            required={required}
            placeholder={placeholder ?? 'Phone number'}
            inputMode="numeric"
            onChange={(event) => onChange(name, buildPhoneValue(countryCode, event.target.value))}
          />
        </div>
        {helper ? (
          <small className="mt-1 block text-sm text-muted-foreground">{helper}</small>
        ) : null}
        {error ? (
          <small className="mt-1 block text-xs font-medium text-destructive">{error}</small>
        ) : null}
      </label>
    )
  }

  if (type === 'date') {
    return (
      <label>
        <span className={labelClasses}>
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
        <DateInput
          className={`mt-2 flex h-10 w-full rounded-md border border-input bg-background shadow-sm transition focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background ${error ? 'border-destructive focus-within:ring-destructive' : ''}`}
          value={value ?? ''}
          required={required}
          placeholder={placeholder ?? 'DD/MM/YYYY'}
          onChange={(next) => onChange(name, next)}
          aria-invalid={error ? 'true' : undefined}
        />
        {helper ? (
          <small className="mt-1 block text-sm text-muted-foreground">{helper}</small>
        ) : null}
        {error ? (
          <small className="mt-1 block text-xs font-medium text-destructive">{error}</small>
        ) : null}
      </label>
    )
  }

  if (type === 'text' && field.signaturePreview) {
    const compact = Boolean(field.signaturePreviewCompact)
    const preview = value != null && String(value).trim() !== '' ? String(value).trim() : ''
    return (
      <label className="block">
        <span className={`${labelClasses} ${compact ? 'text-sm' : ''}`}>
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
        <input
          className={`${inputClasses} ${compact ? 'mt-1.5 h-9 text-sm' : ''} ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          type="text"
          value={value ?? ''}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => onChange(name, event.target.value)}
        />
        <div
          className={`flex flex-col justify-center rounded-lg border border-[#0A1628]/12 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(10,22,40,0.05)] ${
            compact ? 'mt-2 min-h-[3.25rem] px-3 py-2 sm:px-3.5' : 'mt-3 min-h-[4.75rem] rounded-xl px-4 py-3 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:px-5'
          }`}
          aria-hidden
        >
          <p
            className={`font-bold uppercase tracking-[0.14em] text-[#0A1628]/40 ${compact ? 'text-[10px]' : 'text-xs'}`}
          >
            Signature preview
          </p>
          <p
            className={`origin-left -rotate-[1.25deg] break-words leading-none text-[#0c1220] antialiased [font-synthesis:none] ${
              compact
                ? 'mt-1 min-h-[2rem] text-[clamp(1.35rem,3.5vw,1.85rem)]'
                : 'mt-2 min-h-[2.85rem] text-[clamp(2rem,5vw,3.25rem)]'
            }`}
            style={{
              fontFamily: "'Mr Dafoe', 'Segoe Script', 'Brush Script MT', cursive",
            }}
          >
            {preview || '—'}
          </p>
        </div>
        {helper ? (
          <small className="mt-1 block text-sm text-muted-foreground">{helper}</small>
        ) : null}
        {error ? (
          <small className="mt-1 block text-xs font-medium text-destructive">{error}</small>
        ) : null}
      </label>
    )
  }

  if (field.readOnly && type === 'text') {
    const display =
      value !== undefined && value !== null && String(value).trim() !== '' ? String(value) : null
    return (
      <label>
        <span className={labelClasses}>
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
        <div
          className={`mt-2 min-h-10 w-full max-w-full whitespace-pre-wrap break-words rounded-md border border-input bg-muted/60 px-3 py-2 text-sm leading-relaxed text-foreground shadow-sm ${
            error ? 'border-destructive ring-1 ring-destructive/30' : ''
          }`}
          tabIndex={0}
          aria-readonly="true"
        >
          {display ? (
            display
          ) : (
            <span className="text-muted-foreground">{placeholder ?? '—'}</span>
          )}
        </div>
        {helper ? (
          <small className="mt-1 block text-sm text-muted-foreground">{helper}</small>
        ) : null}
        {error ? (
          <small className="mt-1 block text-xs font-medium text-destructive">{error}</small>
        ) : null}
      </label>
    )
  }

  return (
    <label>
      <span className={labelClasses}>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <input
        className={`${inputClasses} ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
        type={type}
        value={value ?? ''}
        required={required}
        placeholder={placeholder}
        inputMode={type === 'tel' ? 'numeric' : undefined}
        onChange={(event) => onChange(name, event.target.value)}
      />
      {helper ? (
        <small className="mt-1 block text-sm text-muted-foreground">{helper}</small>
      ) : null}
      {error ? (
        <small className="mt-1 block text-xs font-medium text-destructive">{error}</small>
      ) : null}
    </label>
  )
}

export default FormField