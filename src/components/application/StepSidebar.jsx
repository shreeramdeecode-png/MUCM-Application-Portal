import { moduleNavigation } from '../../data/sidebarModulesContent.js'
import { MUCM_CREST_LOGO } from '../../constants/branding.js'
import { Bell, CircleHelp, FileText, FolderOpen, LayoutPanelTop, ReceiptText } from 'lucide-react'

const moduleIconMap = {
  'Application form': FileText,
  Notification: Bell,
  FAQ: CircleHelp,
  Document: FolderOpen,
  'Submitted Applications': ReceiptText,
}

function StepSidebar({ activeModule, onModuleChange }) {
  return (
    <aside className="relative hidden h-screen overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#071427] via-[#0A1628] to-[#0f2742] text-white lg:sticky lg:top-0 lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.24),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_45%)]" />
      <div className="relative flex h-full flex-col px-6 py-8">
        <div className="mb-5 flex items-center justify-center">
          <img
            src={MUCM_CREST_LOGO}
            alt="MUCM Crest"
            className="h-14 w-14 rounded-xl border border-white/20 bg-white/10 p-1.5 shadow-sm"
          />
        </div>

        <ol className="space-y-2.5">
          {moduleNavigation.map((module) => {
            const Icon = moduleIconMap[module.name] ?? LayoutPanelTop
            return (
              <li key={module.name}>
              <button
                type="button"
                onClick={() => onModuleChange(module.name)}
                className={`relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 text-left transition ${
                  activeModule === module.name
                    ? 'animate-soft-pulse border-[#D4A843]/70 bg-gradient-to-r from-[#D4A843]/25 to-[#D4A843]/5 text-[#f7dc95] shadow-lg shadow-[#D4A843]/10'
                    : 'border-white/10 bg-white/[0.02] text-white/75 hover:border-white/25 hover:bg-white/[0.05]'
                }`}
              >
                {activeModule === module.name ? (
                  <>
                    <span className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-[#fff6d8]/20 to-transparent" />
                  </>
                ) : null}
                <span
                  className={`mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-bold uppercase ${
                    activeModule === module.name
                      ? 'border-[#D4A843]/60 bg-[#D4A843]/20 text-[#ffe4a1]'
                      : 'border-white/20 bg-white/5 text-white/70'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm font-semibold">{module.name}</strong>
                  <small className="mt-0.5 block text-sm text-white/50">{module.note}</small>
                </span>
              </button>
              </li>
            )
          })}
        </ol>

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
          <p className="text-sm text-white/45">Need help? Contact admissions</p>
          <a
            className="mt-1 inline-block text-sm text-[#D4A843] transition hover:text-[#C5972C]"
            href="mailto:admissions@muantigua.org"
          >
            admissions@muantigua.org
          </a>
        </div>
      </div>
    </aside>
  )
}

export default StepSidebar
