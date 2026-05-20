import Anthropic from '@anthropic-ai/sdk';

const PROMPT =
  'You are transcribing a handwritten yacht race finishing times sheet from Mount Pleasant Yacht Club. ' +
  'The sheet has columns: Place, Class (sail number), Finishing Time, Skipper. ' +
  'A single sheet may contain TWO separate races, divided by wavy lines drawn through empty rows. ' +
  'When you see wavy lines, the place numbers reset because a NEW race begins below. ' +
  'Extract ALL rows containing data and return ONLY a JSON array (no markdown, no explanation). ' +
  'Each object must have: place (integer), sailno (string, keep exactly as written), ' +
  'finish_time (string in MM:SS format - convert \'29 34\' to \'29:34\'), ' +
  'code (string - DNF/DNS/OCS/DSQ/RET or empty), notes (string or empty), ' +
  'race_section (integer: 1 for the first race on the sheet, 2 for the second race below the wavy line). ' +
  'If a value is unclear, append [?]. ' +
  'Ignore decorative wavy lines themselves - they only signal a race break.';

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
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: image },
            },
            { type: 'text', text: PROMPT },
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
        error: 'Could not parse the AI response as structured data. Try a clearer or higher-resolution photo.',
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

    return res.status(500).json({
      error: err.message || 'Transcription failed. Please try again.',
    });
  }
}
