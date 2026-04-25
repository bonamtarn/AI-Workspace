export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { addr } = req.body || {}
  if (!addr) return res.status(400).json({ error: 'Missing addr' })

  try {
    const r = await fetch('https://www.blockonomics.co/api/balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.blockonomics.co/',
        'Origin': 'https://www.blockonomics.co',
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify({ addr }),
    })
    const text = await r.text()
    res.status(r.status).send(text)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
