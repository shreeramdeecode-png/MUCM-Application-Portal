import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Upload, X } from 'lucide-react'

function parseAcceptExtensions(accept) {
  if (!accept || typeof accept !== 'string') return ['.pdf', '.jpg', '.jpeg', '.png']
  return accept
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function fileMatchesAccept(file, accept) {
  const exts = parseAcceptExtensions(accept)
  const lower = file.name.toLowerCase()
  return exts.some((ext) => {
    const e = ext.startsWith('.') ? ext : `.${ext}`
    return lower.endsWith(e)
  })
}

/**
 * Smooth simulated upload progress (no server). Duration scales lightly with file size.
 */
function runUploadProgress(onProgress, signal) {
  return (file) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      const sizeMb = file.size / (1024 * 1024)
      const durationMs = Math.min(3200, Math.max(450, 380 + sizeMb * 420))
      const start = performance.now()
      let raf = 0

      function tick(now) {
        if (signal.aborted) {
          cancelAnimationFrame(raf)
          reject(new DOMException('Aborted', 'AbortError'))
          return
        }
        const t = Math.min(1, (now - start) / durationMs)
        const eased = 1 - (1 - t) ** 2
        onProgress(Math.min(100, Math.round(eased * 100)))
        if (t < 1) {
          raf = requestAnimationFrame(tick)
        } else {
          onProgress(100)
          resolve()
        }
      }

      raf = requestAnimationFrame(tick)
    })
}

function isImageAccept(accept) {
  const exts = parseAcceptExtensions(accept)
  return exts.every((e) => {
    const x = e.startsWith('.') ? e : `.${e}`
    return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(x)
  })
}

export default function FileDropzone({
  accept = '.pdf,.jpg,.jpeg,.png',
  maxFileSizeMB = 5,
  value,
  onChange,
  required,
  error,
  /** Shown inside the dashed area (field title). */
  fieldLabel,
  /** e.g. "Accepted formats: PDF, JPEG. Maximum file size: 5 MB." */
  formatsLine,
  /** Longer guidance (field helper), inside the dashed area. */
  helperText,
  /** +1 when a simulated upload starts, −1 when it ends (success, cancel, or error). */
  onUploadActivityChange,
  /** If true (image-only accepts), store a data URL so the UI can preview the image. */
  storeAsDataUrl = false,
  /** Optional backend upload handler: async (file) => stored value string. */
  onUploadFile,
  /** Smaller dropzone / success card (e.g. signature). */
  compact = false,
}) {
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dropHint, setDropHint] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingFileName, setPendingFileName] = useState('')
  const id = useId()
  const valueStr = value != null ? String(value) : ''
  const isDataUrlImage = valueStr.startsWith('data:image/')
  const hasFile = Boolean(valueStr.trim())

  const resetInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [])

  const abortUpload = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setIsUploading(false)
    setUploadProgress(0)
    setPendingFileName('')
  }, [])

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
    }
  }, [])

  const syncInputFile = useCallback((file) => {
    if (!inputRef.current) return
    try {
      const dt = new DataTransfer()
      dt.items.add(file)
      inputRef.current.files = dt.files
    } catch {
      /* ignore */
    }
  }, [])

  const finalizeFile = useCallback(
    async (file) => {
      if (typeof onUploadFile === 'function') {
        const uploadedValue = await onUploadFile(file)
        if (!uploadedValue || String(uploadedValue).trim() === '') {
          throw new Error('Upload completed but no file path was returned.')
        }
        onChange(String(uploadedValue))
        syncInputFile(file)
        return
      }
      const useData =
        storeAsDataUrl && isImageAccept(accept) && file.type.startsWith('image/')
      if (useData) {
        const reader = new FileReader()
        reader.onload = () => {
          onChange(reader.result)
          syncInputFile(file)
        }
        reader.onerror = () => {
          onChange(file.name)
          syncInputFile(file)
        }
        reader.readAsDataURL(file)
        return
      }
      onChange(file.name)
      syncInputFile(file)
    },
    [accept, onChange, onUploadFile, storeAsDataUrl, syncInputFile],
  )

  const startUpload = useCallback(
    (file) => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setDropHint('')
      setPendingFileName(file.name)
      setUploadProgress(0)
      setIsUploading(true)
      onUploadActivityChange?.(1)

      const run = runUploadProgress(setUploadProgress, controller.signal)
      run(file)
        .then(async () => {
          if (controller.signal.aborted) return
          await finalizeFile(file)
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return
          setDropHint(err?.message || 'Upload failed. Please try again.')
        })
        .finally(() => {
          onUploadActivityChange?.(-1)
          setIsUploading(false)
          setUploadProgress(0)
          setPendingFileName('')
          abortRef.current = null
        })
    },
    [finalizeFile, onUploadActivityChange],
  )

  const applyFile = useCallback(
    (file) => {
      if (!file) return false
      if (!fileMatchesAccept(file, accept)) {
        setDropHint('Use one of the accepted file types for this field.')
        return false
      }
      const maxBytes = maxFileSizeMB * 1024 * 1024
      if (file.size > maxBytes) {
        setDropHint(`File is too large. Maximum size is ${maxFileSizeMB} MB.`)
        return false
      }
      startUpload(file)
      return true
    },
    [accept, maxFileSizeMB, startUpload],
  )

  const handleInputChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!applyFile(file) && inputRef.current) {
        inputRef.current.value = ''
      }
    } else {
      onChange('')
    }
  }

  const clearFile = (event) => {
    event.preventDefault()
    event.stopPropagation()
    abortUpload()
    setDropHint('')
    onChange('')
    resetInput()
  }

  const onDragOver = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  const onDragLeave = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }

  const onDrop = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) applyFile(file)
  }

  const openPicker = () => {
    if (!isUploading) inputRef.current?.click()
  }

  const showProgress = isUploading
  const showEmpty = !hasFile && !showProgress

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="sr-only"
        tabIndex={-1}
        required={required && !hasFile && !isUploading}
        accept={accept}
        disabled={isUploading}
        onChange={handleInputChange}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={
          [dropHint ? `${id}-hint` : null, helperText ? `${id}-helper` : null].filter(Boolean).join(' ') ||
          undefined
        }
        aria-label={
          fieldLabel
            ? `${fieldLabel}${required ? ' (required)' : ''} — file upload`
            : `Upload file — max ${maxFileSizeMB} MB`
        }
      />

      {hasFile && !showProgress ? (
        <div
          className={`relative overflow-hidden rounded-xl border border-[#D4A843]/70 bg-card shadow-[0_8px_24px_rgba(16,185,129,0.12)] transition ${
            compact ? 'px-2.5 py-2 sm:px-3 sm:py-2.5' : 'px-3 py-2.5 sm:px-3.5 sm:py-3'
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className={`flex min-w-0 gap-2.5 ${isDataUrlImage ? 'flex-col sm:flex-row sm:items-start' : 'items-start'}`}>
              {isDataUrlImage ? (
                <div className="flex-shrink-0 rounded-lg border border-[#0A1628]/10 bg-white p-1 shadow-sm">
                  <img
                    src={valueStr}
                    alt="Uploaded signature"
                    className={`block max-h-14 w-auto max-w-[200px] object-contain object-left sm:max-h-16 ${compact ? 'max-h-12 max-w-[160px] sm:max-h-14' : ''}`}
                  />
                </div>
              ) : (
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#16A34A]/12 text-[#16A34A] sm:h-8 sm:w-8">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.8} />
                </span>
              )}
              <div className="min-w-0 pt-0.5">
                {fieldLabel ? (
                  <p className={`font-semibold leading-snug text-foreground ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
                    {fieldLabel} {required ? <span className="text-red-500">*</span> : null}
                  </p>
                ) : null}
                <p
                  className={`font-semibold text-[#16A34A] ${fieldLabel ? 'mt-0.5' : ''} ${compact ? 'text-xs' : 'text-sm'}`}
                >
                  {isDataUrlImage ? 'Signature image added' : 'File added'}
                </p>
                {!isDataUrlImage ? (
                  <p className="mt-0.5 truncate text-xs text-[#16A34A]/90 sm:text-sm" title={valueStr}>
                    {valueStr}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className={`flex shrink-0 items-center gap-1 self-start rounded-md border border-border bg-background font-semibold text-muted-foreground shadow-sm transition hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive sm:self-center ${
                compact ? 'h-7 px-2 text-[11px]' : 'h-8 px-2.5 text-xs sm:h-9'
              }`}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              Remove
            </button>
          </div>
        </div>
      ) : null}

      {showProgress ? (
        <div
          className="overflow-hidden rounded-xl border border-[#D4A843]/35 bg-card px-3 py-3 shadow-sm sm:px-3.5"
          role="progressbar"
          aria-valuenow={uploadProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Upload progress: ${uploadProgress}%`}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#D4A843]/12 text-[#b98a22]">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              {fieldLabel ? (
                <p className="text-sm font-semibold leading-snug text-foreground">
                  {fieldLabel} {required ? <span className="text-red-500">*</span> : null}
                </p>
              ) : null}
              <div className={`flex items-center justify-between gap-2 ${fieldLabel ? 'mt-1.5' : ''}`}>
                <p className="text-sm font-semibold text-foreground">Uploading…</p>
                <span className="text-xs font-bold tabular-nums text-[#D4A843]">{uploadProgress}%</span>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground" title={pendingFileName}>
                {pendingFileName}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D4A843] to-[#16A34A] transition-[width] duration-150 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="flex h-9 flex-shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-muted-foreground shadow-sm transition hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showEmpty ? (
        <button
          type="button"
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openPicker()
            }
          }}
          onDragEnter={onDragOver}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`group relative w-full rounded-xl border-2 border-dashed border-border bg-muted/40 text-left transition ${
            compact ? 'px-2.5 py-2 sm:px-3 sm:py-2.5' : 'px-3 py-2.5 sm:px-4 sm:py-3'
          } ${
            isDragging
              ? 'border-[#D4A843] bg-accent/20 shadow-[inset_0_0_0_1px_rgba(212,168,67,0.35)]'
              : error
                ? 'border-destructive/50 bg-destructive/5 hover:border-destructive/70'
                : 'hover:border-[#D4A843]/55 hover:bg-muted/60'
          }`}
          aria-label={
            fieldLabel
              ? `${fieldLabel}${required ? ' (required)' : ''} — drag and drop or click to upload`
              : 'Upload file — drag and drop or click to browse'
          }
        >
          <div className={`pointer-events-none flex w-full flex-col ${compact ? 'gap-1' : 'gap-1.5 sm:gap-2'}`}>
            {fieldLabel ? (
              <p
                className={`w-full text-center font-semibold leading-tight text-foreground sm:text-left ${compact ? 'text-xs' : 'text-sm'}`}
              >
                {fieldLabel} {required ? <span className="text-red-500">*</span> : null}
              </p>
            ) : null}
            {formatsLine ? (
              <p
                className="w-full text-center text-xs leading-snug text-muted-foreground sm:text-left sm:text-sm"
              >
                {formatsLine}
              </p>
            ) : (
              <p className="w-full text-center text-xs leading-snug text-muted-foreground sm:text-left sm:text-sm">
                PDF, images, or other accepted types · max {maxFileSizeMB} MB
              </p>
            )}
            <div className={`flex items-center gap-2 pt-0.5 sm:gap-3 ${compact ? '' : ''}`}>
              <span
                className={`flex shrink-0 items-center justify-center rounded-lg border shadow-sm transition ${
                  compact ? 'h-7 w-7' : 'h-8 w-8'
                } ${
                  isDragging
                    ? 'border-[#D4A843]/40 bg-[#D4A843]/15 text-[#b98a22]'
                    : 'border-border bg-card text-muted-foreground group-hover:border-[#D4A843]/40 group-hover:text-[#D4A843]'
                }`}
              >
                <Upload className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={1.6} />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className={`font-semibold leading-snug text-foreground/90 ${compact ? 'text-xs' : 'text-sm'}`}>
                  {isDragging ? 'Drop file to upload' : 'Drag & drop or click to browse'}
                </p>
                {helperText ? (
                  <p
                    id={`${id}-helper`}
                    className={`mt-0.5 leading-snug text-muted-foreground ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}
                  >
                    {helperText}
                  </p>
                ) : null}
              </div>
            </div>
            {error ? (
              <p className="w-full text-center text-xs font-medium leading-snug text-red-600 sm:text-left">{error}</p>
            ) : null}
            {dropHint ? (
              <p id={`${id}-hint`} className="w-full text-center text-xs font-medium text-amber-700 sm:text-left" role="status">
                {dropHint}
              </p>
            ) : null}
          </div>
        </button>
      ) : null}

      {dropHint && !showEmpty ? (
        <p id={`${id}-hint`} className="text-xs font-medium text-amber-700" role="status">
          {dropHint}
        </p>
      ) : null}
    </div>
  )
}
