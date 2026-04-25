export default async function handler(req, res) {
  try {
    const { slug, ...queryParams } = req.query
    const segments = Array.isArray(slug) ? slug : (slug ? [slug] : [])
    const path = segments.join('/')
    const qs = new URLSearchParams(queryParams).toString()
    const url = `https://mempool.space/api/${path}${qs ? '?' + qs : ''}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    })

    const text = await response.text()
    res.setHeader('Access-Control-Allow-Origin', '*')

    if (!response.ok) {
      res.status(response.status).send(text)
      return
    }

    res.setHeader('Content-Type', 'application/json')
    res.status(200).send(text)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from mempool.space' })
  }
}
