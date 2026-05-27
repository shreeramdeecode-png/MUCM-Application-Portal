import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PrimaryButton from '../components/common/PrimaryButton.jsx'
import {
  clearApplicantLocalDrafts,
} from '../utils/applicantStorageKeys.js'

const crestLogo =
  'https://d2xsxph8kpxj0f.cloudfront.net/310519663394975842/o5YxQXzG37vUfAnZtRoyQg/mucm-crest-logo_aac17a92.png'

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div>
        <p className="text-sm font-semibold text-[#0A1628]/85">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-[#0A1628]/45">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#D4A843]/40 focus:ring-offset-1 ${
          checked ? 'bg-[#D4A843]' : 'bg-[#0A1628]/15'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function SettingsPage() {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)

  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    applicationReminders: true,
    documentAlerts: true,
    systemAnnouncements: false,
  })

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const sections = [
    {
      id: 'notifications',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      ),
      title: 'Notifications',
      description: 'Control how and when you receive updates.',
      toggles: [
        { key: 'emailUpdates', label: 'Email updates', description: 'Receive application status updates by email' },
        { key: 'applicationReminders', label: 'Application reminders', description: 'Get reminded about incomplete steps' },
        { key: 'documentAlerts', label: 'Document alerts', description: 'Notify when documents are reviewed or rejected' },
        { key: 'systemAnnouncements', label: 'System announcements', description: 'Portal maintenance and feature updates' },
      ],
      state: notifications,
      setState: setNotifications,
    },
  ]

  return (
    <main className="page-gutter-x min-h-screen bg-background py-6">
      {/* Top nav */}
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-lg border border-[#0A1628]/12 bg-[#f8f8f7]/95 px-3 py-2 text-sm font-medium text-[#0A1628]/70 shadow-sm backdrop-blur transition hover:bg-[#f8f8f7] hover:text-[#0A1628]"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          <img src={crestLogo} alt="MUCM" className="h-8 w-8 rounded-lg border border-[#0A1628]/10 bg-white p-1 shadow-sm" />
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#0A1628]/45">MUCM Portal</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0A1628] px-6 py-8 shadow-2xl shadow-[#0A1628]/20">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#D4A843]/10" />
          <div className="pointer-events-none absolute -bottom-10 left-16 h-32 w-32 rounded-full bg-[#D4A843]/8" />
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4A843]">Portal Preferences</p>
            <h1 className="mt-0.5 text-2xl text-white [font-family:'DM_Serif_Display',serif] sm:text-3xl">
              Settings
            </h1>
            <p className="mt-1 text-sm text-white/55">
              Customise notifications, privacy.
            </p>
          </div>
        </div>

        {/* Settings sections */}
        {sections.map((section) => (
          <div key={section.id} className="rounded-2xl border border-[#0A1628]/10 bg-[#f8f8f7] shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#0A1628]/8 px-6 py-4">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#0A1628]/6 text-[#0A1628]/55">
                {section.icon}
              </span>
              <div>
                <h2 className="text-base font-semibold text-[#0A1628]">{section.title}</h2>
                <p className="text-xs text-[#0A1628]/45">{section.description}</p>
              </div>
            </div>
            <div className="divide-y divide-[#0A1628]/6 px-6">
              {section.toggles.map((toggle) => (
                <Toggle
                  key={toggle.key}
                  checked={section.state[toggle.key]}
                  onChange={(val) => section.setState((prev) => ({ ...prev, [toggle.key]: val }))}
                  label={toggle.label}
                  description={toggle.description}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Danger zone */}
        <div className="rounded-2xl border border-red-200/70 bg-[#f8f8f7] shadow-sm">
          <div className="flex items-center gap-3 border-b border-red-100 px-6 py-4">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-semibold text-red-700">Danger Zone</h2>
              <p className="text-xs text-red-500/70">Irreversible actions for your account data.</p>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#0A1628]/85">Clear saved draft</p>
                <p className="mt-0.5 text-xs text-[#0A1628]/45">
                  Remove all locally stored form progress. This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('This will delete all your saved progress. Are you sure?')) {
                    let session = {}
                    try {
                      session = JSON.parse(window.localStorage.getItem('mucm-auth-session') ?? '{}')
                    } catch {
                      session = {}
                    }
                    clearApplicantLocalDrafts(session)
                    alert('Draft cleared.')
                  }
                }}
                className="flex-shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                Clear Draft
              </button>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 pb-6">
          <PrimaryButton type="button" onClick={handleSave}>Save Preferences</PrimaryButton>
          {saved ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Preferences saved
            </span>
          ) : null}
        </div>
      </div>
    </main>
  )
}

export default SettingsPage
