import { ArrowLeft, FileStack } from 'lucide-react'
import FormField from '../common/FormField.jsx'
import PrimaryButton from '../common/PrimaryButton.jsx'

export default function TransferCreditsPanel({
  field,
  values,
  errors,
  onChange,
  onBack,
  onUploadActivityChange,
}) {
  if (!field) return null

  return (
    <div className="animate-fade-in-up overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-r from-[#D4A843]/5 to-transparent px-6 py-4 sm:px-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-[#D4A843]/45 hover:bg-[#D4A843]/5"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          Back to program selection
        </button>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843]/20 to-[#D4A843]/5 shadow-sm">
            <FileStack className="h-4 w-4 text-[#D4A843]" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#0A1628] [font-family:'DM_Serif_Display',serif] sm:text-2xl">
              {field.sectionTitle ?? 'Transfer Credits'}
            </h3>
            {field.sectionSubtitle ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{field.sectionSubtitle}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bg-[#FAF9F6]/80 p-6 sm:p-8">
        {field.sectionNote ? (
          <div className="mb-6 rounded-xl border border-blue-200/50 bg-blue-50/80 p-4">
            <p className="text-sm leading-relaxed text-blue-800/80">{field.sectionNote}</p>
          </div>
        ) : null}

        <div data-mucm-field={field.name}>
          <FormField
            field={{ ...field, sectionTitle: null, sectionSubtitle: null, sectionNote: null }}
            value={values[field.name]}
            allErrors={errors}
            onChange={onChange}
            onUploadActivityChange={onUploadActivityChange}
            allValues={values}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <PrimaryButton type="button" onClick={onBack}>
            Continue with application
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
