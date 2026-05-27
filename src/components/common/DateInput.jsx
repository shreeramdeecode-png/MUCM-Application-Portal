import { useRef, useState } from 'react'
import { Calendar } from 'lucide-react'
import { formatTypingToDDMMYYYY, isoToDDMMYYYY, parseDDMMYYYYToIso } from '../../utils/dateInput.js'

export default function DateInput({
  value,
  onChange,
  required,
  className = '',
  placeholder = 'DD/MM/YYYY',
  name,
  id,
  'aria-invalid': ariaInvalid,
  ...rest
}) {
  const hiddenDateRef = useRef(null)
  const iso =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
  const displayFromIso = isoToDDMMYYYY(iso)
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState('')

  const shownValue = focused ? text : displayFromIso

  function applyPickedDate(nextIso) {
    onChange(nextIso)
    setFocused(false)
    setText(isoToDDMMYYYY(nextIso))
  }

  function openNativePicker() {
    const el = hiddenDateRef.current
    if (!el) return
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker()
      } else {
        el.click()
      }
    } catch {
      el.click()
    }
  }

  return (
    <div className={`relative flex min-h-[42px] w-full items-stretch overflow-hidden ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        placeholder={placeholder}
        maxLength={10}
        value={shownValue}
        name={name}
        id={id}
        required={required}
        aria-invalid={ariaInvalid}
        className="min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-3.5 pr-2 text-sm text-[#0A1628] outline-none placeholder:text-[#0A1628]/35 focus:ring-0"
        onFocus={() => {
          setFocused(true)
          setText(displayFromIso)
        }}
        onBlur={(event) => {
          setFocused(false)
          const parsed = parseDDMMYYYYToIso(event.target.value)
          if (parsed !== null) {
            onChange(parsed)
          } else {
            onChange(iso)
          }
        }}
        onChange={(event) => setText(formatTypingToDDMMYYYY(event.target.value))}
        {...rest}
      />

      <button
        type="button"
        tabIndex={-1}
        className="flex shrink-0 items-center justify-center border-l border-[#0A1628]/10 px-3 text-[#0A1628]/45 transition hover:bg-[#D4A843]/10 hover:text-[#D4A843]"
        aria-label="Open calendar"
        onClick={openNativePicker}
      >
        <Calendar className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>

      <input
        ref={hiddenDateRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        value={iso}
        onChange={(event) => {
          applyPickedDate(event.target.value)
        }}
      />
    </div>
  )
}
