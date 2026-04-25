export default async function handler(req, res) {
  try {
    const { active } = req.query
    if (!active) {
      res.status(400).json({ error: 'Missing active parameter' })
      return
    }

    const url = `https://api.blockchair.com/bitcoin/dashboards/xpub/${encodeURIComponent(active)}?limit=0`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      res.status(response.status).json({ error: text || `Blockchair error ${response.status}` })
      return
    }

    const data = await response.json()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from Blockchair' })
  }
}
