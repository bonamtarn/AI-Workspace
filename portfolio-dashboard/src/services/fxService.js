export async function fetchUsdToThb() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) throw new Error(res.status)
    const data = await res.json()
    const rate = data?.rates?.THB
    if (rate && rate > 0) return rate
  } catch (err) {
    console.warn('FX rate fetch failed:', err.message)
  }
  return null
}
