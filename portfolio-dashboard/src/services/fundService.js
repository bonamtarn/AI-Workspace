export async function fetchMutualFundNAV(symbol) {
  const res = await fetch(`/api/fundnav?symbol=${encodeURIComponent(symbol.toUpperCase())}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `ไม่พบ NAV สำหรับ ${symbol}`)
  return { nav: data.nav, source: data.source, date: data.date }
}
