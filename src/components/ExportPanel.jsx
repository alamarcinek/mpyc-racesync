import { useState } from 'react'
import { DownloadIcon } from './icons'

// ─── CSV generators ────────────────────────────────────────────────────────────

function generateCompetitorsCSV(entryResults, raceResults, metadata) {
  const date = metadata.date || new Date().toISOString().slice(0, 10)
  const race = metadata.raceNumber || '?'
  const series = metadata.seriesName ? ` — ${metadata.seriesName}` : ''
  const source = entryResults.length > 0 ? 'entry form' : 'race results (no entry form uploaded)'

  const lines = [
    '; MPYC RaceSync Export',
    `; Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    `; Race ${race}${series} · ${date}`,
    `; Competitors source: ${source}`,
    '; Mount Pleasant Yacht Club',
    'SailNo,HelmName,Class,Club',
  ]

  if (entryResults.length > 0) {
    // Use rich entry form data
    for (const r of entryResults) {
      const sn = (r.sailno || '').trim()
      if (!sn) continue
      const helm = (r.skipper || '').replace(/,/g, ' ')
      const cls = (r.yacht_type || '').replace(/,/g, ' ')
      const club = (r.club || '').replace(/,/g, ' ')
      lines.push(`${sn},${helm},${cls},${club}`)
    }
  } else {
    // Fallback: unique sail numbers from race results
    const seen = new Set()
    for (const r of raceResults) {
      const sn = (r.sailno || '').trim()
      if (sn && !seen.has(sn)) {
        seen.add(sn)
        lines.push(`${sn},,,`)
      }
    }
  }

  return lines.join('\n')
}

function generateResultsCSV(raceResults, metadata) {
  const date = metadata.date || new Date().toISOString().slice(0, 10)
  const baseRace = parseInt(metadata.raceNumber, 10) || 1
  const series = metadata.seriesName ? ` — ${metadata.seriesName}` : ''

  const lines = [
    '; MPYC RaceSync Export',
    `; Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    `; Starting race: ${baseRace}${series} · ${date}`,
    `; Gun Start: ${metadata.gunTime || 'not recorded'}`,
    `; race_section 1 → raceno ${baseRace} · race_section 2 → raceno ${baseRace + 1}`,
    '; Mount Pleasant Yacht Club',
    'raceno,sailno,elapsed,code',
  ]

  for (const r of raceResults) {
    const sn = (r.sailno || '').trim()
    if (!sn) continue
    const section = parseInt(r.race_section, 10) || 1
    const raceno = baseRace + (section - 1)
    const code = (r.code || '').trim()
    const elapsed = code ? '' : (r.finish_time || '').trim()
    lines.push(`${raceno},${sn},${elapsed},${code}`)
  }

  return lines.join('\n')
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ExportPanel({ entryResults, raceResults, metadata }) {
  const [preview, setPreview] = useState(null)

  const baseRace = parseInt(metadata.raceNumber, 10) || 1
  const date = metadata.date || new Date().toISOString().slice(0, 10)
  const competitorsFile = `competitors-race${baseRace}-${date}.csv`
  const resultsFile = `results-race${baseRace}-${date}.csv`

  const competitorsCSV = generateCompetitorsCSV(entryResults, raceResults, metadata)
  const resultsCSV = generateResultsCSV(raceResults, metadata)

  const hasSection2 = raceResults.some((r) => parseInt(r.race_section, 10) === 2)
  const section1Count = raceResults.filter((r) => (parseInt(r.race_section, 10) || 1) === 1 && r.sailno).length
  const section2Count = raceResults.filter((r) => parseInt(r.race_section, 10) === 2 && r.sailno).length
  const uniqueBoats = new Set(raceResults.map((r) => r.sailno).filter(Boolean)).size

  const downloadBoth = () => {
    downloadCSV(competitorsCSV, competitorsFile)
    setTimeout(() => downloadCSV(resultsCSV, resultsFile), 400)
  }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="section-title mb-1">Export to Sailwave</h2>
        <p className="text-sm text-slate-500">
          Import Competitors first, then Results — via{' '}
          <span className="font-medium text-slate-700">File → Import → Import results from CSV</span>.
        </p>
      </div>

      {/* Race number mapping */}
      {raceResults.length > 0 && (
        <div className="bg-navy-light border border-navy-border rounded-xl px-4 py-3 text-sm">
          <p className="font-semibold text-navy mb-2">Race numbering in Results CSV</p>
          <div className="space-y-1 text-slate-600">
            <p>
              <span className="font-medium">Race section 1</span>
              {' → '}
              <span className="font-mono font-semibold text-navy">raceno {baseRace}</span>
              <span className="text-slate-400 ml-1.5 text-xs">· {section1Count} results</span>
            </p>
            {hasSection2 ? (
              <p>
                <span className="font-medium">Race section 2</span>
                {' → '}
                <span className="font-mono font-semibold text-navy">raceno {baseRace + 1}</span>
                <span className="text-slate-400 ml-1.5 text-xs">· {section2Count} results</span>
              </p>
            ) : (
              <p className="text-slate-400 italic text-xs">No second race section detected on these sheets.</p>
            )}
          </div>
          {!metadata.raceNumber && (
            <p className="text-amber-600 mt-2 text-xs font-medium">
              ↑ Set a Race Number in the Race Details above to control the starting race number.
            </p>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <ExportCard
          title="Competitors CSV"
          subtitle={
            entryResults.length > 0
              ? `${entryResults.length} from entry form`
              : `${uniqueBoats} sail numbers from results`
          }
          description={
            entryResults.length > 0
              ? 'Built from your entry form — includes names, class, club.'
              : 'No entry form uploaded — sail numbers only.'
          }
          filename={competitorsFile}
          onPreview={() => setPreview({ title: 'Competitors CSV', content: competitorsCSV })}
          onDownload={() => downloadCSV(competitorsCSV, competitorsFile)}
        />
        <ExportCard
          title="Results CSV"
          subtitle={`${raceResults.filter((r) => r.sailno).length} results${hasSection2 ? ` · ${2} races` : ''}`}
          description={
            hasSection2
              ? `Races ${baseRace} and ${baseRace + 1} combined in one file.`
              : `Race ${baseRace} results.`
          }
          filename={resultsFile}
          onPreview={() => setPreview({ title: 'Results CSV', content: resultsCSV })}
          onDownload={() => downloadCSV(resultsCSV, resultsFile)}
          disabled={raceResults.length === 0}
        />
      </div>

      <button onClick={downloadBoth} disabled={raceResults.length === 0} className="btn-primary">
        <DownloadIcon className="w-5 h-5" />
        Download Both CSVs
      </button>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
              <h3 className="font-semibold text-navy">{preview.title}</h3>
              <button
                onClick={() => setPreview(null)}
                aria-label="Close preview"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-lg font-bold"
              >
                ×
              </button>
            </div>
            <pre className="p-5 overflow-auto text-xs text-slate-700 font-mono flex-1 bg-slate-50 leading-relaxed whitespace-pre-wrap break-all">
              {preview.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function ExportCard({ title, subtitle, description, filename, onPreview, onDownload, disabled }) {
  return (
    <div className={`border-2 rounded-xl p-4 space-y-3 transition ${disabled ? 'border-slate-100 opacity-50' : 'border-slate-200 hover:border-navy/30'}`}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 shrink-0">
            {subtitle}
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        <p className="text-xs text-slate-400 font-mono mt-1 truncate">{filename}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onPreview} disabled={disabled} className="btn-secondary text-sm px-4 py-2 min-h-[40px]">
          Preview
        </button>
        <button onClick={onDownload} disabled={disabled} className="btn-primary text-sm px-4 py-2 min-h-[40px]">
          Download
        </button>
      </div>
    </div>
  )
}
