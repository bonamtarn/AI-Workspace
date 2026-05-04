// In-memory cache: refresh every 4 hours
let _cache = null
let _cacheAt = 0
const TTL = 4 * 60 * 60 * 1000

// Known funds for providers other than SCBAM (covered by Yuanta NAV fetcher)
const SEED_FUNDS = [
  // Eastspring (ES)
  { code: 'ES-US500',       name: 'Eastspring US 500 Equity Index Fund',          source: 'Eastspring' },
  { code: 'ES-US500RD',     name: 'Eastspring US 500 Equity Index Fund (RD)',      source: 'Eastspring' },
  { code: 'ES-US500-RI',    name: 'Eastspring US 500 Equity Index Fund (RI)',      source: 'Eastspring' },
  { code: 'ES-GINCO-A',     name: 'Eastspring Global Income Fund A',               source: 'Eastspring' },
  { code: 'ES-GINCO-R',     name: 'Eastspring Global Income Fund R (RMF)',         source: 'Eastspring' },
  { code: 'ES-GINCOME-A',   name: 'Eastspring Global Income Fund A',               source: 'Eastspring' },
  { code: 'ES-GRID',        name: 'Eastspring Smart Grid Infrastructure Fund',     source: 'Eastspring' },
  { code: 'ES-GRIDRMF',     name: 'Eastspring Smart Grid Infrastructure RMF',      source: 'Eastspring' },
  { code: 'ES-GTECH',       name: 'Eastspring Global Technology Fund',             source: 'Eastspring' },
  { code: 'ES-GTECHRMF',    name: 'Eastspring Global Technology RMF',              source: 'Eastspring' },
  { code: 'ES-GTECH-RI',    name: 'Eastspring Global Technology Fund (RI)',        source: 'Eastspring' },
  { code: 'ES-JAPAN',       name: 'Eastspring Japan Equity Fund',                  source: 'Eastspring' },
  { code: 'ES-JAPANRMF',    name: 'Eastspring Japan Equity RMF',                   source: 'Eastspring' },
  { code: 'ES-CHINA-A',     name: 'Eastspring China Fund A',                       source: 'Eastspring' },
  { code: 'ES-CHINATRMF',   name: 'Eastspring China Transition RMF',               source: 'Eastspring' },
  { code: 'ES-INDIA-A',     name: 'Eastspring India Equity Fund A',                source: 'Eastspring' },
  { code: 'ES-INDIACRMF',   name: 'Eastspring India Consumer RMF',                 source: 'Eastspring' },
  { code: 'ES-CLMVT',       name: 'Eastspring CLMVT Equity Fund',                  source: 'Eastspring' },
  { code: 'ES-CLMVTRMF',    name: 'Eastspring CLMVT Equity RMF',                   source: 'Eastspring' },
  { code: 'ES-PROPERTY',    name: 'Eastspring Property Fund',                      source: 'Eastspring' },
  { code: 'ES-INCOMEFLEX',  name: 'Eastspring Income Flex Fund',                   source: 'Eastspring' },
  { code: 'ES-INFRA-A',     name: 'Eastspring Infrastructure Fund A',              source: 'Eastspring' },
  { code: 'ES-GQGRMF',      name: 'Eastspring Global Quality Growth RMF',          source: 'Eastspring' },
  { code: 'ES-PVD-FIX',     name: 'Eastspring PVD Fixed Income',                   source: 'Eastspring' },
  { code: 'ES-GOVCP6M55',   name: 'Eastspring Government Bond 6M#55',              source: 'Eastspring' },
  { code: 'ES-GOVCP6M56',   name: 'Eastspring Government Bond 6M#56',              source: 'Eastspring' },
  // Kasikorn (K)
  { code: 'K-GDRMF',        name: 'Kasikorn Gold RMF',                             source: 'Kasikorn' },
  { code: 'K-US500X',       name: 'Kasikorn US 500X Fund',                         source: 'Kasikorn' },
  { code: 'K-US500X-A',     name: 'Kasikorn US 500X Fund A',                       source: 'Kasikorn' },
  { code: 'K-USXNDQ-A(A)',  name: 'Kasikorn US Nasdaq Fund A (Auto Redemption)',   source: 'Kasikorn' },
  { code: 'K-GTECH-A(A)',   name: 'Kasikorn Global Tech Fund A (Auto Redemption)', source: 'Kasikorn' },
  { code: 'K-CSINRMF',      name: 'Kasikorn China CSI 300 RMF',                    source: 'Kasikorn' },
  { code: 'K-JAPANRMF',     name: 'Kasikorn Japan Equity RMF',                     source: 'Kasikorn' },
  { code: 'K-INDIAERMF',    name: 'Kasikorn India Equity RMF',                     source: 'Kasikorn' },
  { code: 'K-FIXEDPLUS-A',  name: 'Kasikorn Fixed Plus Fund A',                    source: 'Kasikorn' },
  { code: 'KFLTF',          name: 'Kasikorn LTF',                                  source: 'Kasikorn' },
  // MFC
  { code: 'MFC-A',          name: 'MFC Asset Management Fund A',                   source: 'MFC' },
  { code: 'M-S500X',        name: 'MFC S&P 500 Extra Fund',                        source: 'MFC' },
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, max-age=3600')

  const now = Date.now()
  if (_cache && now - _cacheAt < TTL) {
    return res.status(200).json(_cache)
  }

  const scbFunds = await fetchSCBAMList()
  const result = [...scbFunds, ...SEED_FUNDS]

  _cache = result
  _cacheAt = now
  return res.status(200).json(result)
}

async function fetchSCBAMList() {
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
    for (const group of data) {
      for (const fund of (group.data || [])) {
        if (!fund.fund_code) continue
        funds.push({
          code: fund.fund_code,
          name: fund.fund_name_th || fund.fund_name_en || fund.fund_name || fund.fund_code,
          source: 'SCBAM',
        })
      }
    }
    return funds
  } catch {
    return []
  }
}
