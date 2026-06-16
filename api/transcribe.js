import Anthropic from '@anthropic-ai/sdk';

const PROMPT =
  'You are processing a Mount Pleasant Yacht Club paper sheet.\n\n' +
  'Identify the sheet type:\n' +
  '- ENTRY FORM: columns like "Club", "Yacht Name", "Type of yacht", "Skipper & Crew", "Number"\n' +
  '- RACE RESULTS: has a Finishing Time column listing sail numbers with times\n\n' +
  'Return a single JSON object (no markdown, no explanation) with exactly four fields: ' +
  '"sheet_type", "result_type", "race_start_times", "rows".\n\n' +

  '=== ENTRY FORM (sheet_type: "entry") ===\n' +
  '  result_type: null\n' +
  '  race_start_times: {}\n' +
  '  rows: each row has club, yacht_name, yacht_type, sail_size, skipper, sailno (the Number column).\n' +
  '  Skip the printed example row and blank rows.\n\n' +

  '=== RACE RESULTS (sheet_type: "results") ===\n\n' +

  'result_type — detect from the Finishing Time column:\n' +
  '  "wallclock" — times are actual clock times of day (e.g. 19:03, 20:55). ' +
  '  Strong signals: hour values > 12, a column header reading "Race Start Time (Gun)" or similar, ' +
  '  or start times annotated on the sheet.\n' +
  '  "elapsed"   — times are elapsed since the start gun (e.g. 45:23, typically MM:SS format).\n\n' +

  'race_start_times — find race start (gun) times written anywhere on the sheet:\n' +
  '  Check margin annotations, side notes, or any text like "5:55pm", "Race 1 3:55", "Gun 18:00".\n' +
  '  Return {"1": "HH:MM", "2": "HH:MM", ...} mapping race_section number to 24h start time.\n' +
  '  Convert 12h to 24h (e.g. "5:55pm" → "17:55", "6:21" pm context → "18:21").\n' +
  '  If none found, return {}.\n\n' +

  'rows — each row has:\n' +
  '  place (integer — handwritten place value only; IGNORE the pre-printed row numbers 1-33 ' +
  '  along the left edge of the sheet, those are sheet row numbers not place numbers),\n' +
  '  sailno (string — from the "Class" column; despite the label "Class" this column contains ' +
  '  the sail/race NUMBER. Keep spaces e.g. "116 033"),\n' +
  '  finish_time (string):\n' +
  '    wallclock → exact clock time as written, HH:MM or HH:MM:SS\n' +
  '    elapsed   → elapsed time MM:SS; convert "29 10" or "29.10" → "29:10"\n' +
  '    Leave blank if there is a code (DNF etc.)\n' +
  '  skipper (string or empty),\n' +
  '  code (string — DNF/DNS/OCS/DSQ/RET or empty; if code is set, finish_time must be empty),\n' +
  '  notes (string or empty),\n' +
  '  race_section (integer: 1 for the first race, 2 for the second race on the same sheet).\n\n' +

  'PLACE NUMBERING RULE: Place numbers ALWAYS start at 1 for each race section. ' +
  'In race_section 2 the first finisher is place 1, second is place 2, etc. ' +
  'Do NOT carry over place numbers from race_section 1 into race_section 2.\n\n' +

  'RACE BOUNDARY DETECTION: A sheet often has TWO or more races. Signs a new race begins: ' +
  '(1) blank/empty rows creating a visual gap, (2) a wavy or zigzag line drawn across empty rows, ' +
  '(3) the same sail numbers reappear below with completely different finishing times, ' +
  '(4) a "Race 2", "Race 3" etc. label written on the sheet. ' +
  'Any of these signals means subsequent rows belong to the next race_section.\n\n' +

  'UNCERTAINTY RULE: If ANY character in a value is hard to read, ambiguous, or could be more than ' +
  'one thing, append [?] to that value (e.g. "47:2[?]" if the last digit is unclear, "567[?]" if ' +
  'the sail number is smudged). Be generous with [?] — a race officer will review every flagged value. ' +
  'Skip entirely blank rows.';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, mediaType } = req.body || {};

  if (!image || !mediaType) {
    return res.status(400).json({ error: 'Missing required fields: image, mediaType' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: API key not set. Contact the site admin.' });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    let text = message.content[0].text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const parsed = JSON.parse(text);
    if (!parsed.sheet_type || !Array.isArray(parsed.rows)) {
      throw new Error('Unexpected response format from AI');
    }

    return res.status(200).json({
      sheetType: parsed.sheet_type === 'entry' ? 'entry' : 'results',
      resultType: parsed.result_type || null,
      raceStartTimes: parsed.race_start_times || {},
      results: parsed.rows,
    });
  } catch (err) {
    console.error('Transcription error:', err);
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'Could not parse the AI response. Try a clearer or higher-resolution photo.' });
    }
    if (err.status === 401) return res.status(500).json({ error: 'API authentication failed. Contact the site admin.' });
    if (err.status === 429) return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    if (err.status === 413 || (err.message && err.message.includes('too large'))) {
      return res.status(413).json({ error: 'Image is too large. Please resize it below 4 MB and try again.' });
    }
    return res.status(500).json({ error: err.message || 'Transcription failed. Please try again.' });
  }
}
