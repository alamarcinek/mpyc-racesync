import Anthropic from '@anthropic-ai/sdk';

const PROMPT_ENTRY =
  'You are transcribing a Mount Pleasant Yacht Club Entry Form (sign-on sheet). ' +
  'The form has columns: Club, Yacht Name, Type of yacht, Sail Size (if applicable), Skipper & Crew, Number (sail number). ' +
  'Extract ALL completed rows — skip the printed header row and the example row — and return ONLY a JSON array (no markdown, no explanation). ' +
  'Each object must have: club (string), yacht_name (string), yacht_type (string), sail_size (string), skipper (string), sailno (string — the Number column, keep exactly as written). ' +
  'If a value is unclear, append [?]. Skip entirely blank rows.';

const PROMPT_RESULTS =
  'You are transcribing a Mount Pleasant Yacht Club Race Finishing Times sheet. ' +
  'The printed sheet has columns: Place, Class (sail number), Finishing Time, Skipper. ' +
  'IMPORTANT: The sheet has pre-printed row numbers (1, 2, 3 ... 33) along the left edge — these are NOT place numbers, ignore them completely. Only read the handwritten Place values inside the table. ' +
  'A single sheet often contains TWO separate races divided by a wavy zigzag line drawn across several empty rows. ' +
  'Signs of a second race: (1) a wavy zigzag line through empty rows, (2) the same sail numbers reappear below it. ' +
  'In the second race the handwritten place numbers reset back to 1. ' +
  'Extract ALL rows that contain handwritten data (skip blank rows and the zigzag rows) and return ONLY a JSON array (no markdown, no explanation). ' +
  'Each object must have: ' +
  'place (integer — from the handwritten Place column, resets to 1 for race_section 2), ' +
  'sailno (string — keep exactly as written including spaces e.g. "116 033"), ' +
  'finish_time (string MM:SS — convert "29 10" or "29.10" or "29 : 10" to "29:10"), ' +
  'skipper (string or empty), ' +
  'code (string — DNF/DNS/OCS/DSQ/RET or empty), ' +
  'notes (string — any side annotations or empty), ' +
  'race_section (integer: 1 for all rows before the zigzag, 2 for all rows after). ' +
  'If a value is unclear, append [?]. Ignore the zigzag line itself — only use it to assign race_section.';

const PROMPTS = { entry: PROMPT_ENTRY, results: PROMPT_RESULTS };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, mediaType, sheetType = 'results' } = req.body || {};

  if (!image || !mediaType) {
    return res.status(400).json({ error: 'Missing required fields: image, mediaType' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: API key not set. Contact the site admin.' });
  }

  const prompt = PROMPTS[sheetType] || PROMPTS.results;

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
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    let text = message.content[0].text.trim();

    // Strip markdown code fences if Claude wrapped the JSON
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const results = JSON.parse(text);

    if (!Array.isArray(results)) {
      throw new Error('Unexpected response format from AI');
    }

    return res.status(200).json({ results });
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
