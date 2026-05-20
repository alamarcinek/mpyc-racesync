import { useState, useCallback, useRef, useEffect } from 'react'
import Header from './components/Header'
import TrustSection from './components/TrustSection'
import RaceMetadata from './components/RaceMetadata'
import ImageUpload from './components/ImageUpload'
import ResultsTable from './components/ResultsTable'
import ExportPanel from './components/ExportPanel'

const uid = () => Math.random().toString(36).slice(2, 9)

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function App() {
  const [metadata, setMetadata] = useState({
    raceNumber: '',
    date: new Date().toISOString().slice(0, 10),
    gunTime: '',
    seriesName: '',
  })

  const [images, setImages] = useState([])
  const imagesRef = useRef([])
  useEffect(() => { imagesRef.current = images }, [images])

  // sheetType: 'entry' | 'results'
  const addImages = useCallback((files, sheetType = 'results') => {
    const newImages = Array.from(files).map((file) => ({
      id: uid(),
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
      status: 'pending',
      sheetType,
      results: [],
      error: null,
    }))
    setImages((prev) => [...prev, ...newImages])
  }, [])

  const removeImage = useCallback((id) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id)
      if (img?.preview?.startsWith('blob:')) URL.revokeObjectURL(img.preview)
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  const setImageType = useCallback((id, sheetType) => {
    setImages((prev) => prev.map((i) => (i.id === id ? { ...i, sheetType, results: [], status: 'pending', error: null } : i)))
  }, [])

  const transcribeImage = useCallback(async (imageId) => {
    const image = imagesRef.current.find((i) => i.id === imageId)
    if (!image || image.status === 'processing') return

    setImages((prev) =>
      prev.map((i) => (i.id === imageId ? { ...i, status: 'processing', error: null } : i)),
    )

    try {
      const base64 = await fileToBase64(image.file)
      const mediaType = image.file.type || 'image/jpeg'

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType, sheetType: image.sheetType }),
      })

      const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }))
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)

      const results = (data.results || []).map((r) => ({ id: uid(), ...r }))
      setImages((prev) =>
        prev.map((i) => (i.id === imageId ? { ...i, status: 'done', results } : i)),
      )
    } catch (err) {
      setImages((prev) =>
        prev.map((i) => (i.id === imageId ? { ...i, status: 'error', error: err.message } : i)),
      )
    }
  }, [])

  const transcribeAll = useCallback(() => {
    imagesRef.current
      .filter((i) => i.status === 'pending')
      .forEach((i) => transcribeImage(i.id))
  }, [transcribeImage])

  const updateResults = useCallback((imageId, results) => {
    setImages((prev) => prev.map((i) => (i.id === imageId ? { ...i, results } : i)))
  }, [])

  const processedImages = images.filter((i) => i.status === 'done' || i.status === 'error')

  // Separate entry form rows and race results rows for the export panel
  const entryResults = images
    .filter((i) => i.sheetType === 'entry' && i.status === 'done')
    .flatMap((i) => i.results)
  const raceResults = images
    .filter((i) => i.sheetType === 'results' && i.status === 'done')
    .flatMap((i) => i.results)

  const hasAnything = entryResults.length > 0 || raceResults.length > 0

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-16">
        <TrustSection />
        <RaceMetadata metadata={metadata} onChange={setMetadata} />
        <ImageUpload
          images={images}
          onAdd={addImages}
          onRemove={removeImage}
          onSetType={setImageType}
          onTranscribe={transcribeImage}
          onTranscribeAll={transcribeAll}
        />

        {processedImages.length > 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-navy">
              Verify{' '}
              <span className="text-slate-400 font-normal text-base">
                — check against the photo, edit any mistakes
              </span>
            </h2>
            {processedImages.map((img) => (
              <ResultsTable
                key={img.id}
                image={img}
                results={img.results}
                metadata={metadata}
                onResultsChange={(results) => updateResults(img.id, results)}
              />
            ))}
          </div>
        )}

        {hasAnything && (
          <ExportPanel
            entryResults={entryResults}
            raceResults={raceResults}
            metadata={metadata}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-sm text-slate-500 text-center">
          MPYC RaceSync · Free for Mount Pleasant Yacht Club members ·{' '}
          <a
            href="https://github.com/alamarcinek/mpyc-racesync"
            target="_blank"
            rel="noreferrer"
            className="text-navy hover:underline font-medium"
          >
            Open source on GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
