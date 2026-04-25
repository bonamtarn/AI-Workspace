export default async function handler(req, res) {
  const symbol = (req.query.symbol || '').toUpperCase().trim()
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' })

  res.setHeader('Access-Control-Allow-Origin', '*')

  if (symbol.startsWith('SCB')) {
    const result = await fetchSCBAMNav(symbol)
    if (result) return res.status(200).json(result)
  }

  // Try Yuanta for all other Thai mutual funds (server-side rendered)
  const yuantaResult = await fetchYuantaNav(symbol)
  if (yuantaResult) return res.status(200).json(yuantaResult)

  return res.status(404).json({ error: `ไม่พบ NAV อัตโนมัติสำหรับ ${symbol} — กรุณากรอกเอง` })
}

const SCBAM_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Referer': 'https://www.scbam.com/th/fund/nav/',
  'User-Agent': 'Mozilla/5.0',
}

async function fetchSCBAMNav(symbol) {
  // Try setdatenav first (covers most domestic funds)
  const result = await fetchFromSetdatenav(symbol)
  if (result) return result

  // Fallback: setdategf endpoint (foreign investment funds like SCBGOLDHE)
  return fetchFromSetdategf(symbol)
}

async function fetchFromSetdatenav(symbol) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const r = await fetch('https://www.scbam.com/setdatenav', {
      method: 'POST',
      headers: SCBAM_HEADERS,
      body: `now=${today}&lang_id=2&types=fund`,
    })
    if (!r.ok) return null
    const data = await r.json()
    for (const group of data) {
      for (const fund of (group.data || [])) {
        if (fund.fund_code === symbol) {
          const nav = parseFloat(fund.nav?.navunit)
          if (!isNaN(nav) && nav > 0) {
            return { nav, date: fund.nav?.navdate, source: 'SCBAM', symbol }
          }
        }
      }
    }
  } catch {}
  return null
}

async function fetchYuantaNav(symbol) {
  try {
    const r = await fetch(`https://mutualfund.yuanta.co.th/fund/${symbol}/`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!r.ok) return null
    const html = await r.text()

    const navMatch = html.match(/มูลค่าหน่วยลงทุน[\s\S]{0,200}?([\d]+\.[\d]+)\s*บาท/)
    if (!navMatch) return null
    const nav = parseFloat(navMatch[1])
    if (isNaN(nav) || nav <= 0) return null

    const dateMatch = html.match(/ณ\s*วันที่\s*([^\n<]{4,20})/)
    const date = dateMatch ? dateMatch[1].trim() : null

    return { nav, date, source: 'Yuanta', symbol }
  } catch {}
  return null
}

async function fetchFromSetdategf(symbol) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const r = await fetch('https://www.scbam.com/setdategf', {
      method: 'POST',
      headers: SCBAM_HEADERS,
      body: `fundCode=${encodeURIComponent(symbol)}&asOfDate=${today}&prior=${yesterday}&lang=th`,
    })
    if (!r.ok) return null
    const data = await r.json()
    const arr = data?.threeMonth?.prior || []
    if (!arr.length) return null
    const latest = arr[arr.length - 1]
    const nav = parseFloat(latest.navunit)
    if (!isNaN(nav) && nav > 0) {
      return { nav, date: latest.navdate, source: 'SCBAM', symbol }
    }
  } catch {}
  return null
}
