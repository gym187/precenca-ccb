import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cross, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { error } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.erro ?? 'Erro ao realizar login.'
      error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gelo dark:bg-stone-950 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-bege dark:bg-stone-800 rounded-full opacity-40 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-stone-200 dark:bg-stone-800 rounded-full opacity-30 -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-stone-800 dark:bg-stone-700 rounded-2xl mb-4 shadow-lg">
            <Cross size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">CCB</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            Congregação Cristã no Brasil
          </p>
          <p className="text-stone-400 dark:text-stone-500 text-xs mt-0.5">
            Sistema de Controle de Presença
          </p>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-md">
          <h2 className="text-base font-semibold text-stone-700 dark:text-stone-200 mb-6">
            Acesse sua conta
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                className="input"
                placeholder="usuario@ccb.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          © {new Date().getFullYear()} CCB — Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
