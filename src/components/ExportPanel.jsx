import { useState } from 'react'
import { DownloadIcon } from './icons'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const strip = (v) => String(v ?? '').replace(/\s*\[\?\]/g, '').trim()

const csvField = (v) => {
  const s = strip(v)
  return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s
}

// ─── CSV generators ────────────────────────────────────────────────────────────

function csvHeader(metadata, label) {
  const date = metadata.date || new Date().toISOString().slice(0, 10)
  const event = [metadata.seriesName, metadata.raceNumber ? `Race ${metadata.raceNumber}` : ''].filter(Boolean).join(' · ') || 'MPYC'
  return [
    `; MPYC Race Results (${label})`,
    `; Event: ${event}`,
    `; Date: ${date}`,
    `; Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} by MPYC RaceSync`,
  ]
}

// races = [{ raceno, rows }] — already computed sequentially in App.jsx
function buildResultsCSV(races, metadata) {
  const lines = [...csvHeader(metadata, 'Elapsed time'), 'raceno,sailno,elapsed,code']
  for (const race of races) {
    for (const r of race.rows) {
      const sn = csvField(r.sailno)
      if (!sn) continue
      const code = strip(r.code || '')
      const elapsed = code ? '' : strip(r.finish_time || '')
      lines.push(`${race.raceno},${sn},${elapsed},${code}`)
    }
  }
  return lines.join('\n')
}

// races = [{ raceno, startTime, rows }]
function buildWallClockCSV(races, metadata) {
  const lines = [
    ...csvHeader(metadata, 'Wall clock time'),
    '; start = race start time  ·  finish = competitor finish time  (HH:MM or HH:MM:SS)',
    'raceno,sailno,start,finish,code',
  ]
  for (const race of races) {
    for (const r of race.rows) {
      const sn = csvField(r.sailno)
      if (!sn) continue
      const code = strip(r.code || '')
      const finish = code ? '' : strip(r.finish_time || '')
      const start = strip(race.startTime || '')
      lines.push(`${race.raceno},${sn},${start},${finish},${code}`)
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

function validate(races, resultType) {
  const warnings = []
  const allRows = races.flatMap((race) => race.rows)
  const bothTimeAndCode = allRows.filter((r) => strip(r.finish_time) && strip(r.code))
  if (bothTimeAndCode.length > 0) {
    warnings.push(
      `${bothTimeAndCode.length} row${bothTimeAndCode.length > 1 ? 's have' : ' has'} both a finishing time and a code (e.g. DNF). ` +
      `Sailwave expects one or the other. Sail numbers: ${bothTimeAndCode.map((r) => strip(r.sailno)).join(', ')}.`
    )
  }
  if (resultType === 'wallclock') {
    const racesWithResults = races.filter((r) => r.rows.some((row) => strip(row.sailno)))
    const racesWithoutStart = racesWithResults.filter((r) => !strip(r.startTime))
    if (racesWithoutStart.length > 0) {
      warnings.push(
        `Race${racesWithoutStart.length > 1 ? 's' : ''} ${racesWithoutStart.map((r) => r.raceno).join(', ')} ` +
        `${racesWithoutStart.length > 1 ? 'are' : 'is'} missing a start time. ` +
        `Enter the start time in the results table${racesWithoutStart.length > 1 ? 's' : ''} above.`
      )
    }
  }
  return warnings
}

// ─── Component ─────────────────────────────────────────────────────────────────

// races = [{ raceno, startTime, rows }] from App.jsx computeRaces()
export default function ExportPanel({ races, entryResults, metadata, resultType }) {
  const [showResultsPreview, setShowResultsPreview] = useState(false)
  const [showCompetitorsPreview, setShowCompetitorsPreview] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  const isWallClock = resultType === 'wallclock'
  const date = metadata.date || new Date().toISOString().slice(0, 10)
  const allRaceRows = races.flatMap((r) => r.rows)

  const raceLabel = races.length > 1
    ? `Race${races[0].raceno}-${races[races.length - 1].raceno}`
    : races.length === 1 ? `Race${races[0].raceno}` : 'Races'
  const resultsFile = `MPYC_${raceLabel}_Results_${date}.csv`
  const competitorsFile = `MPYC_Competitors_${date}.csv`

  const resultsCSV = isWallClock ? buildWallClockCSV(races, metadata) : buildResultsCSV(races, metadata)
  const competitorsCSV = buildCompetitorsCSV(entryResults, allRaceRows, metadata)

  const warnings = validate(races, resultType)

  const uniqueBoats = new Set(allRaceRows.map((r) => strip(r.sailno)).filter(Boolean)).size

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
      {races.length > 0 && (
        <div className="bg-navy-light border border-navy-border rounded-xl px-4 py-3 text-sm">
          <p className="font-semibold text-navy mb-1.5">Race numbers in Results CSV</p>
          <div className="space-y-1 text-slate-600 text-sm">
            {races.map((race) => (
              <p key={race.raceno}>
                Race {race.raceno}:{' '}
                <span className="text-slate-400 text-xs">
                  {race.rows.filter((r) => strip(r.sailno)).length} results
                  {' · '}{race.imageName}
                </span>
              </p>
            ))}
          </div>
          {!metadata.raceNumber && (
            <p className="text-amber-600 mt-2 text-xs font-medium">↑ Set Race Number above to control the starting number.</p>
          )}
        </div>
      )}

      {/* Results CSV */}
      {races.length > 0 && (
        <ExportSection
          title="Results CSV"
          subtitle={`${allRaceRows.filter((r) => strip(r.sailno)).length} results · ${races.length} race${races.length > 1 ? 's' : ''}`}
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
            {isWallClock && (
              <p className="text-slate-600">
                In Sailwave's import wizard, map the <code className="bg-slate-100 px-1 rounded">start</code> column to <strong>Start time</strong> and <code className="bg-slate-100 px-1 rounded">finish</code> to <strong>Finish time</strong>.
              </p>
            )}
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
