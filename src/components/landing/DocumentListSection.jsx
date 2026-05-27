import {
  Camera,
  ChartNoAxesColumn,
  FileBadge,
  FileCheck2,
  FileText,
  Globe,
  Handshake,
  Landmark,
} from 'lucide-react'

const iconMap = {
  passport: FileBadge,
  bankStatement: Landmark,
  preMedicalTranscript: FileCheck2,
  grade11Transcript: FileCheck2,
  professionalTranscripts: FileCheck2,
  cv: FileText,
  photo: Camera,
  examResults: ChartNoAxesColumn,
  englishTest: Globe,
  recommendations: Handshake,
}

function DocumentIcon({ id }) {
  const Icon = iconMap[id] ?? FileText
  return <Icon className="h-4 w-4" strokeWidth={1.8} />
}

function DocumentListSection({ title, items, checked = {}, onToggle }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const isChecked = Boolean(checked[item.id])
          return (
            <article
              key={item.id}
              className={`rounded-xl border border-border bg-card px-3 py-3 transition sm:px-4 ${
                isChecked
                  ? 'border-[#D4A843]/70 shadow-[0_8px_24px_rgba(16,185,129,0.12)]'
                  : 'border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                {onToggle ? (
                  <label className="mt-1 inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isChecked}
                      onChange={() => onToggle(item.id)}
                    />
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] font-bold ${
                        isChecked
                          ? 'border-[#16A34A] bg-[#16A34A] text-white'
                          : 'border-[#0A1628]/18 bg-white text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </label>
                ) : null}

                <span
                  className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                    isChecked ? 'bg-[#16A34A]/12 text-[#16A34A]' : 'bg-[#0A1628]/5 text-[#0A1628]/35'
                  }`}
                >
                  <DocumentIcon id={item.id} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong
                      className={`text-[15px] font-semibold ${
                        isChecked ? 'text-[#16A34A]' : 'text-[#0A1628]/88'
                      }`}
                    >
                      {item.name}
                    </strong>
                    <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-red-500">
                      {item.type}
                    </span>
                  </div>
                  <p
                    className={`mt-0.5 text-[15px] leading-snug ${
                      isChecked ? 'text-[#16A34A]' : 'text-[#0A1628]/45'
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default DocumentListSection
