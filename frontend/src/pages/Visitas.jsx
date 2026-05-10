import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, MapPin, Loader2 } from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'
import { useToast } from '../contexts/ToastContext'

const STATUS_CONFIG = {
  pendente:  { label: 'Pendente',  cls: 'bg-amber-100 text-amber-700' },
  concluida: { label: 'Concluída', cls: 'bg-emerald-100 text-emerald-700' },
  remarcada: { label: 'Remarcada', cls: 'bg-indigo-100 text-indigo-700' },
}

const FORM_VAZIO = {
  criancaId: '', data: '', hora: '', endereco: '',
  responsavelId: '', observacao: '', status: 'pendente',
}

export default function Visitas() {
  const { success, error } = useToast()

  const [visitas, setVisitas] = useState([])
  const [resumo, setResumo] = useState({ total: 0, porStatus: { pendente: 0, concluida: 0, remarcada: 0 } })
  const [criancas, setCriancas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [continuacoes, setContinuacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [confirmarDeletar, setConfirmarDeletar] = useState(null)

  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroCont, setFiltroCont] = useState('')
  const [busca, setBusca] = useState('')

  const fetchVisitas = async () => {
    const params = new URLSearchParams()
    if (filtroStatus) params.set('status', filtroStatus)
    if (filtroCont) params.set('continuacaoId', filtroCont)
    const res = await api.get(`/visitas?${params}`)
    setVisitas(res.data)
  }

  const fetchResumo = async () => {
    const res = await api.get('/visitas/resumo')
    setResumo(res.data)
  }

  useEffect(() => {
    Promise.all([
      fetchVisitas(),
      fetchResumo(),
      api.get('/criancas?ativo=true').then((r) => setCriancas(r.data)),
      api.get('/visitas/responsaveis').then((r) => setUsuarios(r.data)),
      api.get('/continuacoes/todas').then((r) => setContinuacoes(r.data)),
    ])
      .catch(() => error('Erro ao carregar dados iniciais.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchVisitas()
  }, [filtroStatus, filtroCont])

  const lista = visitas.filter((v) =>
    v.crianca?.nomeCompleto?.toLowerCase().includes(busca.toLowerCase())
  )

  const abrirAdicionar = () => {
    setEditando(null)
    setForm(FORM_VAZIO)
    setShowModal(true)
  }

  const abrirEditar = (v) => {
    setEditando(v)
    setForm({
      criancaId:     v.criancaId,
      data:          v.data?.slice(0, 10) ?? '',
      hora:          v.hora,
      endereco:      v.endereco,
      responsavelId: v.responsavelId,
      observacao:    v.observacao ?? '',
      status:        v.status,
    })
    setShowModal(true)
  }

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      if (editando) {
        await api.put(`/visitas/${editando.id}`, form)
        success('Visita atualizada com sucesso.')
      } else {
        await api.post('/visitas', form)
        success('Visita agendada com sucesso.')
      }
      setShowModal(false)
      fetchVisitas()
      fetchResumo()
    } catch (err) {
      error(err.response?.data?.erro ?? 'Erro ao salvar visita.')
    } finally {
      setSalvando(false)
    }
  }

  const deletar = async (id) => {
    try {
      await api.delete(`/visitas/${id}`)
      success('Visita removida.')
      setConfirmarDeletar(null)
      fetchVisitas()
      fetchResumo()
    } catch {
      error('Erro ao remover visita.')
    }
  }

  const handleForm = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const cards = [
    { label: 'Total',      val: resumo.total,                    bg: 'bg-stone-50',   color: 'text-stone-700' },
    { label: 'Pendentes',  val: resumo.porStatus?.pendente ?? 0,  bg: 'bg-amber-50',   color: 'text-amber-600' },
    { label: 'Concluídas', val: resumo.porStatus?.concluida ?? 0, bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { label: 'Remarcadas', val: resumo.porStatus?.remarcada ?? 0, bg: 'bg-indigo-50',  color: 'text-indigo-600' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Visitas</h1>
          <p className="text-sm text-stone-400 mt-0.5">{lista.length} visita(s)</p>
        </div>
        <button onClick={abrirAdicionar} className="btn-primary">
          <Plus size={16} /> Agendar Visita
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className={`card p-4 text-center ${c.bg}`}>
            <p className={`text-2xl font-bold ${c.color}`}>{c.val}</p>
            <p className="text-xs text-stone-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select className="input w-40" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="concluida">Concluída</option>
          <option value="remarcada">Remarcada</option>
        </select>
        <select className="input w-48" value={filtroCont} onChange={(e) => setFiltroCont(e.target.value)}>
          <option value="">Todas as continuações</option>
          {continuacoes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          </div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-stone-400">
            <MapPin size={32} className="opacity-30" />
            <p className="text-sm">Nenhuma visita encontrada.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-stone-100">
            <thead>
              <tr>
                <th className="table-header">Jovem / Menor</th>
                <th className="table-header hidden sm:table-cell">Data e Hora</th>
                <th className="table-header hidden md:table-cell">Endereço</th>
                <th className="table-header hidden lg:table-cell">Responsável</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {lista.map((v) => (
                <tr key={v.id} className="hover:bg-stone-50">
                  <td className="table-cell">
                    <p className="font-medium text-stone-800">{v.crianca?.nomeCompleto}</p>
                    <p className="text-xs text-stone-400">{v.crianca?.continuacao?.nome}</p>
                  </td>
                  <td className="table-cell hidden sm:table-cell text-stone-600 text-sm">
                    {new Date(v.data.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')} às {v.hora}
                  </td>
                  <td className="table-cell hidden md:table-cell text-stone-600 text-sm">{v.endereco}</td>
                  <td className="table-cell hidden lg:table-cell text-stone-600 text-sm">{v.responsavel?.nome}</td>
                  <td className="table-cell">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[v.status]?.cls}`}>
                      {STATUS_CONFIG[v.status]?.label}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => abrirEditar(v)}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmarDeletar(v)}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Agendar/Editar */}
      {showModal && (
        <Modal
          title={editando ? 'Editar Visita' : 'Agendar Visita'}
          onClose={() => setShowModal(false)}
          size="lg"
        >
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Jovem / Menor *</label>
                <select className="input" name="criancaId" value={form.criancaId} onChange={handleForm} required>
                  <option value="">Selecione...</option>
                  {criancas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nomeCompleto} — {c.continuacao?.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Data *</label>
                <input className="input" type="date" name="data" value={form.data} onChange={handleForm} required />
              </div>
              <div>
                <label className="label">Hora *</label>
                <input className="input" type="text" name="hora" value={form.hora} onChange={handleForm} placeholder="14:00" pattern="\d{2}:\d{2}" title="Hora no formato HH:MM (ex: 14:00)" required />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Endereço *</label>
                <input className="input" type="text" name="endereco" value={form.endereco} onChange={handleForm} placeholder="Rua, número, bairro" required />
              </div>
              <div>
                <label className="label">Responsável pela visita *</label>
                <select className="input" name="responsavelId" value={form.responsavelId} onChange={handleForm} required>
                  <option value="">Selecione...</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" name="status" value={form.status} onChange={handleForm}>
                  <option value="pendente">Pendente</option>
                  <option value="concluida">Concluída</option>
                  <option value="remarcada">Remarcada</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Observação</label>
                <textarea className="input resize-none" name="observacao" value={form.observacao} onChange={handleForm} rows={3} placeholder="Observações sobre a visita..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={salvando} className="btn-primary disabled:opacity-50">
                {salvando ? <Loader2 size={15} className="animate-spin" /> : null}
                {salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Agendar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirmarDeletar && (
        <Modal title="Remover visita" onClose={() => setConfirmarDeletar(null)} size="sm">
          <p className="text-sm text-stone-600 mb-5">
            Deseja remover a visita de <strong>{confirmarDeletar.crianca?.nomeCompleto}</strong> em{' '}
            {new Date(confirmarDeletar.data.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')}?
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmarDeletar(null)} className="btn-secondary">Cancelar</button>
            <button onClick={() => deletar(confirmarDeletar.id)} className="btn-danger">Remover</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
