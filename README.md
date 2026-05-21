# MPYC RaceSync

**From paper to Sailwave in minutes.**

A free tool for [Mount Pleasant Yacht Club](https://mpyc.org.uk) race officers. Take a photo of a handwritten race finishing times sheet, let AI transcribe it, verify the results in an editable table, and export two CSV files ready to import directly into [Sailwave](https://www.sailwave.com/).

---

## How it works

1. **Upload** — drag and drop (or tap to select) photos of race sheets. Multiple images accepted.
2. **Verify** — the app sends each image to Anthropic's Claude AI, which reads the handwriting and returns structured data. Review the table, fix any uncertain readings (highlighted in yellow), add or delete rows as needed.
3. **Export** — download the Competitors CSV and Results CSV, then import into Sailwave via **File → Import → Import results from CSV**.

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
cd racesync
npm install
```

Create a `.env.local` file (this is gitignored):

```
ANTHROPIC_API_KEY=sk-ant-...
```

Start the development server with Vercel CLI (so the `/api` route works locally):

```bash
npx vercel dev
```

Or, to run just the frontend without the API:

```bash
npm run dev
```

The app opens at `http://localhost:3000` (vercel dev) or `http://localhost:5173` (vite dev).

---

## Deploying to Vercel

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/alamarcinek/mpyc-racesync)

### Manual deploy

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **Add New → Project**.
3. Import the GitHub repo. Vercel auto-detects Vite — no build settings needed.
4. Before deploying, add the environment variable:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** your Anthropic API key (starts with `sk-ant-`)
5. Click **Deploy**.

### Setting the API key after deployment

In the Vercel dashboard:

1. Go to your project → **Settings** → **Environment Variables**.
2. Add `ANTHROPIC_API_KEY` with your key value.
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
│       ├── RaceMetadata.jsx # Date and series name inputs
│       ├── ImageUpload.jsx  # Drag-and-drop upload + thumbnails
│       ├── ResultsTable.jsx # Inline-editable results table
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
| AI transcription | Anthropic claude-opus-4-7 (chosen for best vision accuracy and highest image resolution — critical for handwriting recognition) |
| Backend | Vercel serverless function (Node.js) |
| Hosting | Vercel |

## CSV format (Sailwave)

**Competitors CSV** (`SailNo,HelmName,Class,Club`) — import first to register boats.

**Results CSV** (`raceno,sailno,elapsed,code`) — contains finishing times. The `elapsed` field is taken directly from the finish time as recorded on the sheet (MM:SS). If the sheet records actual clock times rather than elapsed times, you will need to subtract the gun start time in Sailwave after import.

Lines beginning with `;` are comments and are ignored by Sailwave.

---

## Contributing

Issues and PRs welcome. This is a volunteer tool — keep changes focused and practical.

## Licence

MIT
