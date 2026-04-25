export default async function handler(req, res) {
  try {
    const { slug, ...queryParams } = req.query
    const segments = Array.isArray(slug) ? slug : (slug ? [slug] : [])
    const path = segments.join('/')
    const qs = new URLSearchParams(queryParams).toString()
    const url = `https://query1.finance.yahoo.com/${path}${qs ? '?' + qs : ''}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
      },
    })

    if (!response.ok) {
      res.status(response.status).json({ error: `Yahoo Finance returned ${response.status}` })
      return
    }

    const data = await response.json()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from Yahoo Finance' })
  }
}
