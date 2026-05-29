import { moduleNavigation } from '../../data/sidebarModulesContent.js'

export default function MobileModuleNav({ activeModule, onModuleChange }) {
  return (
    <div className="page-gutter-x border-b border-border bg-card/90 py-2 backdrop-blur lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {moduleNavigation.map((module) => (
          <button
            key={module.name}
            type="button"
            onClick={() => onModuleChange(module.name)}
            className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              activeModule === module.name
                ? 'border-[#D4A843]/70 bg-[#D4A843]/20 text-[#0A1628]'
                : 'border-border bg-card/95 text-muted-foreground'
            }`}
          >
            {module.name}
          </button>
        ))}
      </div>
    </div>
  )
}
