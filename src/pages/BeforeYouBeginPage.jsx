import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PrimaryButton from '../components/common/PrimaryButton.jsx'
import ProfileDropdown from '../components/common/ProfileDropdown.jsx'
import DocumentListSection from '../components/landing/DocumentListSection.jsx'
import { optionalDocuments, requiredDocuments } from '../data/documentChecklist.js'
import { clearApplicantHydrationSessionFlags, getApplicantStorageScope, markBeforeYouBeginSeen, shouldSkipBeforeYouBegin } from '../utils/applicantStorageKeys.js'

const crestLogo =
  'https://d2xsxph8kpxj0f.cloudfront.net/310519663394975842/o5YxQXzG37vUfAnZtRoyQg/mucm-crest-logo_aac17a92.png'

function BeforeYouBeginPage() {
  const navigate = useNavigate()
  const [checked, setChecked] = useState({})
  const userEmail = (() => {
    try {
      return JSON.parse(window.localStorage.getItem('mucm-auth-session') ?? '{}').email ?? ''
    } catch {
      return ''
    }
  })()

  useEffect(() => {
    try {
      const session = JSON.parse(window.localStorage.getItem('mucm-auth-session') ?? '{}')
      if (shouldSkipBeforeYouBegin(session)) {
        navigate('/application', { replace: true })
      }
    } catch {
      // ignore
    }
  }, [navigate, userEmail])

  function toggleChecked(id) {
    setChecked((previous) => ({ ...previous, [id]: !previous[id] }))
  }

  function handleLogout() {
    let session = {}
    try {
      session = JSON.parse(window.localStorage.getItem('mucm-auth-session') ?? '{}')
    } catch {
      session = {}
    }
    const scope = getApplicantStorageScope(session)
    clearApplicantHydrationSessionFlags(scope)
    window.localStorage.removeItem('mucm-auth-session')
    window.localStorage.removeItem('mucm-support-center-tab')
    navigate('/login')
  }

  return (
    <main className="page-gutter-x min-h-screen bg-background py-6">
      <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-card shadow-md">
        <header className="relative overflow-visible bg-[#0A1628] px-4 py-5 sm:px-7 sm:py-8">
          <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#D4A843]/10" />
          <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-[#D4A843]/10" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
              <img
                src={crestLogo}
                alt="MUCM Crest"
                className="h-12 w-12 rounded-xl bg-white/10 p-1.5 shadow-lg sm:h-14 sm:w-14"
              />
              <div className="space-y-0.5">
                <h1 className="text-2xl text-white [font-family:'DM_Serif_Display',serif] sm:text-3xl">
                  Before You Begin
                </h1>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D4A843] sm:text-xs sm:tracking-[0.18em]">
                  METROPOLITAN UNIVERSITY COLLEGE OF MEDICINE
                </p>
                <small className="text-sm text-white/65 sm:text-base">
                  Gather these documents to complete your application smoothly
                </small>
              </div>
            </div>
            <div className="relative z-30 self-start sm:self-auto">
              <ProfileDropdown email={userEmail} onLogout={handleLogout} darkAvatar={false} />
            </div>
          </div>
        </header>

        <div className="space-y-4 px-6 py-5 sm:px-8 sm:py-6">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-border bg-muted p-3.5">
              <h4 className="text-sm font-bold text-foreground/90">
                Allow 30-45 minutes
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                The application has 8 sections. You can save your progress and
                return later.
              </p>
            </article>
            <article className="rounded-xl border border-border bg-muted p-3.5">
              <h4 className="text-sm font-bold text-foreground/90">
                Have your documents ready
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Scanned copies in PDF, JPEG, or PNG format (max 5MB each).
              </p>
            </article>
            <article className="rounded-xl border border-border bg-muted p-3.5">
              <h4 className="text-sm font-bold text-foreground/90">
                Financial information
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                You&apos;ll need details about how your education will be funded.
              </p>
            </article>
          </section>

          <DocumentListSection
            title="Required Documents"
            items={requiredDocuments}
            checked={checked}
            onToggle={toggleChecked}
          />
          <DocumentListSection
            title="Optional / If Applicable"
            items={optionalDocuments}
          />

          <section className="rounded-2xl border border-amber-200/50 bg-amber-50/70 p-3.5">
            <p className="text-xs leading-relaxed text-amber-900/75 sm:text-sm">
              Don&apos;t have all documents ready? No problem - you can save your
              progress at any step and return later to complete your
              application.
            </p>
          </section>

          <div className="pt-1">
            <PrimaryButton
              type="button"
              onClick={() => {
                try {
                  const session = JSON.parse(window.localStorage.getItem('mucm-auth-session') ?? '{}')
                  markBeforeYouBeginSeen(session)
                } catch {
                  markBeforeYouBeginSeen({ email: userEmail })
                }
                navigate('/application')
              }}
            >
              Start Application
            </PrimaryButton>
            <small className="mt-2 block text-center text-xs text-[#0A1628]/35">
              Tip: Check off each required document above to confirm you have it
              ready.
            </small>
          </div>
        </div>
      </section>
    </main>
  )
}

export default BeforeYouBeginPage
