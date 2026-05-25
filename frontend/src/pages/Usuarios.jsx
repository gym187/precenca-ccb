import { useEffect, useState } from 'react'
import { Plus, Trash2, Shield, UserPlus, BookOpen } from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'
import { useToast } from '../contexts/ToastContext'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [continuacoes, setContinuacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(null)
  const [showContModal, setShowContModal] = useState(null) // usuário selecionado para gerenciar continuações
  const [contModalData, setContModalData] = useState([])  // continuações atribuídas ao usuário selecionado
  const [form, setForm] = useState({ nome: '', email: '', senha: '' })
  const [roleId, setRoleId] = useState('')
  const [contId, setContId] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const { success, error } = useToast()

  const fetchTudo = async () => {
    const [uRes, rRes, cRes] = await Promise.all([
      api.get('/usuarios'),
      api.get('/roles'),
      api.get('/continuacoes'),
    ])
    setUsuarios(uRes.data)
    setRoles(rRes.data)
    setContinuacoes(cRes.data)
  }

  useEffect(() => {
    fetchTudo().finally(() => setLoading(false))
  }, [])

  const criarUsuario = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      await api.post('/usuarios', form)
      success('Usuário criado!')
      setShowModal(false)
      setForm({ nome: '', email: '', senha: '' })
      fetchTudo()
    } catch (err) {
      const detalhes = err.response?.data?.detalhes
      if (detalhes?.length) {
        error(detalhes.map((d) => d.mensagem).join(' | '))
      } else {
        error(err.response?.data?.erro ?? 'Erro ao criar.')
      }
    } finally {
      setSalvando(false)
    }
  }

  const atribuirRole = async () => {
    if (!roleId) return
    setSalvando(true)
    try {
      await api.post(`/usuarios/${showRoleModal.id}/roles`, { roleId })
      success('Role atribuída!')
      setShowRoleModal(null)
      setRoleId('')
      fetchTudo()
    } catch (err) {
      error(err.response?.data?.erro ?? 'Erro ao atribuir role.')
    } finally {
      setSalvando(false)
    }
  }

  // ─── Continuações ───────────────────────────────────────────────────────────

  const abrirContModal = async (u) => {
    setShowContModal(u)
    setContId('')
    const res = await api.get(`/usuarios/${u.id}/continuacoes`)
    setContModalData(res.data)
  }

  const atribuirContinuacao = async () => {
    if (!contId) return
    setSalvando(true)
    try {
      const res = await api.post(`/usuarios/${showContModal.id}/continuacoes`, { continuacaoId: contId })
      setContModalData(res.data)
      setContId('')
      success('Continuação atribuída!')
    } catch (err) {
      error(err.response?.data?.erro ?? 'Erro ao atribuir.')
    } finally {
      setSalvando(false)
    }
  }

  const removerContinuacao = async (contIdRemover) => {
    try {
      const res = await api.delete(`/usuarios/${showContModal.id}/continuacoes/${contIdRemover}`)
      setContModalData(res.data)
      success('Continuação removida.')
    } catch (err) {
      error(err.response?.data?.erro ?? 'Erro ao remover.')
    }
  }

  const removerRole = async (usuarioId, rId) => {
    try {
      await api.delete(`/usuarios/${usuarioId}/roles/${rId}`)
      success('Role removida.')
      fetchTudo()
    } catch (err) {
      error(err.response?.data?.erro ?? 'Erro ao remover role.')
    }
  }

  const deletarUsuario = async (id) => {
    try {
      await api.delete(`/usuarios/${id}`)
      success('Usuário removido.')
      setConfirmDelete(null)
      fetchTudo()
    } catch (err) {
      error(err.response?.data?.erro ?? 'Erro ao remover.')
    }
  }

  return (
    <div className="px-4 py-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Gerenciamento de usuários e permissões
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Novo usuário
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="block sm:hidden divide-y divide-stone-100 dark:divide-stone-700">
              {usuarios.length === 0 ? (
                <p className="text-center text-stone-400 py-10 text-sm px-4">Nenhum usuário encontrado.</p>
              ) : (
                usuarios.map((u) => (
                  <div key={u.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-stone-500 dark:text-stone-300 uppercase">{u.nome[0]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-stone-800 dark:text-stone-100 truncate">{u.nome}</p>
                        <p className="text-xs text-stone-400 mt-0.5 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
                      {u.roles?.map((r) => (
                        <span
                          key={r.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            r.fixa ? 'bg-stone-800 text-white' : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {r.fixa && <Shield size={10} />}
                          {r.nome}
                          {!r.fixa && (
                            <button onClick={() => removerRole(u.id, r.id)} className="ml-0.5 hover:text-red-500 transition-colors">×</button>
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-3">
                      <button
                        onClick={() => abrirContModal(u)}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 transition-colors"
                        title="Gerenciar continuações"
                      >
                        <BookOpen size={15} />
                      </button>
                      <button
                        onClick={() => setShowRoleModal(u)}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 transition-colors"
                        title="Atribuir role"
                      >
                        <UserPlus size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u)}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="min-w-full divide-y divide-stone-100">
                <thead>
                  <tr>
                    <th className="table-header">Usuário</th>
                    <th className="table-header hidden md:table-cell">E-mail</th>
                    <th className="table-header">Roles</th>
                    <th className="table-header text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="table-cell text-center text-stone-400 py-10">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((u) => (
                      <tr key={u.id} className="hover:bg-stone-50">
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-stone-500 uppercase">
                                {u.nome[0]}
                              </span>
                            </div>
                            <span className="font-medium text-stone-800">{u.nome}</span>
                          </div>
                        </td>
                        <td className="table-cell hidden md:table-cell text-stone-500">{u.email}</td>
                        <td className="table-cell">
                          <div className="flex flex-wrap gap-1.5">
                            {u.roles?.map((r) => (
                              <span
                                key={r.id}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  r.fixa
                                    ? 'bg-stone-800 text-white'
                                    : 'bg-stone-100 text-stone-600'
                                }`}
                              >
                                {r.fixa && <Shield size={10} />}
                                {r.nome}
                                {!r.fixa && (
                                  <button
                                    onClick={() => removerRole(u.id, r.id)}
                                    className="ml-0.5 hover:text-red-500 transition-colors"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => abrirContModal(u)}
                              className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
                              title="Gerenciar continuações"
                            >
                              <BookOpen size={15} />
                            </button>
                            <button
                              onClick={() => setShowRoleModal(u)}
                              className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
                              title="Atribuir role"
                            >
                              <UserPlus size={15} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(u)}
                              className="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Remover"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal criar usuário */}
      {showModal && (
        <Modal title="Novo Usuário" onClose={() => setShowModal(false)} size="sm">
          <form onSubmit={criarUsuario} className="space-y-4">
            <div>
              <label className="label">Nome *</label>
              <input
                className="input"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="label">E-mail *</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="label">Senha *</label>
              <input
                type="password"
                className="input"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                required
                placeholder="Mín. 8 caracteres, 1 maiúscula, 1 número"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className="btn-primary">
                {salvando ? 'Criando...' : 'Criar usuário'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal atribuir role */}
      {showRoleModal && (
        <Modal
          title={`Atribuir role — ${showRoleModal.nome}`}
          onClose={() => setShowRoleModal(null)}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="label">Selecione a role</label>
              <select
                className="input"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {roles
                  .filter((r) => !showRoleModal.roles?.find((ur) => ur.id === r.id))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRoleModal(null)} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={atribuirRole} disabled={!roleId || salvando} className="btn-primary">
                Atribuir
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <Modal title="Remover usuário" onClose={() => setConfirmDelete(null)} size="sm">
          <p className="text-sm text-stone-600 mb-5">
            Deseja remover o usuário <strong>{confirmDelete.nome}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={() => deletarUsuario(confirmDelete.id)} className="btn-danger">
              Remover
            </button>
          </div>
        </Modal>
      )}

      {/* Modal gerenciar continuações */}
      {showContModal && (
        <Modal
          title={`Continuações — ${showContModal.nome}`}
          onClose={() => setShowContModal(null)}
        >
          <div className="space-y-4">
            <p className="text-xs text-stone-400">
              ADMIN_GERAL acessa todas automaticamente. Os demais usuários só veem as continuações listadas aqui.
            </p>

            {/* Lista atribuída */}
            <div className="space-y-1">
              {contModalData.length === 0 ? (
                <p className="text-sm text-stone-400 italic py-2">Nenhuma continuação atribuída.</p>
              ) : (
                contModalData.map((uc) => (
                  <div
                    key={uc.continuacaoId}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-50 border border-stone-100"
                  >
                    <span className="text-sm font-medium text-stone-700">{uc.continuacao.nome}</span>
                    <button
                      onClick={() => removerContinuacao(uc.continuacaoId)}
                      className="text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Adicionar nova */}
            <div className="flex gap-2 pt-1 border-t border-stone-100">
              <select
                className="input flex-1"
                value={contId}
                onChange={(e) => setContId(e.target.value)}
              >
                <option value="">Adicionar continuação...</option>
                {continuacoes
                  .filter((c) => !contModalData.find((uc) => uc.continuacaoId === c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>
              <button
                onClick={atribuirContinuacao}
                disabled={!contId || salvando}
                className="btn-primary shrink-0"
              >
                <Plus size={15} /> Adicionar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
