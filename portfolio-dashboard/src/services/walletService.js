// Bitcoin xpub/ypub/zpub → Blockchair (CORS-enabled, no API key, supports all extended key formats)
// Single address → mempool.space proxy
export async function fetchBTCWallet(input) {
  const key = input.trim()
  const isExtendedKey = /^[xyzXYZ]pub/i.test(key)

  if (isExtendedKey) {
    const res = await fetch(`https://api.blockchair.com/bitcoin/dashboards/xpub/${key}`)
    if (!res.ok) {
      let msg = `Blockchair error (${res.status})`
      try { const d = await res.json(); msg = d.context?.error || msg } catch {}
      throw new Error(msg)
    }
    const data = await res.json()
    const xpubData = data.data?.[key]?.xpub
    if (!xpubData) throw new Error('ไม่พบข้อมูลสำหรับ xpub/zpub นี้ กรุณาตรวจสอบ Extended Key อีกครั้ง')
    return [{ symbol: 'BTC', name: 'Bitcoin', type: 'crypto', quantity: (xpubData.balance ?? 0) / 1e8 }]
  } else {
    const res = await fetch(`/api/mempool/address/${key}`)
    if (!res.ok) {
      let msg = `Mempool error (${res.status})`
      try { const d = await res.json(); msg = d.error || msg } catch {}
      throw new Error(msg)
    }
    const data = await res.json()
    const chain = data.chain_stats ?? {}
    const mem = data.mempool_stats ?? {}
    const satoshis =
      (chain.funded_txo_sum ?? 0) - (chain.spent_txo_sum ?? 0) +
      (mem.funded_txo_sum ?? 0) - (mem.spent_txo_sum ?? 0)
    return [{ symbol: 'BTC', name: 'Bitcoin', type: 'crypto', quantity: satoshis / 1e8 }]
  }
}

// Ethereum + ERC-20 tokens via ethplorer.io (freekey, CORS enabled)
export async function fetchETHWallet(address) {
  const res = await fetch(
    `https://api.ethplorer.io/getAddressInfo/${address.trim()}?apiKey=freekey`
  )
  if (!res.ok) throw new Error(`Ethereum API error (${res.status})`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || 'Invalid Ethereum address')

  const assets = []

  // Native ETH
  const ethBal = parseFloat(data.ETH?.balance) || 0
  if (ethBal > 0) {
    assets.push({ symbol: 'ETH', name: 'Ethereum', type: 'crypto', quantity: ethBal })
  }

  // ERC-20 tokens
  for (const t of data.tokens ?? []) {
    const decimals = parseInt(t.tokenInfo.decimals)
    if (isNaN(decimals) || decimals === 0) continue // skip NFTs
    const quantity = parseFloat(t.balance) / Math.pow(10, decimals)
    if (quantity < 0.0001) continue // skip dust
    assets.push({
      symbol: t.tokenInfo.symbol || t.tokenInfo.address.slice(0, 8),
      name: t.tokenInfo.name || 'Unknown Token',
      type: 'crypto',
      quantity,
    })
  }

  return assets
}

// Solana + SPL tokens via Solana mainnet RPC (proxied through /api/solana to avoid CORS)
export async function fetchSOLWallet(address) {
  const addr = address.trim()
  const call = (method, params) =>
    fetch('/api/solana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    }).then(r => r.json())

  const assets = []

  // Native SOL
  const balData = await call('getBalance', [addr])
  if (balData.error) throw new Error(balData.error.message || 'Invalid Solana address')
  const lamports = balData.result?.value ?? 0
  const solQty = lamports / 1e9
  if (solQty > 0) {
    assets.push({ symbol: 'SOL', name: 'Solana', type: 'crypto', quantity: solQty })
  }

  // SPL tokens
  const tokenData = await call('getTokenAccountsByOwner', [
    addr,
    { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
    { encoding: 'jsonParsed' },
  ])

  const KNOWN_SPL = {
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC',    name: 'USD Coin' },
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT',    name: 'Tether USD' },
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL',    name: 'Marinade SOL' },
    'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': { symbol: 'JitoSOL', name: 'Jito Staked SOL' },
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK',    name: 'Bonk' },
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN':  { symbol: 'JUP',     name: 'Jupiter' },
    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY',     name: 'Raydium' },
    'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE':  { symbol: 'ORCA',    name: 'Orca' },
  }

  for (const acc of tokenData.result?.value ?? []) {
    const info = acc.account.data.parsed.info
    const quantity = info.tokenAmount.uiAmount
    if (!quantity || quantity < 0.000001) continue
    const mint = info.mint
    const known = KNOWN_SPL[mint]
    assets.push({
      symbol: known?.symbol ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`,
      name: known?.name ?? 'Unknown SPL Token',
      type: 'crypto',
      quantity,
      mintAddress: mint,
    })
  }

  if (!assets.length) throw new Error('ไม่พบ SOL หรือ token ใน address นี้')
  return assets
}
