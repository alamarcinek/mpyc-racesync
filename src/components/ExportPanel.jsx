import { useState } from 'react'
import { DownloadIcon } from './icons'

function generateCompetitorsCSV(results, metadata) {
  const date = metadata.date || new Date().toISOString().slice(0, 10)
  const race = metadata.raceNumber || '?'
  const series = metadata.seriesName ? ` — ${metadata.seriesName}` : ''

  const lines = [
    '; MPYC RaceSync Export',
    `; Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    `; Race ${race}${series} · ${date}`,
    '; Mount Pleasant Yacht Club',
    'SailNo,HelmName,Class,Club',
  ]

  const seen = new Set()
  for (const r of results) {
    const sn = (r.sailno || '').trim()
    if (sn && !seen.has(sn)) {
      seen.add(sn)
      lines.push(`${sn},,,`)
    }
  }
  return lines.join('\n')
}

function generateResultsCSV(results, metadata) {
  const date = metadata.date || new Date().toISOString().slice(0, 10)
  const race = metadata.raceNumber || '1'
  const series = metadata.seriesName ? ` — ${metadata.seriesName}` : ''

  const lines = [
    '; MPYC RaceSync Export',
    `; Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    `; Race ${race}${series} · ${date}`,
    `; Gun Start: ${metadata.gunTime || 'not recorded'}`,
    '; Mount Pleasant Yacht Club',
    'raceno,sailno,elapsed,code',
  ]

  for (const r of results) {
    const sn = (r.sailno || '').trim()
    if (!sn) continue
    const code = (r.code || '').trim()
    const elapsed = code ? '' : (r.finish_time || '').trim()
    lines.push(`${race},${sn},${elapsed},${code}`)
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

export default function ExportPanel({ results, metadata }) {
  const [preview, setPreview] = useState(null)

  const race = metadata.raceNumber || 'race'
  const date = metadata.date || new Date().toISOString().slice(0, 10)
  const competitorsFile = `competitors-race${race}-${date}.csv`
  const resultsFile = `results-race${race}-${date}.csv`

  const competitorsCSV = generateCompetitorsCSV(results, metadata)
  const resultsCSV = generateResultsCSV(results, metadata)

  const downloadBoth = () => {
    downloadCSV(competitorsCSV, competitorsFile)
    setTimeout(() => downloadCSV(resultsCSV, resultsFile), 400)
  }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="section-title mb-1">Export to Sailwave</h2>
        <p className="text-sm text-slate-500">
          Download both files below, then import into Sailwave via{' '}
          <span className="font-medium text-slate-700">File &rarr; Import &rarr; Import results from CSV</span>.
          Import Competitors first, then Results.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <ExportCard
          title="Competitors CSV"
          subtitle={`${new Set(results.map((r) => r.sailno).filter(Boolean)).size} unique boats`}
          description="Import this first in Sailwave to register all boats."
          filename={competitorsFile}
          onPreview={() => setPreview({ title: 'Competitors CSV', content: competitorsCSV })}
          onDownload={() => downloadCSV(competitorsCSV, competitorsFile)}
        />
        <ExportCard
          title="Results CSV"
          subtitle={`${results.filter((r) => r.sailno).length} results`}
          description="Contains finishing times and race codes for this race."
          filename={resultsFile}
          onPreview={() => setPreview({ title: 'Results CSV', content: resultsCSV })}
          onDownload={() => downloadCSV(resultsCSV, resultsFile)}
        />
      </div>

      <button onClick={downloadBoth} className="btn-primary">
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

function ExportCard({ title, subtitle, description, filename, onPreview, onDownload }) {
  return (
    <div className="border-2 border-slate-200 rounded-xl p-4 space-y-3 hover:border-navy/30 transition">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
            {subtitle}
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        <p className="text-xs text-slate-400 font-mono mt-1 truncate">{filename}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onPreview} className="btn-secondary text-sm px-4 py-2 min-h-[40px]">
          Preview
        </button>
        <button onClick={onDownload} className="btn-primary text-sm px-4 py-2 min-h-[40px]">
          Download
        </button>
      </div>
    </div>
  )
}
