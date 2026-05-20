import { PhotoIcon, SparklesIcon, DownloadIcon, ShieldCheckIcon } from './icons'

const STEPS = [
  {
    Icon: PhotoIcon,
    title: 'Upload',
    desc: 'Take a photo of the race finishing sheet and drag it in — or tap to select on mobile.',
  },
  {
    Icon: SparklesIcon,
    title: 'Verify',
    desc: 'AI reads the handwriting. Review the table and fix any uncertain readings flagged in yellow.',
  },
  {
    Icon: DownloadIcon,
    title: 'Export',
    desc: 'Download the Competitors and Results CSV files, then import directly into Sailwave.',
  },
]

const SAFETY_POINTS = [
  'Free for MPYC members — no signup or account needed',
  "Photos are sent only to Anthropic's Claude AI for transcription, then immediately discarded",
  'Nothing is stored — no race data saved on any server, ever',
  'Open source — anyone can read the full code on GitHub',
]

export default function TrustSection() {
  return (
    <div className="space-y-4">
      {/* How it works */}
      <div className="card">
        <h2 className="section-title">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {STEPS.map(({ Icon, title, desc }, i) => (
            <div key={title} className="flex gap-3 sm:flex-col sm:gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center font-bold text-base">
                {i + 1}
              </div>
              <div>
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Icon className="w-4 h-4 text-navy" />
                  {title}
                </div>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why it's safe */}
      <div className="bg-navy-light border border-navy-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheckIcon className="w-5 h-5 text-navy shrink-0" />
          <h3 className="font-semibold text-navy">Why it's safe to use</h3>
        </div>
        <ul className="space-y-2">
          {SAFETY_POINTS.map((point) => (
            <li key={point} className="flex gap-2.5 text-sm text-slate-700">
              <span className="text-green-600 font-bold shrink-0 mt-0.5">✓</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Built for MPYC volunteers.{' '}
          <a
            href="https://github.com/mpyc/racesync"
            target="_blank"
            rel="noreferrer"
            className="text-navy underline hover:no-underline"
          >
            Read the source code on GitHub.
          </a>
        </p>
      </div>
    </div>
  )
}
