import ModulePageHeader from '../common/ModulePageHeader.jsx'

/**
 * Sticky top bar: logo + module title, with optional right-side actions (profile, autosave, etc.).
 */
export default function AppModuleTopBar({
  title,
  compact = false,
  className = '',
  children,
}) {
  return (
    <div
      className={`page-gutter-x flex items-center justify-between gap-3 border-b border-border bg-card/95 py-2.5 backdrop-blur-md ${className}`}
    >
      <ModulePageHeader title={title} compact={compact} />
      {children ? <div className="flex shrink-0 items-center gap-2 sm:gap-3">{children}</div> : null}
    </div>
  )
}
