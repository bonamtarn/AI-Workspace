const thbFmt = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatTHB = (v) => (v == null || isNaN(v)) ? '—' : thbFmt.format(v)
export const formatUSD = (v) => (v == null || isNaN(v)) ? '—' : usdFmt.format(v)

export const formatPercent = (v) => {
  if (v == null || isNaN(v)) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

export const formatNumber = (v, maxDec = 8) => {
  if (v == null || isNaN(v)) return '—'
  return parseFloat(v.toFixed(maxDec)).toLocaleString('en-US', { maximumFractionDigits: maxDec })
}

export const formatCompact = (v) => {
  if (v == null || isNaN(v)) return '—'
  if (Math.abs(v) >= 1e9) return `฿${(v / 1e9).toFixed(2)}B`
  if (Math.abs(v) >= 1e6) return `฿${(v / 1e6).toFixed(2)}M`
  if (Math.abs(v) >= 1e3) return `฿${(v / 1e3).toFixed(2)}K`
  return formatTHB(v)
}
