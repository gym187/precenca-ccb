import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Cross } from 'lucide-react'
import Sidebar from './Sidebar'
import InstallBanner from './InstallBanner'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gelo dark:bg-stone-950">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-stone-800 dark:bg-stone-700 rounded-md flex items-center justify-center">
              <Cross size={12} className="text-white" />
            </div>
            <span className="text-sm font-bold text-stone-800 dark:text-stone-100">CCB</span>
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <InstallBanner />
    </div>
  )
}
