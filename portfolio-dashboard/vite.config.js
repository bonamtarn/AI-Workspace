import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Shared TTL
const FUND_CACHE_TTL = 4 * 60 * 60 * 1000

// Fund list cache
let _fundCache = null
let _fundCacheAt = 0

// KTAM data cache (funds + NAV in one page)
let _ktamCache = null
let _ktamCacheAt = 0

const SEED_FUNDS = [
  // Eastspring
  { code: 'ES-US500',      name: 'Eastspring US 500 Equity Index Fund',         source: 'Eastspring' },
  { code: 'ES-US500RD',    name: 'Eastspring US 500 Equity Index Fund (RD)',     source: 'Eastspring' },
  { code: 'ES-US500-RI',   name: 'Eastspring US 500 Equity Index Fund (RI)',     source: 'Eastspring' },
  { code: 'ES-GINCO-A',    name: 'Eastspring Global Income Fund A',              source: 'Eastspring' },
  { code: 'ES-GINCO-R',    name: 'Eastspring Global Income Fund R (RMF)',        source: 'Eastspring' },
  { code: 'ES-GINCOME-A',  name: 'Eastspring Global Income Fund A',              source: 'Eastspring' },
  { code: 'ES-GRID',       name: 'Eastspring Smart Grid Infrastructure Fund',    source: 'Eastspring' },
  { code: 'ES-GRIDRMF',    name: 'Eastspring Smart Grid Infrastructure RMF',     source: 'Eastspring' },
  { code: 'ES-GTECH',      name: 'Eastspring Global Technology Fund',            source: 'Eastspring' },
  { code: 'ES-GTECHRMF',   name: 'Eastspring Global Technology RMF',             source: 'Eastspring' },
  { code: 'ES-GTECH-RI',   name: 'Eastspring Global Technology Fund (RI)',       source: 'Eastspring' },
  { code: 'ES-JAPAN',      name: 'Eastspring Japan Equity Fund',                 source: 'Eastspring' },
  { code: 'ES-JAPANRMF',   name: 'Eastspring Japan Equity RMF',                  source: 'Eastspring' },
  { code: 'ES-CHINA-A',    name: 'Eastspring China Fund A',                      source: 'Eastspring' },
  { code: 'ES-CHINATRMF',  name: 'Eastspring China Transition RMF',              source: 'Eastspring' },
  { code: 'ES-INDIA-A',    name: 'Eastspring India Equity Fund A',               source: 'Eastspring' },
  { code: 'ES-INDIACRMF',  name: 'Eastspring India Consumer RMF',                source: 'Eastspring' },
  { code: 'ES-CLMVT',      name: 'Eastspring CLMVT Equity Fund',                 source: 'Eastspring' },
  { code: 'ES-CLMVTRMF',   name: 'Eastspring CLMVT Equity RMF',                  source: 'Eastspring' },
  { code: 'ES-PROPERTY',   name: 'Eastspring Property Fund',                     source: 'Eastspring' },
  { code: 'ES-INCOMEFLEX', name: 'Eastspring Income Flex Fund',                  source: 'Eastspring' },
  { code: 'ES-INFRA-A',    name: 'Eastspring Infrastructure Fund A',             source: 'Eastspring' },
  { code: 'ES-GQGRMF',     name: 'Eastspring Global Quality Growth RMF',         source: 'Eastspring' },
  { code: 'ES-PVD-FIX',    name: 'Eastspring PVD Fixed Income',                  source: 'Eastspring' },
  // Kasikorn
  { code: 'K-GDRMF',       name: 'Kasikorn Gold RMF',                            source: 'Kasikorn' },
  { code: 'K-US500X',      name: 'Kasikorn US 500X Fund',                        source: 'Kasikorn' },
  { code: 'K-US500X-A',    name: 'Kasikorn US 500X Fund A',                      source: 'Kasikorn' },
  { code: 'K-GTECH-A(A)',  name: 'Kasikorn Global Tech Fund A',                  source: 'Kasikorn' },
  { code: 'K-CSINRMF',     name: 'Kasikorn China CSI 300 RMF',                   source: 'Kasikorn' },
  { code: 'K-JAPANRMF',    name: 'Kasikorn Japan Equity RMF',                    source: 'Kasikorn' },
  { code: 'K-INDIAERMF',   name: 'Kasikorn India Equity RMF',                    source: 'Kasikorn' },
  { code: 'K-FIXEDPLUS-A', name: 'Kasikorn Fixed Plus Fund A',                   source: 'Kasikorn' },
]

async function getKTAMData() {
  const now = Date.now()
  if (_ktamCache && now - _ktamCacheAt < FUND_CACHE_TTL) return _ktamCache
  const funds = await fetchKTAMFundList()
  if (funds.length > 0) { _ktamCache = funds; _ktamCacheAt = now }
  return funds
}

async function fetchKTAMFundList() {
  try {
    const r = await fetch('https://smarttrade.ktam.co.th/websmarttrade/FundNAV', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!r.ok) return []
    const html = await r.text()
    const funds = []
    // Each fund block sits inside <a href="...FundDetail/CODE">...</a>
    const parts = html.split(/href="[^"]*FundDetail\//)
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]
      const codeMatch = part.match(/^([^\s"'?#&]+)/)
      if (!codeMatch) continue
      const code = codeMatch[1].trim()
      if (!code) continue

      const nameMatch = part.match(/class="fund-name">([^<]+)</)
      const name = nameMatch ? nameMatch[1].trim() : code

      const navMatch = part.match(/class="nav-value">([\d.]+)</)
      const nav = navMatch ? parseFloat(navMatch[1]) : null

      funds.push({ code, name, nav, source: 'KTAM' })
    }
    return funds
  } catch { return [] }
}

async function fetchKTAMNav(symbol) {
  const funds = await getKTAMData()
  const fund = funds.find(f => f.code === symbol)
  if (!fund || fund.nav == null) return null
  return { nav: fund.nav, date: null, source: 'KTAM', symbol }
}

async function fetchSCBAMFundList() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const r = await fetch('https://www.scbam.com/setdatenav', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://www.scbam.com/th/fund/nav/',
        'User-Agent': 'Mozilla/5.0',
      },
      body: `now=${today}&lang_id=2&types=fund`,
    })
    if (!r.ok) return []
    const data = await r.json()
    const funds = []
    for (const group of data)
      for (const fund of (group.data || []))
        if (fund.fund_code)
          funds.push({
            code: fund.fund_code,
            name: fund.fund_name_th || fund.fund_name_en || fund.fund_name || fund.fund_code,
            source: 'SCBAM',
          })
    return funds
  } catch { return [] }
}

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
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Portfolio Dashboard',
        short_name: 'Portfolio',
        description: 'ติดตามพอร์ตลงทุน',
        theme_color: '#a855f7',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-64x64.png',            sizes: '64x64',   type: 'image/png' },
          { src: 'pwa-192x192.png',           sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png',           sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
    {
      name: 'api-dev',
      configureServer(server) {
        server.middlewares.use('/api/goldprice', async (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          try {
            const r = await fetch('https://www.goldtraders.or.th/api/GoldPrices/Latest?readjson=false', {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.goldtraders.or.th/',
                'Accept': 'application/json',
              },
            })
            if (!r.ok) { res.statusCode = 502; return res.end(JSON.stringify({ error: `goldtraders HTTP ${r.status}` })) }
            const data = await r.json()
            const price = data?.bL_SellPrice
            if (!price || isNaN(price) || price <= 0) {
              res.statusCode = 404
              return res.end(JSON.stringify({ error: 'ไม่พบราคาทองคำแท่งราคาขายออก — กรุณากรอกเอง' }))
            }
            res.statusCode = 200
            res.end(JSON.stringify({ price, source: 'goldtraders.or.th' }))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        })

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

        server.middlewares.use('/api/fundlist', async (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          const now = Date.now()
          if (_fundCache && now - _fundCacheAt < FUND_CACHE_TTL) {
            return res.end(JSON.stringify(_fundCache))
          }
          const [scbFunds, ktamFunds] = await Promise.all([
            fetchSCBAMFundList(),
            fetchKTAMFundList(),
          ])
          _fundCache = [...scbFunds, ...ktamFunds, ...SEED_FUNDS]
          _fundCacheAt = now
          res.statusCode = 200
          res.end(JSON.stringify(_fundCache))
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
          if (!result) result = await fetchKTAMNav(symbol)
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
    host: true,
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
