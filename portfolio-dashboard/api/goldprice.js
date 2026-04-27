export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')

  try {
    const r = await fetch('https://www.goldtraders.or.th/api/GoldPrices/Latest?readjson=false', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.goldtraders.or.th/',
        'Accept': 'application/json',
      },
    })
    if (!r.ok) return res.status(502).json({ error: `goldtraders.or.th HTTP ${r.status}` })

    const data = await r.json()
    const price = data?.bL_SellPrice
    if (!price || isNaN(price) || price <= 0) {
      return res.status(404).json({ error: 'ไม่พบราคาทองคำแท่งราคาขายออก — กรุณากรอกเอง' })
    }

    return res.status(200).json({ price, source: 'goldtraders.or.th' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
