export const ASSET_TYPES = {
  crypto:      { label: 'Crypto',      color: '#a855f7', bgColor: 'bg-purple-500/20 text-purple-400' },
  gold:        { label: 'Gold',        color: '#eab308', bgColor: 'bg-yellow-500/20 text-yellow-400' },
  stock:       { label: 'Stock',       color: '#3b82f6', bgColor: 'bg-blue-500/20 text-blue-400' },
  etf:         { label: 'ETF',         color: '#ec4899', bgColor: 'bg-pink-500/20 text-pink-400' },
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
