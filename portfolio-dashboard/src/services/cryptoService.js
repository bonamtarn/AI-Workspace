const BASE = 'https://api.coingecko.com/api/v3'

export async function fetchCryptoPrices(coinIds) {
  if (!coinIds?.length) return {}
  const url = `${BASE}/simple/price?ids=${coinIds.join(',')}&vs_currencies=thb,usd&include_24hr_change=true`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(res.status)
    return await res.json()
  } catch (err) {
    console.warn('CoinGecko fetch failed:', err.message)
    return {}
  }
}
