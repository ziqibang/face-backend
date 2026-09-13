// api/generate-face.js
// Deploy this as a Vercel serverless function (or adapt for Netlify/
// Cloudflare Workers). Pollinations.ai needs no API key at all, so this
// backend no longer protects a secret — its only job now is guaranteeing
// CORS-safe pixel access (by returning base64 instead of a raw URL) and
// being a light, courteous rate-limit in front of a free shared service.
//
// Optional env var:
//   CLIENT_SHARED_SECRET  — any string you make up, purely to discourage
//                           strangers from finding and hammering this
//                           endpoint. Not real security either way.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // tighten to your OpenProcessing origin if you like
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  if (process.env.CLIENT_SHARED_SECRET) {
    const clientSecret = req.headers['x-client-secret'];
    if (clientSecret !== process.env.CLIENT_SHARED_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const prompt = encodeURIComponent(
      'front-facing black and white studio portrait photo of an adult man, ' +
      'male face, dramatic single-direction lighting with strong shadows, ' +
      'neutral expression, white background, head and shoulders only, high contrast, front facing ID photo, front facing only and very formal'
    );
    const negativePrompt = encodeURIComponent('woman, female, feminine, girl, side-profile, turning, dark background');

    // A random seed per request is what gives you a different face each
    // click — Pollinations returns the same image for the same prompt+seed.
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsURL =
      `https://image.pollinations.ai/prompt/${prompt}` +
      `?width=1024&height=1280&seed=${seed}&nologo=true&negative=${negativePrompt}`;

    const imgResponse = await fetch(pollinationsURL);
    if (!imgResponse.ok) {
      return res.status(502).json({ error: 'Image provider error', status: imgResponse.status });
    }

    const arrayBuffer = await imgResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';

    return res.status(200).json({ image: `data:${contentType};base64,${base64}` });
  } catch (err) {
    return res.status(500).json({ error: 'Generation failed', detail: String(err) });
  }
}