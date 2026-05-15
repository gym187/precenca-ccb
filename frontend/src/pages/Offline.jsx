import { WifiOff } from 'lucide-react'

export default function Offline() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gelo dark:bg-stone-950 px-4">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <WifiOff size={48} className="text-stone-400 dark:text-stone-500" />
        </div>
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">
          Sem conexão
        </h1>
        <p className="text-stone-500 dark:text-stone-400 mb-6">
          Verifique sua internet e tente novamente.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
