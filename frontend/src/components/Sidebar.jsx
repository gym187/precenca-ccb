import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Baby,
  ClipboardCheck,
  Building2,
  Users,
  LogOut,
  Cross,
  FileText,
  MapPin,
  Sun,
  Moon,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/presencas', label: 'Presenças', icon: ClipboardCheck },
  { to: '/criancas', label: 'Jovens e Menores', icon: Baby },
  { to: '/continuacoes', label: 'Continuações', icon: Building2 },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
  { to: '/visitas', label: 'Visitas', icon: MapPin },
  { to: '/usuarios', label: 'Usuários', icon: Users, adminOnly: true },
]

export default function Sidebar({ open, onClose }) {
  const { usuario, isAdminGeral, logout } = useAuth()
  const { dark, toggleTheme } = useTheme()

  const items = navItems.filter((item) => !item.adminOnly || isAdminGeral)

  return (
    <aside
      className={`
        fixed md:sticky top-0 left-0 z-40
        w-60 bg-white dark:bg-stone-900
        border-r border-stone-200 dark:border-stone-700
        flex flex-col h-screen shrink-0
        transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-stone-800 dark:bg-stone-700 rounded-lg flex items-center justify-center shrink-0">
            <Cross size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-800 dark:text-stone-100 leading-tight">CCB</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-tight">Controle de Presença</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-0.5">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/60 hover:text-stone-800 dark:hover:text-stone-200 font-medium'
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

      {/* Usuário + Logout + Toggle tema */}
      <div className="px-3 py-4 border-t border-stone-100 dark:border-stone-700">
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase">
              {usuario?.nome?.[0] ?? 'U'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">{usuario?.nome}</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{usuario?.email}</p>
          </div>
          <button
            onClick={toggleTheme}
            title={dark ? 'Modo claro' : 'Modo escuro'}
            className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-stone-500 dark:text-stone-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors font-medium"
        >
          <LogOut size={17} />
          Sair
        </button>
      </div>
    </aside>
  )
}
