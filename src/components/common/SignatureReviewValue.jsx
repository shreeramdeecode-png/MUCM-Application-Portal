import { apiUrl } from '../../config/baseUrl.js'

export const SIGNATURE_SCRIPT_FONT =
  "'Mr Dafoe', 'Segoe Script', 'Brush Script MT', cursive"

export function isSignatureTypedField(field) {
  return field?.type === 'text' && Boolean(field?.signaturePreview)
}

export function isSignatureUploadField(field) {
  if (field?.type !== 'file') return false
  return /signature/i.test(String(field.name ?? ''))
}

/** Resolve a stored signature value to an image URL suitable for <img src>. */
export function getSignatureImageSrc(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  if (raw.startsWith('data:image/')) {
    return raw
  }

  const looksLikeImage = /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(raw)
  if (!looksLikeImage) {
    return ''
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`
  return apiUrl(path)
}

export default function SignatureReviewValue({
  field,
  value,
  align = 'right',
  compact = false,
}) {
  if (isSignatureTypedField(field)) {
    const text = String(value ?? '').trim()
    if (!text) {
      return <p className="text-sm text-muted-foreground">Not provided</p>
    }

    return (
      <div className={align === 'right' ? 'space-y-1.5 sm:ml-auto sm:max-w-md' : 'space-y-1.5'}>
        <p className="text-sm text-muted-foreground">Typed signature</p>
        <div
          className={`inline-flex w-full flex-col justify-center rounded-lg border border-[#0A1628]/12 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(10,22,40,0.05)] ${
            compact
              ? 'min-h-[3.25rem] px-3 py-2'
              : 'min-h-[4.25rem] rounded-xl px-4 py-3 shadow-[0_1px_3px_rgba(10,22,40,0.06)]'
          }`}
        >
          <p
            className={`origin-left -rotate-[1.25deg] break-words leading-none text-[#0c1220] antialiased [font-synthesis:none] ${
              compact
                ? 'text-[clamp(1.35rem,3.5vw,1.85rem)]'
                : 'text-[clamp(1.75rem,4vw,2.75rem)]'
            }`}
            style={{ fontFamily: SIGNATURE_SCRIPT_FONT }}
          >
            {text}
          </p>
        </div>
      </div>
    )
  }

  if (isSignatureUploadField(field) || field?.type === 'file') {
    const src = getSignatureImageSrc(value)
    if (!src) {
      const empty =
        value === undefined || value === null || String(value).trim() === ''
      return (
        <p className="text-sm text-muted-foreground">
          {empty ? 'Not uploaded' : 'Signature image attached'}
        </p>
      )
    }

    return (
      <div className={`space-y-1.5 ${align === 'right' ? 'sm:ml-auto sm:max-w-xs' : ''}`}>
        <p className="text-sm text-muted-foreground">Uploaded signature</p>
        <img
          src={src}
          alt="Uploaded signature"
          className="max-h-28 max-w-[280px] rounded-lg border border-border bg-card object-contain object-left sm:ml-auto"
        />
      </div>
    )
  }

  return null
}
