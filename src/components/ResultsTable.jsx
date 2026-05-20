const uid = () => Math.random().toString(36).slice(2, 9)
const isUncertain = (v) => String(v ?? '').includes('[?]')

const CODE_OPTIONS = ['', 'DNF', 'DNS', 'OCS', 'DSQ', 'RET']

const EMPTY_ROW = (fleet = 'A') => ({
  id: uid(),
  place: '',
  sailno: '',
  finish_time: '',
  code: '',
  notes: '',
  fleet,
})

export default function ResultsTable({ image, results, onResultsChange }) {
  const addRow = () => {
    const lastFleet = results[results.length - 1]?.fleet || 'A'
    onResultsChange([...results, EMPTY_ROW(lastFleet)])
  }

  const deleteRow = (id) => onResultsChange(results.filter((r) => r.id !== id))

  const duplicateRow = (id) => {
    const idx = results.findIndex((r) => r.id === id)
    if (idx === -1) return
    const copy = { ...results[idx], id: uid() }
    const next = [...results]
    next.splice(idx + 1, 0, copy)
    onResultsChange(next)
  }

  const updateCell = (id, field, value) =>
    onResultsChange(results.map((r) => (r.id === id ? { ...r, [field]: value } : r)))

  const uncertainCount = results.filter((r) =>
    Object.values(r).some((v) => isUncertain(v)),
  ).length

  return (
    <div className="card">
      {/* Table header */}
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-navy text-base truncate max-w-xs sm:max-w-none">
            {image.name}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {results.length} entr{results.length === 1 ? 'y' : 'ies'}
            {uncertainCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {uncertainCount} uncertain{' '}
                <span className="bg-yellow-200 text-amber-800 rounded px-1 text-xs">
                  highlighted
                </span>
              </span>
            )}
          </p>
        </div>
      </div>

      {image.status === 'error' ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <strong className="font-semibold">Transcription failed:</strong> {image.error}
        </div>
      ) : results.length === 0 ? (
        <p className="text-slate-400 text-sm py-4 text-center">No results transcribed yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200">
                {['Place', 'Sail No', 'Finish Time', 'Code', 'Notes', 'Fleet', ''].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap text-xs uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((row) => (
                <ResultRow
                  key={row.id}
                  row={row}
                  onUpdate={(field, value) => updateCell(row.id, field, value)}
                  onDelete={() => deleteRow(row.id)}
                  onDuplicate={() => duplicateRow(row.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100">
        <button onClick={addRow} className="btn-ghost">
          + Add Row
        </button>
      </div>
    </div>
  )
}

function ResultRow({ row, onUpdate, onDelete, onDuplicate }) {
  return (
    <tr className="hover:bg-slate-50/70 group">
      <EditCell value={row.place} onChange={(v) => onUpdate('place', v)} width="w-14" />
      <EditCell value={row.sailno} onChange={(v) => onUpdate('sailno', v)} width="w-28" />
      <EditCell
        value={row.finish_time}
        onChange={(v) => onUpdate('finish_time', v)}
        width="w-24"
        placeholder="29:34"
      />

      {/* Code — select */}
      <td className={`px-2 py-1.5 ${isUncertain(row.code) ? 'bg-yellow-50' : ''}`}>
        <select
          value={row.code}
          onChange={(e) => onUpdate('code', e.target.value)}
          className="w-20 bg-transparent border border-transparent rounded px-1.5 py-1.5 text-sm
                     text-slate-800 focus:outline-none focus:border-navy/40 focus:bg-white
                     focus:ring-1 focus:ring-navy/30 cursor-pointer"
        >
          {CODE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o || '—'}
            </option>
          ))}
        </select>
      </td>

      <EditCell value={row.notes} onChange={(v) => onUpdate('notes', v)} width="w-40" wide />
      <EditCell value={row.fleet} onChange={(v) => onUpdate('fleet', v)} width="w-14" />

      {/* Actions */}
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 sm:opacity-100 transition-opacity">
          <ActionBtn onClick={onDuplicate} title="Duplicate row" label="⊕" />
          <ActionBtn onClick={onDelete} title="Delete row" label="✕" danger />
        </div>
      </td>
    </tr>
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

function ActionBtn({ onClick, title, label, danger = false }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition',
        danger
          ? 'text-red-400 hover:bg-red-50 hover:text-red-600'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
