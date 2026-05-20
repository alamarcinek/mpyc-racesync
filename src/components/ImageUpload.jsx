import { useRef, useState, useCallback } from 'react'
import { UploadIcon, SparklesIcon } from './icons'

const STATUS_LABEL = {
  pending: 'Ready',
  processing: 'Transcribing…',
  done: 'Done',
  error: 'Error',
}

const STATUS_STYLE = {
  pending: 'bg-slate-100 text-slate-600',
  processing: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
}

const TYPE_LABEL = { entry: 'Entry Form', results: 'Race Results' }
const TYPE_STYLE = { entry: 'bg-purple-100 text-purple-700', results: 'bg-navy-light text-navy' }

export default function ImageUpload({ images, onAdd, onRemove, onTranscribe, onTranscribeAll }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (files.length) onAdd(files)
  }, [onAdd])

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragging(true) }, [])
  const handleDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
  }, [])

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith('image/'))
    if (files.length) onAdd(files)
    e.target.value = ''
  }, [onAdd])

  const pendingCount = images.filter((i) => i.status === 'pending').length
  const processingCount = images.filter((i) => i.status === 'processing').length

  return (
    <div className="card space-y-5">
      <h2 className="section-title mb-0">Upload Sheets</h2>
      <p className="text-sm text-slate-500 -mt-3">
        Entry forms and race results sheets — the app detects the type automatically.
      </p>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload race sheet images"
        className={[
          'border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-colors',
          dragging ? 'border-navy bg-navy-light' : 'border-slate-300 hover:border-navy hover:bg-slate-50',
        ].join(' ')}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="sr-only" aria-hidden="true" />
        <UploadIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-700 font-semibold text-lg">Drop images here or tap to select</p>
        <p className="text-slate-400 text-sm mt-1">JPG, PNG, HEIC — multiple files accepted</p>
        {images.some((i) => i.file?.size > 4 * 1024 * 1024) && (
          <p className="text-amber-600 text-xs mt-2">Large images detected — keep under 4 MB for best results</p>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img) => (
              <Thumbnail key={img.id} img={img} onRemove={onRemove} onTranscribe={onTranscribe} />
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-1">
            {pendingCount > 0 && (
              <button onClick={onTranscribeAll} disabled={processingCount > 0} className="btn-primary">
                <SparklesIcon className="w-4 h-4" />
                Transcribe All&nbsp;({pendingCount})
              </button>
            )}
            {processingCount > 0 && (
              <span className="text-sm text-blue-600 font-medium flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Transcribing {processingCount} image{processingCount > 1 ? 's' : ''}…
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Thumbnail({ img, onRemove, onTranscribe }) {
  return (
    <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm flex flex-col">
      <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
        <img src={img.preview} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
        {img.status === 'processing' && (
          <div className="absolute inset-0 bg-navy/60 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-xs font-medium">Transcribing…</span>
          </div>
        )}
        {img.status !== 'processing' && (
          <button
            onClick={() => onRemove(img.id)}
            aria-label={`Remove ${img.name}`}
            className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition hover:bg-black/75 text-base leading-none"
          >
            ×
          </button>
        )}
      </div>

      <div className="p-2 space-y-1.5 flex-1">
        <p className="text-xs text-slate-600 truncate font-medium" title={img.name}>{img.name}</p>
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[img.status]}`}>
            {STATUS_LABEL[img.status]}
          </span>
          {/* Detected type badge — shown after transcription */}
          {img.sheetType && img.status === 'done' && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_STYLE[img.sheetType]}`}>
              {TYPE_LABEL[img.sheetType]}
            </span>
          )}
        </div>
        {img.status === 'error' && img.error && (
          <p className="text-xs text-red-600 leading-snug">{img.error}</p>
        )}
      </div>

      {img.status === 'pending' && (
        <button onClick={() => onTranscribe(img.id)}
          className="w-full py-2.5 text-xs font-semibold bg-navy text-white hover:bg-navy-hover transition border-t border-navy/20">
          Transcribe
        </button>
      )}
      {img.status === 'error' && (
        <button onClick={() => onTranscribe(img.id)}
          className="w-full py-2.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition border-t border-red-500">
          Retry
        </button>
      )}
    </div>
  )
}
