import Anthropic from '@anthropic-ai/sdk';

const PROMPT =
  'You are processing a Mount Pleasant Yacht Club paper sheet. ' +
  'First identify the sheet type from the column headers and content:\n' +
  '- ENTRY FORM: columns like "Club", "Yacht Name", "Type of yacht", "Skipper & Crew", "Number" — registers competitors\n' +
  '- RACE RESULTS: columns like "Place", "Class", "Finishing Time" — records finishing order\n\n' +
  'Return a single JSON object (no markdown, no explanation) with exactly two fields: "sheet_type" and "rows".\n\n' +
  'If sheet_type is "entry", each row in "rows" must have:\n' +
  '  club (string), yacht_name (string), yacht_type (string), sail_size (string), skipper (string), sailno (string — the Number column).\n' +
  '  Skip the printed example row and skip blank rows.\n\n' +
  'If sheet_type is "results", each row in "rows" must have:\n' +
  '  place (integer — from the handwritten Place column only; ignore the pre-printed row numbers 1-33 on the left sheet edge),\n' +
  '  sailno (string, keep spaces e.g. "116 033"),\n' +
  '  finish_time (string MM:SS — convert "29 10" or "29.10" to "29:10"),\n' +
  '  skipper (string or empty),\n' +
  '  code (string — DNF/DNS/OCS/DSQ/RET or empty),\n' +
  '  notes (string or empty),\n' +
  '  race_section (integer: 1 for rows before the zigzag line, 2 for rows after).\n' +
  '  Note: a results sheet often has TWO races separated by a wavy zigzag line through empty rows. ' +
  '  After the zigzag the same sail numbers reappear with new times. Place numbers reset to 1 in section 2.\n\n' +
  'If any value is unclear, append [?]. Skip entirely blank rows.';

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
      results: parsed.rows,
    });
  } catch (err) {
    console.error('Transcription error:', err);

    if (err instanceof SyntaxError) {
      return res.status(422).json({
        error: 'Could not parse the AI response. Try a clearer or higher-resolution photo.',
      });
    }
    if (err.status === 401) {
      return res.status(500).json({ error: 'API authentication failed. Contact the site admin.' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    }
    if (err.status === 413 || (err.message && err.message.includes('too large'))) {
      return res.status(413).json({ error: 'Image is too large. Please resize it below 4 MB and try again.' });
    }

    return res.status(500).json({ error: err.message || 'Transcription failed. Please try again.' });
  }
}
