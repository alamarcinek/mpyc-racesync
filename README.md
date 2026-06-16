# MPYC RaceSync

**From paper to Sailwave in minutes.**

A free tool for [Mount Pleasant Yacht Club](https://mpyc.org.uk) race officers. Take a photo of a handwritten race finishing times sheet, let AI transcribe it, verify the results in an editable table, and export CSV files ready to import directly into [Sailwave](https://www.sailwave.com/).

---

## How it works

1. **Upload** — drag and drop or tap to select photos of race sheets. Entry forms and results sheets both accepted. Multiple images, multiple races per sheet.
2. **AI transcription** — each image is sent to Anthropic's Claude AI, which reads the handwriting, auto-detects whether times are elapsed or wall clock, extracts race start times from margin annotations, and flags any uncertain characters in yellow for your review.
3. **Verify** — review the editable table, fix anything highlighted in yellow, adjust start times if needed.
4. **Export** — download the Competitors CSV and Results CSV, then import into Sailwave via **File → Import**.

---

## Result types

The app auto-detects the time format from each sheet — no manual selection needed.

### Elapsed time
Sheet shows time elapsed since the start gun, e.g. `45:23`. Exported as:
```
raceno,sailno,elapsed,code
1,136656,45:23,
1,162134,46:10,
```

### Wall clock time
Sheet shows actual finish times of day, e.g. `19:03`. The AI also reads the race start (gun) time from anywhere on the sheet — margin annotations, column headers, side notes — and converts 12h to 24h automatically (e.g. `5:55pm` → `17:55`). Exported as:
```
raceno,sailno,start,finish,code
1,136656,17:55,19:03,
1,162134,17:55,19:56,
```

Both formats use Sailwave's exact auto-recognised column names, so the import wizard maps them automatically without manual column assignment.

---

## Uncertain readings

Any value the AI isn't fully confident about is flagged with `[?]` and highlighted in yellow in the table (e.g. `47:2[?]` if a digit is unclear). The race officer reviews and corrects these before exporting. The AI errs on the side of over-flagging rather than silently guessing.

---

## Privacy & security

- Images are sent only to [Anthropic's Claude API](https://www.anthropic.com/claude) for transcription, then discarded.
- No data is stored anywhere — not on the server, not in the browser.
- The API key lives only in a Vercel environment variable — users never see or enter it.
- The app is fully open source. Read every line of code in this repo.

---

## Running locally

### Prerequisites

- Node.js 18+
- An Anthropic API key ([get one at console.anthropic.com](https://console.anthropic.com))

### Setup

```bash
git clone https://github.com/alamarcinek/mpyc-racesync
cd mpyc-racesync
npm install
```

Create a `.env.local` file (gitignored):

```
ANTHROPIC_API_KEY=sk-ant-...
```

Start the development server with Vercel CLI so the `/api` route works locally:

```bash
npx vercel dev
```

The app opens at `http://localhost:3000`.

---

## Deploying to Vercel

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/alamarcinek/mpyc-racesync)

### Manual deploy

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New → Project**.
3. Import the GitHub repo. Vercel auto-detects Vite — no build settings needed.
4. Add the environment variable before deploying:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** your key (starts with `sk-ant-`)
5. Click **Deploy**.

### Setting the API key after deployment

1. Go to your project → **Settings** → **Environment Variables**.
2. Add `ANTHROPIC_API_KEY`.
3. Redeploy (Settings → Deployments → Redeploy latest).

---

## Project structure

```
mpyc-racesync/
├── api/
│   └── transcribe.js        # Vercel serverless function — calls Anthropic API
├── src/
│   ├── App.jsx              # Root component, state management
│   ├── index.css            # Tailwind v4 theme + shared utility classes
│   └── components/
│       ├── Header.jsx       # Top nav bar
│       ├── TrustSection.jsx # "How it works" + "Why it's safe"
│       ├── RaceMetadata.jsx # Date, series name, result type toggle
│       ├── ImageUpload.jsx  # Drag-and-drop upload + thumbnails
│       ├── ResultsTable.jsx # Inline-editable results and entry form tables
│       ├── ExportPanel.jsx  # CSV generation + download
│       └── icons.jsx        # Inline SVG icon components
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.js
├── vercel.json
└── .env.example
```

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| AI transcription | Anthropic claude-opus-4-7 (best vision accuracy for handwriting recognition) |
| Backend | Vercel serverless function (Node.js) |
| Hosting | Vercel |

---

## Contributing

Issues and PRs welcome. This is a volunteer tool — keep changes focused and practical.

## Licence

MIT
