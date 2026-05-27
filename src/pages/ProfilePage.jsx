import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PrimaryButton from '../components/common/PrimaryButton.jsx'
import DateInput from '../components/common/DateInput.jsx'

const crestLogo =
  'https://d2xsxph8kpxj0f.cloudfront.net/310519663394975842/o5YxQXzG37vUfAnZtRoyQg/mucm-crest-logo_aac17a92.png'

function getInitials(email) {
  if (!email) return 'AP'
  const [local] = email.split('@')
  const parts = local.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

function sanitizePhoneInput(raw) {
  const value = String(raw ?? '')
  const cleaned = value.replace(/[^\d+\s()-]/g, '')
  const plusNormalized = cleaned.replace(/\+/g, '')
  return cleaned.trimStart().startsWith('+')
    ? `+${plusNormalized}`
    : plusNormalized
}

function ProfilePage() {
  const navigate = useNavigate()
  const userEmail = (() => {
    try {
      return JSON.parse(window.localStorage.getItem('mucm-auth-session') ?? '{}').email ?? ''
    } catch {
      return ''
    }
  })()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    nationality: '',
    dateOfBirth: '',
  })
  const [saved, setSaved] = useState(false)

  function handleChange(e) {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'tel' ? sanitizePhoneInput(value) : value,
    }))
    setSaved(false)
  }

  function handleSave(e) {
    e.preventDefault()
    setSaved(true)
  }

  const initials = getInitials(userEmail)

  return (
    <main className="page-gutter-x min-h-screen bg-background py-6">
      {/* Top nav */}
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur transition hover:bg-card hover:text-foreground"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          <img src={crestLogo} alt="MUCM" className="h-8 w-8 rounded-lg border border-[#0A1628]/10 bg-white p-1 shadow-sm" />
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">MUCM Portal</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5">
        {/* Profile hero card */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0A1628] px-6 py-8 shadow-2xl shadow-[#0A1628]/20">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#D4A843]/10" />
          <div className="pointer-events-none absolute -bottom-10 left-16 h-32 w-32 rounded-full bg-[#D4A843]/8" />
          <div className="relative z-10 flex items-center gap-5">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-[#D4A843]/20 text-3xl font-bold text-[#D4A843] ring-2 ring-[#D4A843]/30">
              {initials}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4A843]">Applicant Account</p>
              <h1 className="mt-0.5 text-2xl text-white [font-family:'DM_Serif_Display',serif] sm:text-3xl">
                My Profile
              </h1>
              <p className="mt-1 text-sm text-white/55">{userEmail}</p>
            </div>
          </div>
        </div>

        {/* Form card */}
        <form onSubmit={handleSave} className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-foreground [font-family:'DM_Serif_Display',serif]">
            Personal Information
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Update your personal details associated with this application account.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'e.g. John' },
              { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'e.g. Smith' },
              { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+1 (555) 000-0000' },
              { name: 'nationality', label: 'Nationality', type: 'text', placeholder: 'e.g. Antiguan' },
              { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', placeholder: '' },
            ].map((field) => (
              <div key={field.name} className={field.name === 'phone' || field.name === 'nationality' ? 'sm:col-span-1' : ''}>
                <label className="block text-sm font-medium text-foreground">
                  {field.label}
                </label>
                {field.type === 'date' ? (
                  <DateInput
                    name={field.name}
                    value={form[field.name]}
                    onChange={(next) => {
                      setForm((prev) => ({ ...prev, [field.name]: next }))
                      setSaved(false)
                    }}
                    placeholder="DD/MM/YYYY"
                    className="mt-2 flex h-10 w-full rounded-md border border-input bg-background text-sm text-foreground transition focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
                  />
                ) : (
                  <input
                    type={field.type}
                    name={field.name}
                    value={form[field.name]}
                    onChange={handleChange}
                    inputMode={field.type === 'tel' ? 'numeric' : undefined}
                    placeholder={field.placeholder}
                    className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  />
                )}
              </div>
            ))}

            {/* Email — read-only */}
            <div>
              <label className="block text-sm font-medium text-foreground">
                Email Address
              </label>
              <input
                type="email"
                value={userEmail}
                readOnly
                className="mt-2 w-full cursor-not-allowed rounded-md border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground outline-none"
              />
              <p className="mt-1 text-xs text-muted-foreground">Email is linked to your login and cannot be changed here.</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <PrimaryButton type="submit">Save Changes</PrimaryButton>
            {saved ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Saved successfully
              </span>
            ) : null}
          </div>
        </form>

        {/* Account info card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-foreground [font-family:'DM_Serif_Display',serif]">
            Account Details
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Read-only account information managed by the admissions office.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: 'Account Type', value: 'Applicant' },
              { label: 'Application Status', value: 'In Progress' },
              { label: 'Institution', value: 'Metropolitan University College of Medicine' },
              { label: 'Portal Access', value: 'Active' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-foreground/90">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

export default ProfilePage
