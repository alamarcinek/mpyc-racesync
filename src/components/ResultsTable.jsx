const uid = () => Math.random().toString(36).slice(2, 9)
const isUncertain = (v) => String(v ?? '').includes('[?]')
const CODE_OPTIONS = ['', 'DNF', 'DNS', 'OCS', 'DSQ', 'RET']

const EMPTY_RESULTS_ROW = () => ({ id: uid(), place: '', sailno: '', finish_time: '', skipper: '', code: '', notes: '', race_section: 1 })
const EMPTY_ENTRY_ROW = () => ({ id: uid(), club: '', yacht_name: '', yacht_type: '', sail_size: '', skipper: '', sailno: '' })

// Single export: handles both entry and results based on sheetType prop
export default function RaceTable({ sheetType, raceno, imageName, rows, onRowsChange, error }) {
  if (sheetType === 'entry') {
    return <EntryTable imageName={imageName} rows={rows} onRowsChange={onRowsChange} error={error} />
  }
  return <ResultsTable raceno={raceno} imageName={imageName} rows={rows} onRowsChange={onRowsChange} />
}

// ─── Race Results Table ────────────────────────────────────────────────────────

function ResultsTable({ raceno, imageName, rows, onRowsChange }) {
  const addRow = () => onRowsChange([...rows, EMPTY_RESULTS_ROW()])

  const deleteRow = (id) => onRowsChange(rows.filter((r) => r.id !== id))

  const duplicateRow = (id) => {
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) return
    const next = [...rows]
    next.splice(idx + 1, 0, { ...rows[idx], id: uid() })
    onRowsChange(next)
  }

  const updateCell = (id, field, value) => {
    onRowsChange(rows.map((r) => {
      if (r.id !== id) return r
      const updated = { ...r, [field]: value }
      // Code set → clear finish_time; finish_time set → clear code
      if (field === 'code' && value) updated.finish_time = ''
      if (field === 'finish_time' && value) updated.code = ''
      return updated
    }))
  }

  const uncertainCount = rows.filter((r) => Object.values(r).some(isUncertain)).length

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-sm px-3 py-1 bg-navy rounded-lg">Race {raceno}</span>
            <span className="text-xs text-slate-400 font-mono truncate max-w-[180px] sm:max-w-none" title={imageName}>
              {imageName}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
            {uncertainCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {uncertainCount} uncertain{' '}
                <span className="bg-yellow-200 text-amber-800 rounded px-1 text-xs">highlighted</span>
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-5 sm:-mx-6">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-200">
              {['Place', 'Sail No', 'Finishing Time', 'Skipper', 'Code', 'Notes', ''].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-400 text-sm">No entries</td>
              </tr>
            ) : (
              rows.map((row) => {
                const hasCode = Boolean((row.code || '').trim())
                return (
                  <tr key={row.id} className="hover:bg-slate-50/70 group">
                    <EditCell value={row.place}   onChange={(v) => updateCell(row.id, 'place', v)}   width="w-14" />
                    <EditCell value={row.sailno}  onChange={(v) => updateCell(row.id, 'sailno', v)}  width="w-28" />
                    {/* Finish time — disabled when code is set */}
                    <td className={`px-2 py-1.5 ${isUncertain(row.finish_time) ? 'bg-yellow-50' : hasCode ? 'bg-slate-50' : ''}`}>
                      <input
                        value={hasCode ? '' : (row.finish_time ?? '')}
                        onChange={(e) => updateCell(row.id, 'finish_time', e.target.value)}
                        disabled={hasCode}
                        placeholder={hasCode ? '—' : '26:17'}
                        className={[
                          'w-28 bg-transparent border border-transparent rounded px-1.5 py-1.5',
                          'focus:outline-none focus:border-navy/40 focus:bg-white focus:ring-1 focus:ring-navy/30',
                          'text-sm placeholder:text-slate-300 transition',
                          hasCode ? 'opacity-30 cursor-not-allowed' : 'text-slate-800',
                          isUncertain(row.finish_time) ? 'text-amber-700 font-semibold' : '',
                        ].join(' ')}
                      />
                    </td>
                    <EditCell value={row.skipper} onChange={(v) => updateCell(row.id, 'skipper', v)} width="w-32" wide />
                    {/* Code dropdown */}
                    <td className={`px-2 py-1.5 ${isUncertain(row.code) ? 'bg-yellow-50' : ''}`}>
                      <select
                        value={row.code}
                        onChange={(e) => updateCell(row.id, 'code', e.target.value)}
                        className="w-20 bg-transparent border border-transparent rounded px-1.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-navy/40 focus:bg-white focus:ring-1 focus:ring-navy/30 cursor-pointer"
                      >
                        {CODE_OPTIONS.map((o) => <option key={o} value={o}>{o || '—'}</option>)}
                      </select>
                    </td>
                    <EditCell value={row.notes}   onChange={(v) => updateCell(row.id, 'notes', v)}   width="w-36" wide />
                    <ActionCell onDuplicate={() => duplicateRow(row.id)} onDelete={() => deleteRow(row.id)} />
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <button onClick={addRow} className="btn-ghost">+ Add Row</button>
      </div>
    </div>
  )
}

// ─── Entry Form Table ──────────────────────────────────────────────────────────

function EntryTable({ imageName, rows, onRowsChange, error }) {
  const addRow = () => onRowsChange([...rows, EMPTY_ENTRY_ROW()])
  const deleteRow = (id) => onRowsChange(rows.filter((r) => r.id !== id))
  const duplicateRow = (id) => {
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) return
    const next = [...rows]
    next.splice(idx + 1, 0, { ...rows[idx], id: uid() })
    onRowsChange(next)
  }
  const updateCell = (id, field, value) =>
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  const uncertainCount = rows.filter((r) => Object.values(r).some(isUncertain)).length

  return (
    <div className="card">
      <div className="flex items-start gap-2 mb-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded-lg">Entry Form</span>
            <span className="text-xs text-slate-400 font-mono truncate max-w-[180px] sm:max-w-none">{imageName}</span>
          </div>
          {error ? (
            <p className="text-sm text-red-600 mt-1">{error}</p>
          ) : (
            <p className="text-sm text-slate-500 mt-1">
              {rows.length} competitor{rows.length === 1 ? '' : 's'}
              {uncertainCount > 0 && (
                <span className="ml-2 text-amber-600 font-medium">
                  · {uncertainCount} uncertain <span className="bg-yellow-200 text-amber-800 rounded px-1 text-xs">highlighted</span>
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {!error && rows.length > 0 && (
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
              {rows.map((row) => (
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

      <div className="mt-4 pt-3 border-t border-slate-100">
        <button onClick={addRow} className="btn-ghost">+ Add Row</button>
      </div>
    </div>
  )
}

// ─── Shared ────────────────────────────────────────────────────────────────────

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
