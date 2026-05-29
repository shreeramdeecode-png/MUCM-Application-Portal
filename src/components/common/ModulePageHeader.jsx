import { MUCM_NAVBAR_LOGO } from '../../constants/branding.js'

/**
 * Navbar brand: university logo + active module / page title.
 */
export default function ModulePageHeader({ title, compact = false }) {
  if (!title) return null

  return (
    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
      <img
        src={MUCM_NAVBAR_LOGO}
        alt="Metropolitan University College of Medicine"
        className={`shrink-0 object-contain object-left ${
          compact
            ? 'h-8 w-auto max-w-[140px] sm:h-9 sm:max-w-[170px]'
            : 'h-9 w-auto max-w-[180px] sm:h-10 sm:max-w-[220px] lg:max-w-[240px]'
        }`}
      />
      <span
        className="hidden h-8 w-px shrink-0 bg-[#0A1628]/12 sm:block"
        aria-hidden
      />
      <h1
        className={`min-w-0 truncate font-semibold leading-tight text-[#0A1628] [font-family:'DM_Serif_Display',serif] ${
          compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
        }`}
      >
        {title}
      </h1>
    </div>
  )
}
