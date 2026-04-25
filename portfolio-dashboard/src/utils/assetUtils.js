export function computeAssetStats(transactions) {
  if (!transactions?.length) return null
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))
  let qty = 0, totalCost = 0, realizedPnL = 0
  for (const tx of sorted) {
    if (tx.type === 'buy') {
      totalCost += tx.quantity * tx.pricePerUnit
      qty += tx.quantity
    } else {
      const avgCost = qty > 0 ? totalCost / qty : 0
      realizedPnL += tx.quantity * (tx.pricePerUnit - avgCost)
      if (qty > 0) totalCost *= (qty - tx.quantity) / qty
      qty = Math.max(0, qty - tx.quantity)
    }
  }
  return {
    quantity: qty,
    avgCostTHB: qty > 0 ? totalCost / qty : 0,
    realizedPnL,
  }
}

export function getAssetStats(asset) {
  if (asset.transactions?.length > 0) return computeAssetStats(asset.transactions)
  return { quantity: asset.quantity, avgCostTHB: asset.avgCostTHB, realizedPnL: 0 }
}
