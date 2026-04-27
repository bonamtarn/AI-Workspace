import { useState } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { getAssetStats } from '../../utils/assetUtils'
import { BarChart2, PlusCircle, Trash2, Pencil, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCompact } from '../../utils/formatters'

function PortfolioItem({ p, isActive, onSelect, onDelete, dispatch, getAssetPriceTHB }) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(p.name)

  const val = p.assets.reduce((sum, a) => {
    const stats = getAssetStats(a)
    const price = getAssetPriceTHB(a)
    return sum + (price ?? stats.avgCostTHB) * stats.quantity
  }, 0)

  const saveName = () => {
    const trimmed = draftName.trim()
    if (trimmed && trimmed !== p.name) dispatch({ type: 'UPDATE_PORTFOLIO', payload: { id: p.id, name: trimmed } })
    else setDraftName(p.name)
    setEditing(false)
  }

  const cancelEdit = () => { setDraftName(p.name); setEditing(false) }

  return (
    <div
      onClick={!editing ? onSelect : undefined}
      className={`px-3 py-2.5 rounded-lg transition-all cursor-pointer group relative ${
        isActive
          ? 'bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />

        {editing ? (
          <input
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEdit() }}
            onClick={e => e.stopPropagation()}
            autoFocus
            className="flex-1 bg-white dark:bg-slate-700 border border-blue-400 rounded px-1.5 py-0.5 text-sm text-slate-900 dark:text-white focus:outline-none min-w-0"
          />
        ) : (
          <span className={`text-sm font-medium truncate flex-1 ${isActive ? 'text-blue-700 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
            {p.name}
          </span>
        )}

        {editing ? (
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={saveName} className="text-green-500 hover:text-green-400 p-0.5"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
            <button onClick={e => { e.stopPropagation(); setEditing(true) }} className="text-slate-400 hover:text-blue-500 p-0.5 transition-colors" title="Rename">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete() }} className="text-slate-400 hover:text-red-500 p-0.5 transition-colors" title="Delete portfolio">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-1 pl-5">
        <span className="text-xs text-slate-400 dark:text-slate-500">{p.assets.length} assets</span>
        <span className={`text-xs font-semibold ${isActive ? 'text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
          {formatCompact(val)}
        </span>
      </div>
    </div>
  )
}

export default function Sidebar({ isOpen, onToggle, onAddPortfolio }) {
  const { portfolios, activePortfolio, dispatch, getAssetPriceTHB } = usePortfolio()

  return (
    <div className={`
      fixed inset-y-0 left-0 z-30 md:relative md:inset-auto md:z-auto
      bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0
      transition-all duration-300
      ${isOpen ? 'w-60 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-12'}
    `}>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-5 z-10 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white shadow-sm transition-colors"
      >
        {isOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-hidden">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <BarChart2 className="w-4 h-4 text-white" />
        </div>
        {isOpen && (
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 dark:text-white">Portfolio</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">by Amy & Rika</div>
          </div>
        )}
      </div>

      {/* Portfolio list */}
      {isOpen && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-3">My Portfolios</p>
            {portfolios.map(p => (
              <PortfolioItem
                key={p.id} p={p}
                isActive={p.id === activePortfolio?.id}
                onSelect={() => dispatch({ type: 'SET_ACTIVE', payload: p.id })}
                onDelete={() => {
                  if (portfolios.length <= 1) return
                  if (confirm(`Delete portfolio "${p.name}"?`)) dispatch({ type: 'DELETE_PORTFOLIO', payload: p.id })
                }}
                dispatch={dispatch}
                getAssetPriceTHB={getAssetPriceTHB}
              />
            ))}
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <button onClick={onAddPortfolio}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 rounded-lg transition-all">
              <PlusCircle className="w-3.5 h-3.5" /> Add Portfolio
            </button>
          </div>
        </>
      )}

      {/* Collapsed: show portfolio dots */}
      {!isOpen && (
        <div className="flex-1 flex flex-col items-center pt-4 gap-2">
          {portfolios.map(p => (
            <button
              key={p.id}
              onClick={() => dispatch({ type: 'SET_ACTIVE', payload: p.id })}
              title={p.name}
              className={`w-2.5 h-2.5 rounded-full transition-all ${p.id === activePortfolio?.id ? 'scale-150' : 'opacity-50 hover:opacity-100'}`}
              style={{ backgroundColor: p.color }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
