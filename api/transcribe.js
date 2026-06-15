import Anthropic from '@anthropic-ai/sdk';

const SHARED_HEADER =
  'You are processing a Mount Pleasant Yacht Club paper sheet. ' +
  'First identify the sheet type from the column headers and content:\n' +
  '- ENTRY FORM: columns like "Club", "Yacht Name", "Type of yacht", "Skipper & Crew", "Number"\n' +
  '- RACE RESULTS: columns like "Place", "Class", "Finishing Time"\n\n' +
  'Return a single JSON object (no markdown, no explanation) with exactly two fields: "sheet_type" and "rows".\n\n' +
  'If sheet_type is "entry", each row in "rows" must have:\n' +
  '  club, yacht_name, yacht_type, sail_size, skipper, sailno (the Number column).\n' +
  '  Skip the printed example row and blank rows.\n\n';

const SHARED_RESULTS_FIELDS =
  '  place (integer — handwritten place value only; IGNORE the pre-printed row numbers 1-33 along the left edge of the sheet, those are sheet row numbers not place numbers),\n' +
  '  sailno (string — from the "Class" column; despite the label "Class" this column contains the sail/race NUMBER. Keep spaces e.g. "116 033"),\n' +
  '  skipper (string or empty),\n' +
  '  code (string — DNF/DNS/OCS/DSQ/RET or empty. If a row has a code, finish_time must be empty),\n' +
  '  notes (string or empty),\n' +
  '  race_section (integer: 1 for the first race, 2 for the second race on the same sheet).\n\n' +
  '  PLACE NUMBERING RULE: Place numbers ALWAYS start at 1 for each race section. ' +
  '  In race_section 2 the first finisher is place 1, second is place 2, etc. ' +
  '  Do NOT carry over place numbers from race_section 1 into race_section 2.\n\n' +
  '  RACE BOUNDARY DETECTION: A sheet often has TWO races. Signs a second race begins: ' +
  '  (1) blank/empty rows creating a visual gap, (2) a wavy or zigzag line drawn across empty rows, ' +
  '  (3) the same sail numbers reappear below with completely different finishing times. ' +
  '  Any of these signals means subsequent rows belong to race_section 2.\n\n' +
  'If any value is unclear, append [?]. Skip entirely blank rows.';

const ELAPSED_PROMPT =
  SHARED_HEADER +
  'If sheet_type is "results", each row in "rows" must have:\n' +
  '  finish_time (string MM:SS — the elapsed time since the start gun. Convert "29 10" or "29.10" to "29:10". LEAVE BLANK if there is a code such as DNF),\n' +
  SHARED_RESULTS_FIELDS;

const WALLCLOCK_PROMPT =
  SHARED_HEADER +
  'If sheet_type is "results", each row in "rows" must have:\n' +
  '  finish_time (string — READ THE ACTUAL CLOCK TIME exactly as written on the sheet, e.g. "14:02" or "14:02:45". ' +
  '  Format as HH:MM or HH:MM:SS. Do NOT calculate or subtract anything. LEAVE BLANK if there is a code such as DNF),\n' +
  SHARED_RESULTS_FIELDS;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, mediaType, resultType } = req.body || {};

  if (!image || !mediaType) {
    return res.status(400).json({ error: 'Missing required fields: image, mediaType' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: API key not set. Contact the site admin.' });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = resultType === 'wallclock' ? WALLCLOCK_PROMPT : ELAPSED_PROMPT;

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: prompt },
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
