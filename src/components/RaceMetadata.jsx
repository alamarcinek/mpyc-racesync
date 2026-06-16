export default function RaceMetadata({ metadata, onChange, resultType, onResultTypeChange }) {
  const update = (key, value) => onChange({ ...metadata, [key]: value })

  return (
    <div className="card">
      <h2 className="section-title">Race Details</h2>

      {/* Result type segmented control */}
      <div className="mb-5">
        <p className="text-sm font-medium text-slate-700 mb-2">Result type</p>
        <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-1">
          {[
            ['elapsed', 'Elapsed time'],
            ['wallclock', 'Wall clock time'],
          ].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => onResultTypeChange(val)}
              className={[
                'px-4 py-2 text-sm font-semibold rounded-lg transition-all',
                resultType === val
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {resultType === 'elapsed'
            ? 'Auto-detected from sheet, or set manually. Times are elapsed since the start gun — e.g. 45:23'
            : 'Auto-detected from sheet, or set manually. Times are actual clock times — e.g. 19:03. Start times are auto-filled from the sheet where found.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label="Date" htmlFor="raceDate">
          <input
            id="raceDate"
            type="date"
            value={metadata.date}
            onChange={(e) => update('date', e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Series Name" htmlFor="seriesName">
          <input
            id="seriesName"
            type="text"
            value={metadata.seriesName}
            onChange={(e) => update('seriesName', e.target.value)}
            placeholder="e.g. Summer Series"
            className="input"
          />
        </Field>
      </div>
      <p className="text-xs text-slate-400 mt-3">
        These details are included in the exported CSV filenames and comment headers.
      </p>
    </div>
  )
}

function Field({ label, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  )
}
