export const config = { api: { bodyParser: { sizeLimit: '12mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured in Vercel.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const image = String(body?.image || '');
    const outfit = body?.outfit || {};
    if (!image.startsWith('data:image/')) return res.status(400).json({ error: 'Please upload a valid image.' });
    if (image.length > 11_000_000) return res.status(400).json({ error: 'Please use a smaller photo.' });

    const match = image.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
    if (!match) return res.status(400).json({ error: 'Only JPG, PNG, or WebP photos are supported.' });
    const mime = match[1].toLowerCase().replace('image/jpg','image/jpeg');
    const bytes = Buffer.from(match[2], 'base64');
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';

    const prompt = `Edit the uploaded person's photo into a realistic fashion try-on preview. Preserve the person's identity, face, hairstyle, skin tone, pose, body proportions, and the original scene as much as possible. Change only the clothing and accessories needed for this outfit. Outfit: top: ${outfit.top || 'clean premium shirt'}; bottom: ${outfit.bottom || 'tailored trousers'}; shoes: ${outfit.shoes || 'clean shoes'}; colour palette: ${outfit.colour || 'neutral'}; accessory: ${outfit.accessory || 'minimal watch'}. Make the clothing physically plausible, well-fitted, and natural. Do not beautify or alter the person's face or body.`;

    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('image', new Blob([bytes], { type: mime }), `yaruva-user.${ext}`);
    form.append('prompt', prompt);
    form.append('input_fidelity', 'high');
    form.append('size', '1024x1536');
    form.append('quality', 'medium');

    const r = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Image edit failed.' });
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return res.status(500).json({ error: 'The image service returned no image.' });
    return res.status(200).json({ image: `data:image/png;base64,${b64}` });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'YARUVA virtual try-on could not generate the preview.' });
  }
}
