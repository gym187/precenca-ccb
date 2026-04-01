import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('ccb_token')
    if (!token) {
      setCarregando(false)
      return
    }
    api
      .get('/auth/me')
      .then((res) => setUsuario(res.data))
      .catch(() => localStorage.removeItem('ccb_token'))
      .finally(() => setCarregando(false))
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('ccb_token', res.data.token)
    // Após login, busca o perfil completo (com continuações)
    const me = await api.get('/auth/me')
    setUsuario(me.data)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('ccb_token')
    setUsuario(null)
  }

  const isAdminGeral = usuario?.isAdminGeral ?? usuario?.roles?.includes('ADMIN_GERAL') ?? false

  const temPermissao = (perm) => {
    if (isAdminGeral) return true
    return usuario?.permissoes?.includes(perm) ?? false
  }

  const temAcessoContinuacao = (continuacaoId) => {
    if (!usuario) return false
    if (isAdminGeral || usuario?.todasContinuacoes) return true
    return usuario?.continuacoes?.includes(continuacaoId) ?? false
  }

  return (
    <AuthContext.Provider
      value={{ usuario, carregando, isAdminGeral, login, logout, temPermissao, temAcessoContinuacao }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
