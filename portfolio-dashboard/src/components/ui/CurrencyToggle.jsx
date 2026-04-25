export function CurrencyToggle({ value, onChange, usdToThb, label = 'Price in:' }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        {['THB', 'USD'].map(c => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className={`px-3 py-1 text-xs font-semibold transition-colors ${value === c
              ? 'bg-blue-500 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
            {c}
          </button>
        ))}
      </div>
      {value === 'USD' && <span className="text-xs text-slate-400">1 USD = ฿{usdToThb.toFixed(2)}</span>}
    </div>
  )
}
