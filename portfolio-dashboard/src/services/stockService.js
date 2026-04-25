export async function fetchStockPrices(symbols) {
  if (!symbols?.length) return {}
  const results = {}
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const url = `/api/yahoo/v8/finance/chart/${symbol}?interval=1d&range=1d`
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()
        const meta = data?.chart?.result?.[0]?.meta
        if (!meta) return
        const price = meta.regularMarketPrice
        const prev = meta.previousClose || meta.chartPreviousClose
        results[symbol] = {
          price,
          change24h: prev ? ((price - prev) / prev) * 100 : 0,
          currency: meta.currency || 'THB',
          name: meta.shortName || symbol,
        }
      } catch {
        // silently skip failed symbols
      }
    })
  )
  return results
}
