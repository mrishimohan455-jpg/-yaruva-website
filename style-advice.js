export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured in Vercel.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const request = String(body?.request || '').trim();
    if (!request) return res.status(400).json({ error: 'Please describe what you are dressing for.' });
    if (request.length > 2000) return res.status(400).json({ error: 'Please keep your styling request under 2000 characters.' });

    const prompt = `You are YARUVA AI, a premium personal stylist focused on modern menswear, practical Indian weather, fit, colour harmony, occasion-appropriate dressing, and intentional wardrobes. Give a useful recommendation from the user's exact request. Do not invent specific products as if they exist. YARUVA's current in-house products are: GROWTH 01 (light-blue relaxed shirt; everyday/college/travel), PURPOSE 02 (charcoal structured shirt; office/interviews/formal/elevated evenings), ROOTS 03 (olive/beige smart-casual direction; weekend/work-travel/natural relaxed styling).

Return ONLY valid JSON with exactly these keys: title, body, top, bottom, shoes, colour, accessory, tip, productKey.
productKey must be exactly growth, purpose, or roots and should be the closest YARUVA product match.
Keep each field concise. Body should be 1-2 natural sentences. Never comment on the user's body attractiveness, weight, race, age, or other sensitive traits.

User request: ${request}`;

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-5.6-luna', input: prompt })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'OpenAI request failed.' });
    const text = data.output_text || '';
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const result = JSON.parse(clean);
    return res.status(200).json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'YARUVA AI could not create a recommendation right now.' });
  }
}
