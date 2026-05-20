import { useState, useCallback, useRef, useEffect } from 'react'
import Header from './components/Header'
import TrustSection from './components/TrustSection'
import RaceMetadata from './components/RaceMetadata'
import ImageUpload from './components/ImageUpload'
import RaceTable from './components/ResultsTable'
import ExportPanel from './components/ExportPanel'

const uid = () => Math.random().toString(36).slice(2, 9)

const normaliseSailNo = (v) => String(v ?? '').replace(/\s+/g, '').trim()

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Compute sequential race list across all result images
function computeRaces(images, baseRaceNo) {
  const races = []
  let next = baseRaceNo
  for (const img of images.filter((i) => i.sheetType === 'results' && i.status === 'done')) {
    const bySection = {}
    for (const row of img.results) {
      const s = parseInt(row.race_section, 10) || 1
      ;(bySection[s] = bySection[s] || []).push(row)
    }
    for (const s of Object.keys(bySection).map(Number).sort()) {
      races.push({ raceno: next++, imageId: img.id, imageName: img.name, section: s, rows: bySection[s] })
    }
  }
  return races
}

export default function App() {
  const [metadata, setMetadata] = useState({
    raceNumber: '',
    date: new Date().toISOString().slice(0, 10),
    gunTime: '',
    seriesName: '',
  })
  const [images, setImages] = useState([])
  const [toast, setToast] = useState(null)
  const imagesRef = useRef([])
  useEffect(() => { imagesRef.current = images }, [images])

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  const addImages = useCallback((files) => {
    const newImages = Array.from(files).map((file) => ({
      id: uid(), file, name: file.name,
      preview: URL.createObjectURL(file),
      status: 'pending', sheetType: null, results: [], error: null,
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

  const transcribeImage = useCallback(async (imageId) => {
    const image = imagesRef.current.find((i) => i.id === imageId)
    if (!image || image.status === 'processing') return

    setImages((prev) => prev.map((i) => (i.id === imageId ? { ...i, status: 'processing', error: null } : i)))

    try {
      const base64 = await fileToBase64(image.file)
      const mediaType = image.file.type || 'image/jpeg'

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType }),
      })

      const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }))
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)

      // Normalise sail numbers and track how many changed
      let normCount = 0
      const results = (data.results || []).map((r) => {
        const raw = String(r.sailno || '')
        const norm = normaliseSailNo(raw)
        if (norm !== raw && raw.trim()) normCount++
        return { id: uid(), ...r, sailno: norm }
      })

      if (normCount > 0) {
        showToast(`${normCount} sail number${normCount > 1 ? 's' : ''} normalised (spaces removed)`)
      }

      setImages((prev) =>
        prev.map((i) => (i.id === imageId ? { ...i, status: 'done', sheetType: data.sheetType || 'results', results } : i)),
      )
    } catch (err) {
      setImages((prev) => prev.map((i) => (i.id === imageId ? { ...i, status: 'error', error: err.message } : i)))
    }
  }, [showToast])

  const transcribeAll = useCallback(() => {
    imagesRef.current.filter((i) => i.status === 'pending').forEach((i) => transcribeImage(i.id))
  }, [transcribeImage])

  // Update a specific race section's rows back into the source image
  const updateRace = useCallback((imageId, section, newRows) => {
    setImages((prev) => prev.map((img) => {
      if (img.id !== imageId) return img
      const otherRows = img.results.filter((r) => (parseInt(r.race_section, 10) || 1) !== section)
      return { ...img, results: [...otherRows, ...newRows] }
    }))
  }, [])

  // Update entry form results
  const updateEntryResults = useCallback((imageId, results) => {
    setImages((prev) => prev.map((i) => (i.id === imageId ? { ...i, results } : i)))
  }, [])

  const baseRaceNo = parseInt(metadata.raceNumber, 10) || 1
  const races = computeRaces(images, baseRaceNo)

  const entryImages = images.filter((i) => i.sheetType === 'entry' && i.status === 'done')
  const entryResults = entryImages.flatMap((i) => i.results)
  const hasAnything = races.length > 0 || entryResults.length > 0

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
          onTranscribe={transcribeImage}
          onTranscribeAll={transcribeAll}
        />

        {(entryImages.length > 0 || races.length > 0) && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-navy">
              Verify{' '}
              <span className="text-slate-400 font-normal text-base">— check against the photo, edit any mistakes</span>
            </h2>

            {/* Entry form tables */}
            {entryImages.map((img) => (
              <RaceTable
                key={img.id}
                sheetType="entry"
                imageName={img.name}
                rows={img.results}
                onRowsChange={(rows) => updateEntryResults(img.id, rows)}
                error={img.status === 'error' ? img.error : null}
              />
            ))}

            {/* Race results tables — one per race, sequential numbering */}
            {races.map((race) => (
              <RaceTable
                key={`${race.imageId}-${race.section}`}
                sheetType="results"
                raceno={race.raceno}
                imageName={race.imageName}
                rows={race.rows}
                onRowsChange={(rows) => updateRace(race.imageId, race.section, rows)}
              />
            ))}
          </div>
        )}

        {hasAnything && (
          <ExportPanel
            races={races}
            entryResults={entryResults}
            metadata={metadata}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-sm text-slate-500 text-center">
          MPYC RaceSync · Free for Mount Pleasant Yacht Club members ·{' '}
          <a href="https://github.com/alamarcinek/mpyc-racesync" target="_blank" rel="noreferrer" className="text-navy hover:underline font-medium">
            Open source on GitHub
          </a>
        </div>
      </footer>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-navy text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl z-50 max-w-xs">
          {toast}
        </div>
      )}
    </div>
  )
}
