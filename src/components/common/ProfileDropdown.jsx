import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function getInitials(email) {
  if (!email) return 'AP'
  const [local] = email.split('@')
  const parts = local.split(/[._-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return local.slice(0, 2).toUpperCase()
}

function ProfileDropdown({ email, onLogout, onBackToChecklist = null, darkAvatar = true }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = getInitials(email)

  return (
    <div ref={ref} className="relative">
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ring-2 transition focus:outline-none ${
          darkAvatar
            ? 'bg-[#0A1628] text-[#D4A843] ring-[#D4A843]/30 hover:ring-[#D4A843]/60'
            : 'bg-white/15 text-white ring-white/30 hover:bg-white/25 hover:ring-white/50'
        }`}
        aria-label="Open profile menu"
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-[#0A1628]/12 bg-white shadow-xl shadow-[#0A1628]/12">
          {/* User info header */}
          <div className="flex items-center gap-3 border-b border-[#0A1628]/8 bg-[#F8F7F4] px-4 py-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#0A1628] text-sm font-bold text-[#D4A843]">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#0A1628]">
                Applicant
              </p>
              <p className="truncate text-xs text-[#0A1628]/50">{email}</p>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            {onBackToChecklist ? (
              <button
                type="button"
                onClick={() => { setOpen(false); onBackToChecklist() }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#0A1628]/80 transition hover:bg-[#F8F7F4] hover:text-[#0A1628]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0A1628]/6 text-[#0A1628]/60">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 19.5 3 12m0 0 7.125-7.5M3 12h18" />
                  </svg>
                </span>
                Back to Checklist
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/profile') }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#0A1628]/80 transition hover:bg-[#F8F7F4] hover:text-[#0A1628]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0A1628]/6 text-[#0A1628]/60">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </span>
              My Profile
            </button>

            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/settings') }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#0A1628]/80 transition hover:bg-[#F8F7F4] hover:text-[#0A1628]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0A1628]/6 text-[#0A1628]/60">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                </svg>
              </span>
              Settings
            </button>
          </div>

          <div className="border-t border-[#0A1628]/8 py-1.5">
            <button
              type="button"
              onClick={() => { setOpen(false); onLogout() }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 hover:text-red-700"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
              </span>
              Sign Out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ProfileDropdown
