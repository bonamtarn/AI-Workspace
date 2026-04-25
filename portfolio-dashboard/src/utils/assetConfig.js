export const ASSET_TYPES = {
  crypto:      { label: 'Crypto',      color: '#f59e0b', bgColor: 'bg-amber-500/20 text-amber-400' },
  gold:        { label: 'Gold',        color: '#eab308', bgColor: 'bg-yellow-500/20 text-yellow-400' },
  stock:       { label: 'Stock',       color: '#3b82f6', bgColor: 'bg-blue-500/20 text-blue-400' },
  etf:         { label: 'ETF',         color: '#8b5cf6', bgColor: 'bg-violet-500/20 text-violet-400' },
  mutual_fund: { label: 'Mutual Fund', color: '#22c55e', bgColor: 'bg-green-500/20 text-green-400' },
}

export const COINGECKO_IDS = {
  BTC:  'bitcoin',
  ETH:  'ethereum',
  SOL:  'solana',
  USDT: 'tether',
  USDC: 'usd-coin',
  BNB:  'binancecoin',
  XRP:  'ripple',
  ADA:  'cardano',
  AVAX: 'avalanche-2',
  DOT:  'polkadot',
  MATIC:'matic-network',
  LINK: 'chainlink',
  XAUT: 'tether-gold',
  PAXG: 'pax-gold',
}

export const PRESET_ASSETS = {
  crypto: [
    { symbol: 'BTC',  name: 'Bitcoin' },
    { symbol: 'ETH',  name: 'Ethereum' },
    { symbol: 'SOL',  name: 'Solana' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'BNB',  name: 'BNB' },
    { symbol: 'XRP',  name: 'XRP' },
    { symbol: 'ADA',  name: 'Cardano' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'LINK', name: 'Chainlink' },
  ],
  gold: [
    { symbol: 'XAUT', name: 'Tether Gold' },
    { symbol: 'PAXG', name: 'PAX Gold' },
  ],
  stock: [
    { symbol: 'SCB',   name: 'SCB',           yahooSymbol: 'SCB.BK' },
    { symbol: 'KKP',   name: 'Kiatnakin Phatra Bank', yahooSymbol: 'KKP.BK' },
    { symbol: 'KBANK', name: 'Kasikorn Bank',  yahooSymbol: 'KBANK.BK' },
    { symbol: 'TISCO', name: 'TISCO Bank',     yahooSymbol: 'TISCO.BK' },
    { symbol: 'KTB',   name: 'Krungthai Bank', yahooSymbol: 'KTB.BK' },
  ],
  etf: [
    { symbol: 'IVV',  name: 'iShares S&P 500', yahooSymbol: 'IVV' },
    { symbol: 'QQQM', name: 'Invesco Nasdaq',  yahooSymbol: 'QQQM' },
  ],
  mutual_fund: [
    { symbol: 'SCBBANKINGE', name: 'SCB Banking E' },
    { symbol: 'SCBGOLDHE',   name: 'SCB Gold H E' },
    { symbol: 'K-GDRMF',     name: 'K Gold RMF' },
  ],
}
