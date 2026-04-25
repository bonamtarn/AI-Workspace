import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SCBAM_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Referer': 'https://www.scbam.com/th/fund/nav/',
  'User-Agent': 'Mozilla/5.0',
}

async function fetchSCBAMNav(symbol) {
  return (await fetchFromSetdatenav(symbol)) || (await fetchFromSetdategf(symbol))
}

async function fetchFromSetdatenav(symbol) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const r = await fetch('https://www.scbam.com/setdatenav', {
      method: 'POST', headers: SCBAM_HEADERS,
      body: `now=${today}&lang_id=2&types=fund`,
    })
    if (!r.ok) return null
    const data = await r.json()
    for (const group of data)
      for (const fund of (group.data || []))
        if (fund.fund_code === symbol) {
          const nav = parseFloat(fund.nav?.navunit)
          if (!isNaN(nav) && nav > 0) return { nav, date: fund.nav?.navdate, source: 'SCBAM', symbol }
        }
  } catch {}
  return null
}

async function fetchFromSetdategf(symbol) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const r = await fetch('https://www.scbam.com/setdategf', {
      method: 'POST', headers: SCBAM_HEADERS,
      body: `fundCode=${encodeURIComponent(symbol)}&asOfDate=${today}&prior=${yesterday}&lang=th`,
    })
    if (!r.ok) return null
    const data = await r.json()
    const arr = data?.threeMonth?.prior || []
    if (!arr.length) return null
    const latest = arr[arr.length - 1]
    const nav = parseFloat(latest.navunit)
    if (!isNaN(nav) && nav > 0) return { nav, date: latest.navdate, source: 'SCBAM', symbol }
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

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-dev',
      configureServer(server) {
        server.middlewares.use('/api/btcwallet', async (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          if (req.method !== 'POST') {
            res.statusCode = 405
            return res.end(JSON.stringify({ error: 'Method not allowed' }))
          }
          const chunks = []
          req.on('data', c => chunks.push(c))
          req.on('end', async () => {
            try {
              const { addr } = JSON.parse(Buffer.concat(chunks).toString())
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
              res.statusCode = r.status
              res.end(text)
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: e.message }))
            }
          })
        })

        server.middlewares.use('/api/fundnav', async (req, res) => {
          const url = new URL(req.url, 'http://localhost')
          const symbol = (url.searchParams.get('symbol') || '').toUpperCase().trim()
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          if (!symbol) {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'Missing symbol' }))
          }
          let result = null
          if (symbol.startsWith('SCB')) result = await fetchSCBAMNav(symbol)
          if (!result) result = await fetchYuantaNav(symbol)
          if (result) {
            res.statusCode = 200
            res.end(JSON.stringify(result))
          } else {
            res.statusCode = 404
            res.end(JSON.stringify({ error: `ไม่พบ NAV อัตโนมัติสำหรับ ${symbol} — กรุณากรอกเอง` }))
          }
        })
      },
    },
  ],
  server: {
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
      },
      '/api/blockchain': {
        target: 'https://api.blockchair.com',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const active = new URL(`http://localhost${req.url}`).searchParams.get('active')
            if (active) proxyReq.path = `/bitcoin/dashboards/xpub/${encodeURIComponent(active)}?limit=0`
          })
        },
      },
      '/api/tv': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tv/, ''),
      },
      '/api/mempool': {
        target: 'https://mempool.space',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mempool/, '/api'),
      },
      '/api/solana': {
        target: 'https://api.mainnet-beta.solana.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/solana/, ''),
      },
    },
  },
})
