const _cache = new Map()

function withCache(key, fn, ttlMs = 300_000) {
  const hit = _cache.get(key)
  if (hit && Date.now() - hit.ts < ttlMs) return Promise.resolve(hit.data)
  return fn().then(data => { _cache.set(key, { data, ts: Date.now() }); return data })
}

// Returns [[timestamp_ms, price_thb], ...] or null  — via local TradingView API server
export function fetchTVHistory(symbol, usdToThb, bars = 1825) {
  return withCache(`tv:${symbol}:${bars}`, async () => {
    try {
      const res = await fetch(`/api/tv/history?symbol=${encodeURIComponent(symbol)}&usdthb=${usdToThb}&bars=${bars}`)
      if (!res.ok) return null
      const { data } = await res.json()
      return data ?? null
    } catch { return null }
  })
}

// Returns [[timestamp_ms, nav_thb], ...] or null  — NAV history from WealthMagik
export function fetchWMHistory(fundCode) {
  return withCache(`wm:${fundCode}`, async () => {
    try {
      const res = await fetch(`/api/tv/wm-history?fund=${encodeURIComponent(fundCode)}`)
      if (!res.ok) return null
      const { data } = await res.json()
      return data ?? null
    } catch { return null }
  })
}
