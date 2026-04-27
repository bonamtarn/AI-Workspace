export async function fetchGoldBarSellPrice() {
  const r = await fetch('/api/goldprice')
  if (!r.ok) throw new Error(`ดึงราคาทองไม่ได้ (${r.status})`)
  const data = await r.json()
  if (data.error) throw new Error(data.error)
  return data // { price, source, date }
}
