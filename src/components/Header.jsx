import { SailIcon, GitHubIcon } from './icons'

export default function Header() {
  return (
    <header className="bg-navy text-white shadow-lg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <SailIcon className="w-9 h-9 shrink-0 text-white" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-xl leading-tight tracking-tight">MPYC RaceSync</div>
          <div className="text-sm text-white/65 leading-tight hidden sm:block">
            From paper to Sailwave in minutes
          </div>
        </div>
        <a
          href="https://github.com/alamarcinek/mpyc-racesync"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-white/70 hover:text-white transition text-sm font-medium shrink-0 py-2 px-1"
          aria-label="View source on GitHub"
        >
          <GitHubIcon className="w-5 h-5" />
          <span className="hidden sm:inline">GitHub</span>
        </a>
      </div>
    </header>
  )
}
