import { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react'
import { fetchCryptoPrices } from '../services/cryptoService'
import { fetchStockPrices } from '../services/stockService'
import { fetchUsdToThb } from '../services/fxService'
import { COINGECKO_IDS } from '../utils/assetConfig'

const Ctx = createContext(null)
export const STORAGE_KEY = 'portfolio_dashboard_v1'

const DEFAULT_PORTFOLIOS = [
  {
    id: 'portfolio-poy',
    name: "Poy's Portfolio",
    owner: 'Poy',
    color: '#3b82f6',
    assets: [
      { id: 'a1', symbol: 'BTC',  name: 'Bitcoin',     type: 'crypto', quantity: 0.1,   avgCostTHB: 3200000 },
      { id: 'a2', symbol: 'ETH',  name: 'Ethereum',    type: 'crypto', quantity: 1.5,   avgCostTHB: 110000  },
      { id: 'a3', symbol: 'SOL',  name: 'Solana',      type: 'crypto', quantity: 10,    avgCostTHB: 6000    },
      { id: 'a4', symbol: 'USDT', name: 'Tether',      type: 'crypto', quantity: 5000,  avgCostTHB: 34      },
      { id: 'a5', symbol: 'XAUT', name: 'Tether Gold', type: 'gold',   quantity: 0.5,   avgCostTHB: 110000  },
      { id: 'a6', symbol: 'PAXG', name: 'PAX Gold',    type: 'gold',   quantity: 0.3,   avgCostTHB: 112000  },
    ],
  },
  {
    id: 'portfolio-family',
    name: 'Family Portfolio',
    owner: 'Family',
    color: '#22c55e',
    assets: [
      { id: 'b1', symbol: 'PTT',   name: 'PTT',          type: 'stock', yahooSymbol: 'PTT.BK',   quantity: 1000, avgCostTHB: 35  },
      { id: 'b2', symbol: 'KBANK', name: 'Kasikorn Bank', type: 'stock', yahooSymbol: 'KBANK.BK', quantity: 200,  avgCostTHB: 145 },
      { id: 'b3', symbol: 'SPY',   name: 'SPDR S&P 500',  type: 'etf',   yahooSymbol: 'SPY',      quantity: 5,    avgCostTHB: 19000 },
    ],
  },
]

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_PORTFOLIO':
      return { ...state, portfolios: [...state.portfolios, action.payload] }
    case 'UPDATE_PORTFOLIO':
      return { ...state, portfolios: state.portfolios.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) }
    case 'DELETE_PORTFOLIO': {
      const remaining = state.portfolios.filter(p => p.id !== action.payload)
      return { portfolios: remaining, activeId: remaining[0]?.id ?? null }
    }
    case 'SET_ACTIVE':
      return { ...state, activeId: action.payload }
    case 'ADD_ASSET':
      return {
        ...state,
        portfolios: state.portfolios.map(p =>
          p.id === action.payload.portfolioId ? { ...p, assets: [...p.assets, action.payload.asset] } : p
        ),
      }
    case 'UPDATE_ASSET':
      return {
        ...state,
        portfolios: state.portfolios.map(p =>
          p.id === action.payload.portfolioId
            ? { ...p, assets: p.assets.map(a => a.id === action.payload.asset.id ? action.payload.asset : a) }
            : p
        ),
      }
    case 'DELETE_ASSET':
      return {
        ...state,
        portfolios: state.portfolios.map(p =>
          p.id === action.payload.portfolioId
            ? { ...p, assets: p.assets.filter(a => a.id !== action.payload.assetId) }
            : p
        ),
      }
    case 'ADD_TRANSACTION':
      return {
        ...state,
        portfolios: state.portfolios.map(p =>
          p.id === action.payload.portfolioId
            ? {
                ...p,
                assets: p.assets.map(a =>
                  a.id === action.payload.assetId
                    ? { ...a, transactions: [...(a.transactions || []), action.payload.transaction] }
                    : a
                ),
              }
            : p
        ),
      }
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        portfolios: state.portfolios.map(p =>
          p.id === action.payload.portfolioId
            ? {
                ...p,
                assets: p.assets.map(a =>
                  a.id === action.payload.assetId
                    ? { ...a, transactions: (a.transactions || []).filter(t => t.id !== action.payload.txId) }
                    : a
                ),
              }
            : p
        ),
      }
    default:
      return state
  }
}

export function PortfolioProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    try {
      const s = localStorage.getItem(STORAGE_KEY)
      if (s) return JSON.parse(s)
    } catch {}
    return { portfolios: DEFAULT_PORTFOLIOS, activeId: DEFAULT_PORTFOLIOS[0].id }
  })

  const [prices, setPrices] = useState({})
  const [stockPrices, setStockPrices] = useState({})
  const [usdToThb, setUsdToThb] = useState(34)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const allAssets = state.portfolios.flatMap(p => p.assets)

  const refreshPrices = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const cryptoAssets = allAssets.filter(a => a.type === 'crypto' || a.type === 'gold')
      const coinIds = [...new Set(cryptoAssets.map(a => COINGECKO_IDS[a.symbol]).filter(Boolean))]

      const stockAssets = allAssets.filter(a => a.type === 'stock' || a.type === 'etf')
      const yahooSymbols = [...new Set(stockAssets.map(a => a.yahooSymbol).filter(Boolean))]

      const [cryptoData, stockData, fxRate] = await Promise.all([
        fetchCryptoPrices(coinIds),
        fetchStockPrices(yahooSymbols),
        fetchUsdToThb(),
      ])

      setPrices(cryptoData)
      setStockPrices(stockData)
      if (fxRate) setUsdToThb(fxRate)
      setLastUpdated(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }, [allAssets.map(a => a.id).join(',')])

  useEffect(() => {
    refreshPrices()
    const id = setInterval(refreshPrices, 60000)
    return () => clearInterval(id)
  }, [refreshPrices])

  const getAssetPriceTHB = useCallback((asset) => {
    if (asset.type === 'crypto' || asset.type === 'gold') {
      const id = COINGECKO_IDS[asset.symbol]
      if (id && prices[id]) return prices[id].thb ?? (prices[id].usd ? prices[id].usd * usdToThb : null)
    } else if (asset.type === 'stock' || asset.type === 'etf') {
      const sym = asset.yahooSymbol || asset.symbol
      if (stockPrices[sym]) {
        const { price, currency } = stockPrices[sym]
        return currency === 'USD' ? price * usdToThb : price
      }
    } else if (asset.type === 'mutual_fund') {
      return asset.manualPriceTHB ?? null
    }
    return null
  }, [prices, stockPrices, usdToThb])

  const get24hChange = useCallback((asset) => {
    if (asset.type === 'crypto' || asset.type === 'gold') {
      const id = COINGECKO_IDS[asset.symbol]
      if (id && prices[id]) return prices[id].thb_24h_change ?? prices[id].usd_24h_change ?? null
    } else if (asset.type === 'stock' || asset.type === 'etf') {
      const sym = asset.yahooSymbol || asset.symbol
      return stockPrices[sym]?.change24h ?? null
    }
    return null
  }, [prices, stockPrices])

  const activePortfolio = state.portfolios.find(p => p.id === state.activeId) ?? state.portfolios[0]

  return (
    <Ctx.Provider value={{ portfolios: state.portfolios, activePortfolio, dispatch, prices, stockPrices, lastUpdated, isRefreshing, refreshPrices, getAssetPriceTHB, get24hChange, usdToThb }}>
      {children}
    </Ctx.Provider>
  )
}

export const usePortfolio = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePortfolio must be inside PortfolioProvider')
  return ctx
}
