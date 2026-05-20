import { useState } from 'react'
import { DownloadIcon } from './icons'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const strip = (v) => String(v ?? '').replace(/\s*\[\?\]/g, '').trim()

const csvField = (v) => {
  const s = strip(v)
  return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s
}

// ─── CSV generators ────────────────────────────────────────────────────────────

function buildResultsCSV(raceResults, metadata) {
  const date = metadata.date || new Date().toISOString().slice(0, 10)
  const baseRace = parseInt(metadata.raceNumber, 10) || 1
  const event = [metadata.seriesName, metadata.raceNumber ? `Race ${metadata.raceNumber}` : ''].filter(Boolean).join(' · ') || 'MPYC'

  const lines = [
    `; MPYC Race Results`,
    `; Event: ${event}`,
    `; Date: ${date}`,
    `; Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} by MPYC RaceSync`,
    `raceno,sailno,elapsed,code`,
  ]

  // Group rows by race_section, output each as a labelled block
  const sections = {}
  for (const r of raceResults) {
    const s = parseInt(r.race_section, 10) || 1
    ;(sections[s] = sections[s] || []).push(r)
  }

  for (const s of Object.keys(sections).map(Number).sort()) {
    const raceno = baseRace + (s - 1)
    lines.push(`; ---- Race ${raceno} ----`)
    for (const r of sections[s]) {
      const sn = csvField(r.sailno)
      if (!sn) continue
      const code = strip(r.code || '')
      const elapsed = code ? '' : strip(r.finish_time || '')
      lines.push(`${raceno},${sn},${elapsed},${code}`)
    }
  }

  return lines.join('\n')
}

function buildCompetitorsCSV(entryResults, raceResults, metadata) {
  const date = metadata.date || new Date().toISOString().slice(0, 10)
  const event = metadata.seriesName || 'MPYC'

  const lines = [
    `; MPYC Competitor List`,
    `; Event: ${event}`,
    `; Date: ${date}`,
    `; Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} by MPYC RaceSync`,
    `SailNo,HelmName,Class,Club`,
  ]

  if (entryResults.length > 0) {
    for (const r of entryResults) {
      const sn = csvField(r.sailno)
      if (!sn) continue
      lines.push(`${sn},${csvField(r.skipper)},${csvField(r.yacht_type)},${csvField(r.club)}`)
    }
  } else {
    const seen = new Set()
    for (const r of raceResults) {
      const sn = csvField(r.sailno)
      if (sn && !seen.has(sn)) {
        seen.add(sn)
        lines.push(`${sn},,,`)
      }
    }
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

// ─── Validation ────────────────────────────────────────────────────────────────

function validate(raceResults) {
  const warnings = []
  const bothTimeAndCode = raceResults.filter((r) => strip(r.finish_time) && strip(r.code))
  if (bothTimeAndCode.length > 0) {
    warnings.push(
      `${bothTimeAndCode.length} row${bothTimeAndCode.length > 1 ? 's have' : ' has'} both a finishing time and a code (e.g. DNF). ` +
      `Sailwave expects one or the other. Sail numbers: ${bothTimeAndCode.map((r) => strip(r.sailno)).join(', ')}.`
    )
  }
  return warnings
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ExportPanel({ entryResults, raceResults, metadata }) {
  const [showResultsPreview, setShowResultsPreview] = useState(false)
  const [showCompetitorsPreview, setShowCompetitorsPreview] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  const baseRace = parseInt(metadata.raceNumber, 10) || 1
  const date = metadata.date || new Date().toISOString().slice(0, 10)

  const hasSection2 = raceResults.some((r) => parseInt(r.race_section, 10) === 2)
  const raceLabel = hasSection2 ? `Race${baseRace}-${baseRace + 1}` : `Race${baseRace}`
  const resultsFile = `MPYC_${raceLabel}_Results_${date}.csv`
  const competitorsFile = `MPYC_Competitors_${date}.csv`

  const resultsCSV = buildResultsCSV(raceResults, metadata)
  const competitorsCSV = buildCompetitorsCSV(entryResults, raceResults, metadata)

  const warnings = validate(raceResults)

  const uniqueBoats = new Set(raceResults.map((r) => strip(r.sailno)).filter(Boolean)).size
  const s1Count = raceResults.filter((r) => (parseInt(r.race_section, 10) || 1) === 1 && strip(r.sailno)).length
  const s2Count = raceResults.filter((r) => parseInt(r.race_section, 10) === 2 && strip(r.sailno)).length

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="section-title mb-1">Export to Sailwave</h2>
        <p className="text-sm text-slate-500">
          Import <strong>Competitors</strong> first, then <strong>Results</strong> — both via{' '}
          <span className="font-medium text-slate-700">File → Import</span> in Sailwave.
        </p>
      </div>

      {/* Validation warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
          <p className="text-sm font-semibold text-amber-800">⚠ Data inconsistencies</p>
          {warnings.map((w, i) => (
            <p key={i} className="text-sm text-amber-700">{w}</p>
          ))}
          <p className="text-xs text-amber-600 mt-1">Fix these in the tables above before exporting.</p>
        </div>
      )}

      {/* Race numbering info */}
      {raceResults.length > 0 && (
        <div className="bg-navy-light border border-navy-border rounded-xl px-4 py-3 text-sm">
          <p className="font-semibold text-navy mb-1.5">Race numbers in Results CSV</p>
          <div className="space-y-1 text-slate-600 text-sm">
            <p>Race {baseRace}: <span className="text-slate-400 text-xs">{s1Count} results</span></p>
            {hasSection2
              ? <p>Race {baseRace + 1}: <span className="text-slate-400 text-xs">{s2Count} results</span></p>
              : <p className="text-slate-400 italic text-xs">No second race detected on these sheets.</p>
            }
          </div>
          {!metadata.raceNumber && (
            <p className="text-amber-600 mt-2 text-xs font-medium">↑ Set Race Number above to control the starting number.</p>
          )}
        </div>
      )}

      {/* Results CSV */}
      {raceResults.length > 0 && (
        <ExportSection
          title="Results CSV"
          subtitle={`${raceResults.filter((r) => strip(r.sailno)).length} results · ${hasSection2 ? `Races ${baseRace} & ${baseRace + 1}` : `Race ${baseRace}`}`}
          filename={resultsFile}
          csv={resultsCSV}
          showPreview={showResultsPreview}
          onTogglePreview={() => setShowResultsPreview((v) => !v)}
          onDownload={() => downloadCSV(resultsCSV, resultsFile)}
        />
      )}

      {/* Competitors CSV */}
      <ExportSection
        title="Competitors CSV"
        subtitle={
          entryResults.length > 0
            ? `${entryResults.length} from entry form`
            : `${uniqueBoats} sail numbers from results`
        }
        filename={competitorsFile}
        csv={competitorsCSV}
        showPreview={showCompetitorsPreview}
        onTogglePreview={() => setShowCompetitorsPreview((v) => !v)}
        onDownload={() => downloadCSV(competitorsCSV, competitorsFile)}
        note={entryResults.length === 0 ? 'No entry form uploaded — helm names and class left blank.' : null}
      />

      {/* Sailwave instructions */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowInstructions((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition text-left"
        >
          <span>How to import into Sailwave</span>
          <span className="text-slate-400 text-base">{showInstructions ? '▲' : '▼'}</span>
        </button>
        {showInstructions && (
          <div className="px-4 pb-4 text-sm text-slate-600 space-y-2 border-t border-slate-100 pt-3">
            <p className="font-medium text-slate-700">Step 1 — Import competitors</p>
            <p>In Sailwave: <span className="font-mono bg-slate-100 px-1 rounded">File → Import Competitor List</span> → select <code className="bg-slate-100 px-1 rounded">{competitorsFile}</code></p>
            <p className="font-medium text-slate-700 pt-1">Step 2 — Import results</p>
            <p>In Sailwave: <span className="font-mono bg-slate-100 px-1 rounded">File → Import Race Results</span> → select <code className="bg-slate-100 px-1 rounded">{resultsFile}</code></p>
            <p className="text-slate-500 text-xs pt-1">Sailwave will match results to competitors by sail number. Check the scoring view after import.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ExportSection({ title, subtitle, filename, csv, showPreview, onTogglePreview, onDownload, note }) {
  return (
    <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800">{title}</span>
            <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{subtitle}</span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{filename}</p>
          {note && <p className="text-xs text-amber-600 mt-0.5">{note}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={onTogglePreview} className="btn-secondary text-sm px-3 py-2 min-h-[40px]">
            {showPreview ? 'Hide' : 'Preview'}
          </button>
          <button onClick={onDownload} className="btn-primary text-sm px-3 py-2 min-h-[40px]">
            <DownloadIcon className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
      {showPreview && (
        <pre className="border-t border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 font-mono overflow-auto max-h-64 leading-relaxed whitespace-pre">
          {csv}
        </pre>
      )}
    </div>
  )
}
