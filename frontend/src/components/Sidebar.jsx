import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Baby,
  ClipboardCheck,
  Building2,
  Users,
  LogOut,
  Cross,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/presencas', label: 'Presenças', icon: ClipboardCheck },
  { to: '/criancas', label: 'Jovens e Menores', icon: Baby },
  { to: '/continuacoes', label: 'Continuações', icon: Building2 },
  { to: '/usuarios', label: 'Usuários', icon: Users, adminOnly: true },
]

export default function Sidebar() {
  const { usuario, isAdminGeral, logout } = useAuth()

  const items = navItems.filter((item) => !item.adminOnly || isAdminGeral)

  return (
    <aside className="w-60 bg-white border-r border-stone-200 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-stone-800 rounded-lg flex items-center justify-center shrink-0">
            <Cross size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-800 leading-tight">CCB</p>
            <p className="text-xs text-stone-500 leading-tight">Controle de Presença</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-0.5">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-stone-100 text-stone-900 font-semibold'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800 font-medium'
                  }`
                }
              >
                <Icon size={17} className="shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Usuário + Logout */}
      <div className="px-3 py-4 border-t border-stone-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-stone-600 uppercase">
              {usuario?.nome?.[0] ?? 'U'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-800 truncate">{usuario?.nome}</p>
            <p className="text-xs text-stone-400 truncate">{usuario?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-stone-500 hover:bg-red-50 hover:text-red-600 transition-colors font-medium"
        >
          <LogOut size={17} />
          Sair
        </button>
      </div>
    </aside>
  )
}
