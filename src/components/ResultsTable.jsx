const uid = () => Math.random().toString(36).slice(2, 9)
const isUncertain = (v) => String(v ?? '').includes('[?]')

const CODE_OPTIONS = ['', 'DNF', 'DNS', 'OCS', 'DSQ', 'RET']

const EMPTY_RESULTS_ROW = (race_section = 1) => ({
  id: uid(), place: '', sailno: '', finish_time: '', skipper: '', code: '', notes: '', race_section,
})

const EMPTY_ENTRY_ROW = () => ({
  id: uid(), club: '', yacht_name: '', yacht_type: '', sail_size: '', skipper: '', sailno: '',
})

export default function ResultsTable({ image, results, metadata, onResultsChange }) {
  if (image.sheetType === 'entry') {
    return <EntryTable image={image} results={results} onResultsChange={onResultsChange} />
  }
  return <RaceResultsTable image={image} results={results} metadata={metadata} onResultsChange={onResultsChange} />
}

// ─── Entry Form Table ──────────────────────────────────────────────────────────

function EntryTable({ image, results, onResultsChange }) {
  const addRow = () => onResultsChange([...results, EMPTY_ENTRY_ROW()])
  const deleteRow = (id) => onResultsChange(results.filter((r) => r.id !== id))
  const duplicateRow = (id) => {
    const idx = results.findIndex((r) => r.id === id)
    if (idx === -1) return
    const next = [...results]
    next.splice(idx + 1, 0, { ...results[idx], id: uid() })
    onResultsChange(next)
  }
  const updateCell = (id, field, value) =>
    onResultsChange(results.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  const uncertainCount = results.filter((r) => Object.values(r).some(isUncertain)).length

  return (
    <div className="card">
      <TableHeader
        title={image.name}
        badge="Entry Form"
        badgeStyle="bg-purple-100 text-purple-700"
        count={results.length}
        uncertainCount={uncertainCount}
        label="competitor"
        error={image.status === 'error' ? image.error : null}
      />
      {image.status !== 'error' && results.length > 0 && (
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200">
                {['Club', 'Yacht Name', 'Type', 'Sail Size', 'Skipper & Crew', 'Sail No', ''].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 group">
                  <EditCell value={row.club}       onChange={(v) => updateCell(row.id, 'club', v)}       width="w-20" />
                  <EditCell value={row.yacht_name} onChange={(v) => updateCell(row.id, 'yacht_name', v)} width="w-28" />
                  <EditCell value={row.yacht_type} onChange={(v) => updateCell(row.id, 'yacht_type', v)} width="w-24" />
                  <EditCell value={row.sail_size}  onChange={(v) => updateCell(row.id, 'sail_size', v)}  width="w-20" />
                  <EditCell value={row.skipper}    onChange={(v) => updateCell(row.id, 'skipper', v)}    width="w-40" wide />
                  <EditCell value={row.sailno}     onChange={(v) => updateCell(row.id, 'sailno', v)}     width="w-24" />
                  <ActionCell onDuplicate={() => duplicateRow(row.id)} onDelete={() => deleteRow(row.id)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <button onClick={addRow} className="btn-ghost">+ Add Row</button>
      </div>
    </div>
  )
}

// ─── Race Results Table ────────────────────────────────────────────────────────

function RaceResultsTable({ image, results, metadata, onResultsChange }) {
  const baseRace = parseInt(metadata?.raceNumber, 10) || 1

  const deleteRow = (id) => onResultsChange(results.filter((r) => r.id !== id))
  const duplicateRow = (id) => {
    const idx = results.findIndex((r) => r.id === id)
    if (idx === -1) return
    const next = [...results]
    next.splice(idx + 1, 0, { ...results[idx], id: uid() })
    onResultsChange(next)
  }
  const updateCell = (id, field, value) =>
    onResultsChange(results.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  const addRow = (race_section) =>
    onResultsChange([...results, EMPTY_RESULTS_ROW(race_section)])

  const section1 = results.filter((r) => (parseInt(r.race_section, 10) || 1) === 1)
  const section2 = results.filter((r) => parseInt(r.race_section, 10) === 2)
  const hasSection2 = section2.length > 0
  const uncertainCount = results.filter((r) => Object.values(r).some(isUncertain)).length

  return (
    <div className="card space-y-0">
      <TableHeader
        title={image.name}
        badge="Race Results"
        badgeStyle="bg-navy-light text-navy"
        count={results.length}
        uncertainCount={uncertainCount}
        label="result"
        error={image.status === 'error' ? image.error : null}
      />

      {image.status !== 'error' && (
        <div className="space-y-6">
          {/* Race section 1 */}
          <RaceSection
            label={`Race ${baseRace}`}
            rows={section1}
            onUpdate={updateCell}
            onDelete={deleteRow}
            onDuplicate={duplicateRow}
            onAddRow={() => addRow(1)}
          />

          {/* Race section 2 — separate table, no zigzag */}
          {hasSection2 && (
            <>
              <div className="border-t-2 border-slate-200 pt-5">
                <RaceSection
                  label={`Race ${baseRace + 1}`}
                  rows={section2}
                  onUpdate={updateCell}
                  onDelete={deleteRow}
                  onDuplicate={duplicateRow}
                  onAddRow={() => addRow(2)}
                />
              </div>
            </>
          )}

          {!hasSection2 && (
            <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-slate-100">
              <button onClick={() => addRow(2)} className="btn-ghost text-slate-400 text-sm">
                + Add Race {baseRace + 1}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RaceSection({ label, rows, onUpdate, onDelete, onDuplicate, onAddRow }) {
  const uncertainCount = rows.filter((r) => Object.values(r).some(isUncertain)).length

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-bold text-white text-sm px-3 py-1 bg-navy rounded-lg">{label}</span>
        <span className="text-xs text-slate-500">
          {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
          {uncertainCount > 0 && (
            <span className="ml-1.5 text-amber-600 font-medium">
              · {uncertainCount} <span className="bg-yellow-200 text-amber-800 rounded px-1">?</span>
            </span>
          )}
        </span>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200">
                {['Place', 'Sail No', 'Finishing Time', 'Skipper', 'Code', 'Notes', ''].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 group">
                  <EditCell value={row.place}       onChange={(v) => onUpdate(row.id, 'place', v)}       width="w-14" />
                  <EditCell value={row.sailno}      onChange={(v) => onUpdate(row.id, 'sailno', v)}      width="w-28" />
                  <EditCell value={row.finish_time} onChange={(v) => onUpdate(row.id, 'finish_time', v)} width="w-28" placeholder="26:17" />
                  <EditCell value={row.skipper}     onChange={(v) => onUpdate(row.id, 'skipper', v)}     width="w-32" wide />
                  <td className={`px-2 py-1.5 ${isUncertain(row.code) ? 'bg-yellow-50' : ''}`}>
                    <select
                      value={row.code}
                      onChange={(e) => onUpdate(row.id, 'code', e.target.value)}
                      className="w-20 bg-transparent border border-transparent rounded px-1.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-navy/40 focus:bg-white focus:ring-1 focus:ring-navy/30 cursor-pointer"
                    >
                      {CODE_OPTIONS.map((o) => <option key={o} value={o}>{o || '—'}</option>)}
                    </select>
                  </td>
                  <EditCell value={row.notes} onChange={(v) => onUpdate(row.id, 'notes', v)} width="w-36" wide />
                  <ActionCell onDuplicate={() => onDuplicate(row.id)} onDelete={() => onDelete(row.id)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-400 text-sm py-3 text-center border border-dashed border-slate-200 rounded-lg">No entries</p>
      )}

      <div className="mt-3">
        <button onClick={onAddRow} className="btn-ghost text-xs">+ Add Row</button>
      </div>
    </div>
  )
}

// ─── Shared ────────────────────────────────────────────────────────────────────

function TableHeader({ title, badge, badgeStyle, count, uncertainCount, label, error }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-navy text-base truncate max-w-xs sm:max-w-none">{title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeStyle}`}>{badge}</span>
        </div>
        {error ? (
          <p className="text-sm text-red-600 mt-1">{error}</p>
        ) : (
          <p className="text-sm text-slate-500 mt-0.5">
            {count} {label}{count === 1 ? '' : 's'}
            {uncertainCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {uncertainCount} uncertain{' '}
                <span className="bg-yellow-200 text-amber-800 rounded px-1 text-xs">highlighted</span>
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

function EditCell({ value, onChange, width = 'w-24', wide = false, placeholder = '' }) {
  const uncertain = isUncertain(value)
  return (
    <td className={`px-2 py-1.5 ${uncertain ? 'bg-yellow-50' : ''}`}>
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          'bg-transparent border border-transparent rounded px-1.5 py-1.5',
          'focus:outline-none focus:border-navy/40 focus:bg-white focus:ring-1 focus:ring-navy/30',
          'text-sm text-slate-800 placeholder:text-slate-300 transition',
          uncertain ? 'text-amber-700 font-semibold' : '',
          wide ? 'w-full min-w-[8rem]' : width,
        ].join(' ')}
      />
    </td>
  )
}

function ActionCell({ onDuplicate, onDelete }) {
  return (
    <td className="px-2 py-1.5">
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 sm:opacity-100 transition-opacity">
        <button onClick={onDuplicate} title="Duplicate row" aria-label="Duplicate row"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">⊕</button>
        <button onClick={onDelete} title="Delete row" aria-label="Delete row"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition">✕</button>
      </div>
    </td>
  )
}
