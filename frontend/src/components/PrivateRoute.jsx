import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function PrivateRoute() {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="flex h-screen items-center justify-center bg-gelo">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          <span className="text-sm text-stone-500">Carregando...</span>
        </div>
      </div>
    )
  }

  return usuario ? <Outlet /> : <Navigate to="/login" replace />
}
