export default function RaceMetadata({ metadata, onChange }) {
  const update = (key, value) => onChange({ ...metadata, [key]: value })

  return (
    <div className="card">
      <h2 className="section-title">Race Details</h2>
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
