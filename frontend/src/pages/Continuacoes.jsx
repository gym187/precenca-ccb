import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Users, X } from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'
import { useToast } from '../contexts/ToastContext'

export default function Continuacoes() {
  const [continuacoes, setContinuacoes] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', descricao: '', auxiliarIds: [] })
  const [salvando, setSalvando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const { success, error } = useToast()

  const fetchContinuacoes = async () => {
    const res = await api.get('/continuacoes')
    setContinuacoes(res.data)
  }

  useEffect(() => {
    fetchContinuacoes().finally(() => setLoading(false))
    api.get('/usuarios').then((r) => setUsuarios(r.data)).catch(() => {})
  }, [])

  const abrir = (c = null) => {
    setEditando(c)
    setForm({ nome: c?.nome ?? '', descricao: c?.descricao ?? '', auxiliarIds: c?.auxiliares?.map((a) => a.id) ?? [] })
    setShowModal(true)
  }

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao,
        auxiliarIds: form.auxiliarIds,
      }
      if (editando) {
        await api.put(`/continuacoes/${editando.id}`, payload)
        success('Continuação atualizada!')
      } else {
        await api.post('/continuacoes', payload)
        success('Continuação criada!')
      }
      setShowModal(false)
      fetchContinuacoes()
    } catch (err) {
      error(err.response?.data?.erro ?? 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const deletar = async (id) => {
    try {
      await api.delete(`/continuacoes/${id}`)
      success('Continuação removida.')
      setConfirmDelete(null)
      fetchContinuacoes()
    } catch (err) {
      error(err.response?.data?.erro ?? 'Erro ao remover.')
    }
  }

  return (
    <div className="px-4 py-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Continuações</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Grupos de jovens e menores por faixa etária
          </p>
        </div>
        <button onClick={() => abrir()} className="btn-primary">
          <Plus size={16} /> Nova continuação
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
              {continuacoes.length === 0 ? (
                <p className="text-center text-stone-400 py-10 text-sm px-4">Nenhuma continuação cadastrada.</p>
              ) : (
                continuacoes.map((c) => (
                  <div key={c.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-stone-800 dark:text-stone-100">{c.nome}</p>
                      <span className="bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0">
                        {c._count?.criancas ?? 0} jovens
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-700 space-y-2">
                      {c.descricao && (
                        <div>
                          <p className="text-xs text-stone-400 uppercase tracking-wide">Descrição</p>
                          <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5">{c.descricao}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-stone-400 uppercase tracking-wide">Auxiliares</p>
                        <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5">
                          {c.auxiliares?.length > 0 ? c.auxiliares.map((a) => a.nome).join(', ') : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-3">
                      <button
                        onClick={() => abrir(c)}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c)}
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
                    <th className="table-header">Nome</th>
                    <th className="table-header hidden md:table-cell">Descrição</th>
                    <th className="table-header hidden lg:table-cell">Auxiliares</th>
                    <th className="table-header">
                      <div className="flex items-center gap-1">
                        <Users size={13} /> Jovens/Menores
                      </div>
                    </th>
                    <th className="table-header text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {continuacoes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="table-cell text-center text-stone-400 py-10">
                        Nenhuma continuação cadastrada.
                      </td>
                    </tr>
                  ) : (
                    continuacoes.map((c) => (
                      <tr key={c.id} className="hover:bg-stone-50">
                        <td className="table-cell font-semibold text-stone-800">{c.nome}</td>
                        <td className="table-cell hidden md:table-cell text-stone-500">
                          {c.descricao ?? '—'}
                        </td>
                        <td className="table-cell hidden lg:table-cell text-stone-500">
                          {c.auxiliares?.length > 0
                            ? c.auxiliares.map((a) => a.nome).join(', ')
                            : '—'}
                        </td>
                        <td className="table-cell">
                          <span className="bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                            {c._count?.criancas ?? 0}
                          </span>
                        </td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => abrir(c)}
                              className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(c)}
                              className="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors"
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

      {showModal && (
        <Modal
          title={editando ? 'Editar Continuação' : 'Nova Continuação'}
          onClose={() => setShowModal(false)}
          size="sm"
        >
          <form onSubmit={salvar} className="space-y-4">
            <div>
              <label className="label">Nome *</label>
              <input
                className="input"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Maternal, Jardim..."
                required
              />
            </div>
            <div>
              <label className="label">Descrição</label>
              <input
                className="input"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="label">Auxiliares</label>
              {form.auxiliarIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.auxiliarIds.map((uid) => {
                    const u = usuarios.find((u) => u.id === uid)
                    return u ? (
                      <span key={uid} className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 text-xs px-2 py-1 rounded-full">
                        {u.nome}
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, auxiliarIds: form.auxiliarIds.filter((id) => id !== uid) })}
                          className="text-stone-400 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ) : null
                  })}
                </div>
              )}
              <select
                className="input"
                value=""
                onChange={(e) => {
                  if (e.target.value && !form.auxiliarIds.includes(e.target.value)) {
                    setForm({ ...form, auxiliarIds: [...form.auxiliarIds, e.target.value] })
                  }
                }}
              >
                <option value="">Adicionar auxiliar...</option>
                {usuarios
                  .filter((u) => !form.auxiliarIds.includes(u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className="btn-primary">
                {salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Remover continuação" onClose={() => setConfirmDelete(null)} size="sm">
          <p className="text-sm text-stone-600 mb-5">
            Deseja remover <strong>{confirmDelete.nome}</strong>? Só é possível remover se não houver jovens ou menores ativos.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={() => deletar(confirmDelete.id)} className="btn-danger">
              Remover
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
