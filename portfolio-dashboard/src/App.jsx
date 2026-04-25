import { useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { PortfolioProvider } from './context/PortfolioContext'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'
import SummaryCards from './components/Dashboard/SummaryCards'
import AllocationChart from './components/Dashboard/AllocationChart'
import PortfolioChart from './components/Dashboard/PortfolioChart'
import AssetTable from './components/Dashboard/AssetTable'
import AddPortfolioModal from './components/Modals/AddPortfolioModal'
import AddAssetModal from './components/Modals/AddAssetModal'
import TransactionModal from './components/Modals/TransactionModal'
import TransactionHistoryModal from './components/Modals/TransactionHistoryModal'
import ImportWalletModal from './components/Modals/ImportWalletModal'

export default function App() {
  const [showAddPortfolio, setShowAddPortfolio] = useState(false)
  const [showImportWallet, setShowImportWallet] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [txAsset, setTxAsset] = useState(null)
  const [historyAsset, setHistoryAsset] = useState(null)

  return (
    <ThemeProvider>
      <PortfolioProvider>
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
          <Sidebar onAddPortfolio={() => setShowAddPortfolio(true)} />

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Header onAddAsset={() => setEditingAsset({})} onImportWallet={() => setShowImportWallet(true)} />

            <main className="flex-1 overflow-y-auto p-5 space-y-5">
              <SummaryCards />
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-2">
                  <AssetTable
                    onEditAsset={a => setEditingAsset(a)}
                    onAddTransaction={a => setTxAsset(a)}
                    onViewHistory={a => setHistoryAsset(a)}
                  />
                </div>
                <AllocationChart />
              </div>
              <PortfolioChart />
            </main>
          </div>
        </div>

        {showAddPortfolio && <AddPortfolioModal onClose={() => setShowAddPortfolio(false)} />}
        {showImportWallet && <ImportWalletModal onClose={() => setShowImportWallet(false)} />}
        {editingAsset !== null && (
          <AddAssetModal
            asset={Object.keys(editingAsset).length === 0 ? null : editingAsset}
            onClose={() => setEditingAsset(null)}
          />
        )}
        {txAsset && <TransactionModal asset={txAsset} onClose={() => setTxAsset(null)} />}
        {historyAsset && (
          <TransactionHistoryModal
            asset={historyAsset}
            onClose={() => setHistoryAsset(null)}
            onAddTransaction={() => { setTxAsset(historyAsset); setHistoryAsset(null) }}
          />
        )}
      </PortfolioProvider>
    </ThemeProvider>
  )
}
