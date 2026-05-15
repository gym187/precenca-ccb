import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, History, X, FileDown, Upload, MessageSquare, MessageCircle, MapPin, Clock, User } from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'
import PdfPreview from '../components/PdfPreview'
import { AvatarWithFallback } from '../components/Avatar'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

const MOTIVO_LABEL = {
  casamento: 'Casamento',
  transferencia_outra_congregacao: 'Transferência para outra congregação',
  falecimento: 'Falecimento',
}
const fmtMotivo = (m) => {
  if (!m) return '—'
  if (m.startsWith('outros: ')) return `Outros: ${m.slice(8)}`
  return MOTIVO_LABEL[m] ?? m
}

const FORM_VAZIO = {
  nomeCompleto: '',
  dataNascimento: '',
  nomeResponsavel: '',
  telefoneResponsavel: '',
  telefoneCrianca: '',
  descricao: '',
  observacao: '',
  continuacaoId: '',
  foto: '',
}

function StatusPresenca({ status }) {
  const map = { presente: 'badge-presente', ausente: 'badge-ausente', justificado: 'badge-justificado' }
  return <span className={map[status] ?? 'badge-justificado'}>{status}</span>
}

export default function Criancas() {
  const [criancas, setCriancas] = useState([])
  const [continuacoes, setContinuacoes] = useState([])
  const [todasContinuacoes, setTodasContinuacoes] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroCont, setFiltroCont] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [historico, setHistorico] = useState(null)
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [periodoCrianca, setPeriodoCrianca] = useState('1m')
  const [showConfirmDelete, setShowConfirmDelete] = useState(null)
  const [arquivamento, setArquivamento] = useState({ motivo: '', observacao: '' })
  const [arquivando, setArquivando] = useState(false)
  const [abaLista, setAbaLista] = useState('ativos')
  const [pdfPreview, setPdfPreview] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState(null)
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const { success, error } = useToast()
  const { temPermissao, isAdminGeral } = useAuth()
  const histTransfCriancaRef = useRef(null)
  const [abaModal, setAbaModal] = useState('dados')
  const [histTransferencias, setHistTransferencias] = useState([])
  const [transferindo, setTransferindo] = useState(false)
  const [formTransf, setFormTransf] = useState({ continuacaoDestinoId: '', dataTransferencia: '' })
  const [visitasCrianca, setVisitasCrianca] = useState([])
  const [visitaDetalhe, setVisitaDetalhe] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const [abaDetalhe, setAbaDetalhe] = useState('dados')
  const [detalheHistorico, setDetalheHistorico] = useState(null)
  const [detalheLoadingHistorico, setDetalheLoadingHistorico] = useState(false)
  const [detalheDataInicio, setDetalheDataInicio] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  )
  const [detalheDataFim, setDetalheDataFim] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const fetchCriancas = async () => {
    const params = new URLSearchParams({ ativo: abaLista === 'ativos' ? 'true' : 'false' })
    if (filtroCont) params.set('continuacaoId', filtroCont)
    const res = await api.get(`/criancas?${params}`)
    setCriancas(res.data)
  }

  useEffect(() => {
    Promise.all([api.get('/continuacoes'), fetchCriancas()]).finally(() =>
      setLoading(false)
    )
    api.get('/continuacoes').then((r) => setContinuacoes(r.data))
    api.get('/continuacoes/todas').then((r) => setTodasContinuacoes(r.data))
  }, [])

  useEffect(() => {
    fetchCriancas()
  }, [filtroCont, abaLista])

  const lista = criancas.filter((c) =>
    c.nomeCompleto.toLowerCase().includes(busca.toLowerCase())
  )

  const abrirAdicionar = () => {
    setEditando(null)
    setForm(FORM_VAZIO)
    setFotoFile(null)
    setFotoPreview(null)
    setAbaModal('dados')
    setHistTransferencias([])
    setShowModal(true)
  }

  const abrirEditar = (c) => {
    setEditando(c)
    setForm({
      nomeCompleto: c.nomeCompleto,
      dataNascimento: c.dataNascimento?.slice(0, 10) ?? '',
      nomeResponsavel: c.nomeResponsavel,
      telefoneResponsavel: c.telefoneResponsavel,
      telefoneCrianca: c.telefoneCrianca ?? '',
      descricao: c.descricao ?? '',
      observacao: c.observacao ?? '',
      continuacaoId: c.continuacaoId,
      foto: c.foto ?? '',
    })
    setFotoFile(null)
    setFotoPreview(c.foto ? c.foto : null)
    setAbaModal('dados')
    setFormTransf({ continuacaoDestinoId: '', dataTransferencia: new Date().toISOString().slice(0, 10) })
    if (isAdminGeral) {
      histTransfCriancaRef.current = c.id
      api.get(`/transferencias/crianca/${c.id}`)
        .then((r) => { if (histTransfCriancaRef.current === c.id) setHistTransferencias(r.data) })
        .catch(() => { if (histTransfCriancaRef.current === c.id) setHistTransferencias([]) })
    }
    setShowModal(true)
  }

  const salvar = async (e) => {
    e.preventDefault()
    if (!editando && !fotoFile && !form.foto) {
      error('Foto é obrigatória para novos cadastros.')
      return
    }
    setSalvando(true)
    try {
      let payload
      let config = {}
      if (fotoFile) {
        payload = new FormData()
        Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) payload.append(k, v) })
        payload.append('foto', fotoFile)
        config = { headers: { 'Content-Type': 'multipart/form-data' } }
      } else {
        payload = form
      }

      if (editando) {
        await api.put(`/criancas/${editando.id}`, payload, config)
        success('Jovem/Menor atualizado(a) com sucesso!')
      } else {
        await api.post('/criancas', payload, config)
        success('Jovem/Menor cadastrado(a) com sucesso!')
      }
      setShowModal(false)
      setFotoFile(null)
      setFotoPreview(null)
      fetchCriancas()
    } catch (err) {
      error(err.response?.data?.erro ?? 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const deletar = async (id) => {
    if (!arquivamento.motivo) {
      error('Selecione um motivo.')
      return
    }
    if (arquivamento.motivo === 'outros' && arquivamento.observacao.trim().length < 3) {
      error('Observação é obrigatória quando o motivo é "outros".')
      return
    }
    setArquivando(true)
    try {
      await api.delete(`/criancas/${id}`, {
        data: { motivo: arquivamento.motivo, observacao: arquivamento.observacao || undefined },
      })
      success('Jovem/Menor arquivado(a).')
      setShowConfirmDelete(null)
      setArquivamento({ motivo: '', observacao: '' })
      fetchCriancas()
    } catch (err) {
      error(err.response?.data?.erro ?? 'Erro ao arquivar.')
    } finally {
      setArquivando(false)
    }
  }

  const verHistorico = useCallback(async (id, per = periodoCrianca) => {
    setLoadingHistorico(true)
    setFiltroStatus(null)
    setVisitasCrianca([])
    try {
      const [detRes, histRes, visitasRes] = await Promise.all([
        api.get(`/criancas/${id}`),
        api.get(`/criancas/${id}/historico?periodo=${per}`),
        api.get(`/visitas/crianca/${id}`).catch(() => ({ data: [] })),
      ])
      setHistorico({ crianca: detRes.data, ...histRes.data })
      setVisitasCrianca(visitasRes.data)
    } catch {
      error('Erro ao buscar histórico.')
    } finally {
      setLoadingHistorico(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mudarPeriodoCrianca = (novoPer) => {
    setPeriodoCrianca(novoPer)
    setFiltroStatus(null)
    if (historico?.crianca?.id) verHistorico(historico.crianca.id, novoPer)
  }

  const handleForm = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowed.includes(file.type)) {
      error('Apenas JPG, JPEG e PNG são permitidos.')
      return
    }
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const confirmarTransferencia = async () => {
    if (!formTransf.continuacaoDestinoId) {
      error('Selecione a continuação destino.')
      return
    }
    setTransferindo(true)
    try {
      await api.post('/transferencias', {
        criancaId: editando.id,
        continuacaoDestinoId: formTransf.continuacaoDestinoId,
        dataTransferencia: formTransf.dataTransferencia || undefined,
      })
      success('Criança transferida com sucesso.')
      setEditando((prev) => ({ ...prev, continuacaoId: formTransf.continuacaoDestinoId }))
      fetchCriancas()
      setFormTransf({ continuacaoDestinoId: '', dataTransferencia: new Date().toISOString().slice(0, 10) })
      const r = await api.get(`/transferencias/crianca/${editando.id}`)
      setHistTransferencias(r.data)
    } catch (err) {
      const status = err.response?.status
      if (status === 403) error('Sem permissão para transferir esta criança.')
      else if (status === 409) error('A criança já pertence a esta continuação.')
      else error('Erro ao realizar transferência. Tente novamente.')
    } finally {
      setTransferindo(false)
    }
  }

  const toggleFiltroStatus = (status) => {
    setFiltroStatus((prev) => (prev === status ? null : status))
  }

  const buscarHistoricoDetalhe = async (criancaId) => {
    setDetalheLoadingHistorico(true)
    try {
      const res = await api.get(`/criancas/${criancaId}/historico`, {
        params: { dataInicio: detalheDataInicio, dataFim: detalheDataFim },
      })
      setDetalheHistorico(res.data)
    } catch {
      error('Erro ao buscar histórico.')
    } finally {
      setDetalheLoadingHistorico(false)
    }
  }

  const historicoFiltrado = historico?.historico?.filter(
    (p) => !filtroStatus || p.status === filtroStatus
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Jovens e Menores</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {lista.length} {abaLista === 'arquivados' ? 'arquivado(s)' : 'encontrado(s)'}
          </p>
        </div>
        <button onClick={abrirAdicionar} className="btn-primary">
          <Plus size={16} /> Novo cadastro
        </button>
      </div>

      {/* Tabs Ativos / Arquivados */}
      <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-1 mb-4 w-fit">
        {[
          { v: 'ativos', l: 'Ativos' },
          { v: 'arquivados', l: 'Arquivados' },
        ].map((t) => (
          <button
            key={t.v}
            onClick={() => setAbaLista(t.v)}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
              abaLista === t.v
                ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="input w-auto min-w-44"
          value={filtroCont}
          onChange={(e) => setFiltroCont(e.target.value)}
        >
          <option value="">Todas as continuações</option>
          {continuacoes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-stone-100">
            <thead>
              <tr>
                <th className="table-header">Nome</th>
                <th className="table-header hidden md:table-cell">Responsável</th>
                <th className="table-header hidden lg:table-cell">Telefone</th>
                <th className="table-header hidden sm:table-cell">Continuação</th>
                {abaLista === 'arquivados' && (
                  <th className="table-header hidden md:table-cell">Motivo</th>
                )}
                <th className="table-header text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={abaLista === 'arquivados' ? 6 : 5} className="table-cell text-center text-stone-400 py-10">
                    {abaLista === 'arquivados' ? 'Nenhum jovem ou menor arquivado.' : 'Nenhum jovem ou menor encontrado.'}
                  </td>
                </tr>
              ) : (
                lista.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50">
                    <td className="table-cell font-medium text-stone-800">
                      <button
                        type="button"
                        onClick={() => setDetalhe(c)}
                        className="flex items-center gap-2.5 text-left hover:text-stone-600 transition-colors"
                      >
                        <AvatarWithFallback foto={c.foto} nome={c.nomeCompleto} size="sm" />
                        <div>
                          <span className="underline-offset-2 hover:underline">{c.nomeCompleto}</span>
                          <p className="text-xs text-stone-400 mt-0.5 sm:hidden">
                            {c.continuacao?.nome}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="table-cell hidden md:table-cell">{c.nomeResponsavel}</td>
                    <td className="table-cell hidden lg:table-cell">{c.telefoneResponsavel}</td>
                    <td className="table-cell hidden sm:table-cell">
                      <span className="bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                        {c.continuacao?.nome}
                      </span>
                    </td>
                    {abaLista === 'arquivados' && (
                      <td className="table-cell text-xs text-stone-500 hidden md:table-cell">
                        {fmtMotivo(c.motivoArquivamento)}
                      </td>
                    )}
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => verHistorico(c.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
                          title="Ver histórico"
                        >
                          <History size={15} />
                        </button>
                        {c.telefoneResponsavel && (() => {
                          const tel = c.telefoneResponsavel.replace(/\D/g, '')
                          const msg = encodeURIComponent(`Paz de Deus ${c.nomeResponsavel ?? 'Responsável'} sou auxiliar da ${c.nomeCompleto}, podemos conversar?`)
                          return (
                            <a
                              href={`https://wa.me/55${tel}?text=${msg}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Enviar WhatsApp"
                              className="p-1.5 rounded-lg text-stone-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                            >
                              <MessageCircle size={15} />
                            </a>
                          )
                        })()}
                        <button
                          onClick={() => abrirEditar(c)}
                          className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        {abaLista === 'ativos' && (
                          <button
                            onClick={() => setShowConfirmDelete(c)}
                            className="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Arquivar"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Formulário */}
      {showModal && (
        <Modal
          title={editando ? 'Editar Cadastro' : 'Novo Cadastro'}
          onClose={() => setShowModal(false)}
          size="lg"
        >
          {editando && (
            <div className="flex border-b border-stone-200 mb-4 -mt-2">
              <button
                type="button"
                onClick={() => setAbaModal('dados')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  abaModal === 'dados'
                    ? 'border-stone-900 text-stone-900'
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                Dados
              </button>
              {isAdminGeral && (
                <button
                  type="button"
                  onClick={() => setAbaModal('transferir')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    abaModal === 'transferir'
                      ? 'border-stone-900 text-stone-900'
                      : 'border-transparent text-stone-400 hover:text-stone-600'
                  }`}
                >
                  Transferir
                </button>
              )}
            </div>
          )}
          {abaModal === 'transferir' && editando ? (
            <div className="space-y-4">
              <p className="text-sm text-stone-500">
                Continuação atual:{' '}
                <span className="font-semibold text-stone-800">
                  {todasContinuacoes.find((c) => c.id === editando.continuacaoId)?.nome ?? editando.continuacaoId}
                </span>
              </p>
              <div>
                <label className="label">Transferir para *</label>
                <select
                  className="input"
                  value={formTransf.continuacaoDestinoId}
                  onChange={(e) => setFormTransf({ ...formTransf, continuacaoDestinoId: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {todasContinuacoes
                    .filter((c) => c.id !== editando.continuacaoId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="label">Data da transferência</label>
                <input
                  type="date"
                  className="input"
                  value={formTransf.dataTransferencia}
                  onChange={(e) => setFormTransf({ ...formTransf, dataTransferencia: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={confirmarTransferencia}
                disabled={transferindo}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferindo ? 'Transferindo...' : 'Confirmar Transferência'}
              </button>
              {histTransferencias.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Histórico</p>
                  <ul className="space-y-1">
                    {histTransferencias.map((t) => (
                      <li key={t.id} className="text-sm text-stone-600 bg-stone-50 rounded-lg px-3 py-2">
                        {t.continuacaoOrigem.nome} → {t.continuacaoDestino.nome}
                        <span className="text-stone-400 ml-2">
                          · {new Date(t.dataTransferencia).toLocaleDateString('pt-BR')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={salvar} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Nome completo *</label>
                  <input
                    className="input"
                    name="nomeCompleto"
                    value={form.nomeCompleto}
                    onChange={handleForm}
                    required
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="label">Data de nascimento *</label>
                  <input
                    className="input"
                    type="date"
                    name="dataNascimento"
                    value={form.dataNascimento}
                    onChange={handleForm}
                    required
                  />
                </div>
                <div>
                  <label className="label">Continuação *</label>
                  <select
                    className="input"
                    name="continuacaoId"
                    value={form.continuacaoId}
                    onChange={handleForm}
                    required
                  >
                    <option value="">Selecione...</option>
                    {todasContinuacoes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Nome do responsável *</label>
                  <input
                    className="input"
                    name="nomeResponsavel"
                    value={form.nomeResponsavel}
                    onChange={handleForm}
                    required
                    placeholder="Nome do pai/mãe/responsável"
                  />
                </div>
                <div>
                  <label className="label">Telefone do responsável *</label>
                  <input
                    className="input"
                    name="telefoneResponsavel"
                    value={form.telefoneResponsavel}
                    onChange={handleForm}
                    required
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input
                    className="input"
                    name="telefoneCrianca"
                    value={form.telefoneCrianca}
                    onChange={handleForm}
                    placeholder="Opcional"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Descrição</label>
                  <textarea
                    className="input resize-none"
                    name="descricao"
                    value={form.descricao}
                    onChange={handleForm}
                    rows={2}
                    placeholder="Descrição geral..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Observação</label>
                  <textarea
                    className="input resize-none"
                    name="observacao"
                    value={form.observacao}
                    onChange={handleForm}
                    rows={3}
                    placeholder="Observações específicas (saúde, comportamento, contexto familiar...)"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Foto (JPG/PNG){!editando && ' *'}</label>
                  <div className="flex items-center gap-4">
                    {fotoPreview && (
                      <img
                        src={fotoPreview}
                        alt="Preview"
                        className="w-16 h-16 rounded-lg object-cover border border-stone-200"
                      />
                    )}
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 cursor-pointer transition-colors">
                      <Upload size={14} />
                      {fotoFile ? fotoFile.name : 'Selecionar foto'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleFotoChange}
                        className="hidden"
                      />
                    </label>
                    {fotoPreview && (
                      <button
                        type="button"
                        onClick={() => { setFotoFile(null); setFotoPreview(null); setForm({ ...form, foto: '' }) }}
                        className="text-stone-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="btn-primary">
                  {salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Modal Histórico */}
      {historico && (
        <Modal
          title={`Histórico — ${historico.crianca?.nomeCompleto}`}
          onClose={() => { setHistorico(null); setPeriodoCrianca('1m'); setVisitasCrianca([]) }}
          size="lg"
        >
          {/* Seletor de período + PDF */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
              {[{v:'1m',l:'1M'},{v:'3m',l:'3M'},{v:'6m',l:'6M'},{v:'12m',l:'1A'},{v:'all',l:'Tudo'}].map((p) => (
                <button
                  key={p.v}
                  onClick={() => mudarPeriodoCrianca(p.v)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                    periodoCrianca === p.v
                      ? 'bg-white text-stone-800 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  {p.l}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPdfPreview({
                url: `/relatorios/continuacao/${historico.crianca?.continuacaoId}?periodo=${periodoCrianca}`,
                nomeArquivo: `relatorio_continuacao_${periodoCrianca}.pdf`,
              })}
              className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 transition-colors cursor-pointer"
            >
              <FileDown size={14} />
              PDF da continuação
            </button>
          </div>

          {loadingHistorico ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Total', val: historico.estatisticas?.total, color: 'text-stone-700', bg: 'bg-stone-50', status: null },
                  { label: 'Presenças', val: historico.estatisticas?.presentes, color: 'text-emerald-600', bg: 'bg-emerald-50', status: 'presente' },
                  { label: 'Faltas', val: historico.estatisticas?.ausentes, color: 'text-red-500', bg: 'bg-red-50', status: 'ausente' },
                  { label: 'Justificadas', val: historico.estatisticas?.justificados, color: 'text-amber-600', bg: 'bg-amber-50', status: 'justificado' },
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => toggleFiltroStatus(s.status)}
                    className={`rounded-lg p-3 text-center transition-all cursor-pointer ${
                      filtroStatus === s.status
                        ? `${s.bg} ring-2 ring-offset-1 ring-stone-400`
                        : `${s.bg} hover:ring-1 hover:ring-stone-300`
                    }`}
                  >
                    <p className={`text-xl font-bold ${s.color}`}>{s.val ?? 0}</p>
                    <p className="text-xs text-stone-400">{s.label}</p>
                  </button>
                ))}
              </div>

              {filtroStatus && (
                <div className="flex items-center gap-2 mb-3 text-xs text-stone-500">
                  <span>Filtrando por: <strong className="capitalize">{filtroStatus === 'presente' ? 'Presenças' : filtroStatus === 'ausente' ? 'Faltas' : 'Justificadas'}</strong></span>
                  <button onClick={() => setFiltroStatus(null)} className="text-stone-400 hover:text-stone-600">
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {historicoFiltrado?.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-6">
                    Nenhum registro {filtroStatus ? `com status "${filtroStatus}"` : 'no período selecionado'}.
                  </p>
                ) : (
                  historicoFiltrado?.map((p) => (
                    <div
                      key={p.id}
                      className={`py-2.5 px-3 rounded-lg hover:bg-stone-50 ${p.status === 'justificado' ? 'border-l-2 border-amber-400' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-stone-600">
                          {new Date(p.data).toLocaleDateString('pt-BR')}
                        </span>
                        <StatusPresenca status={p.status} />
                      </div>
                      {p.observacao && (
                        <div className="flex items-start gap-1.5 mt-1.5">
                          <MessageSquare size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-stone-500 italic">{p.observacao}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-stone-100 dark:border-stone-700 pt-3 mt-3">
                <p className="text-xs text-stone-400 uppercase font-semibold mb-2">Visitas</p>
                {visitasCrianca.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-4">Nenhuma visita registrada.</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {visitasCrianca.map((v) => (
                      <div key={v.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-stone-50 transition-colors cursor-pointer" onClick={() => setVisitaDetalhe(v)}>
                        <div>
                          <span className="text-sm text-stone-600">
                            {new Date(v.data.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')} às {v.hora}
                          </span>
                          <span className="text-xs text-stone-400 ml-2">· {v.responsavel?.nome}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          v.status === 'concluida'
                            ? 'bg-emerald-100 text-emerald-700'
                            : v.status === 'remarcada'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {v.status === 'concluida' ? 'Concluída' : v.status === 'remarcada' ? 'Remarcada' : 'Pendente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Modal Detalhe Visita */}
      {visitaDetalhe && (
        <Modal
          title="Detalhe da Visita"
          onClose={() => setVisitaDetalhe(null)}
          size="sm"
        >
          {(() => {
            const v = visitaDetalhe
            const STATUS_CLS = {
              concluida: 'bg-emerald-100 text-emerald-700',
              remarcada: 'bg-indigo-100 text-indigo-700',
              pendente:  'bg-amber-100 text-amber-700',
            }
            const STATUS_LABEL = { concluida: 'Concluída', remarcada: 'Remarcada', pendente: 'Pendente' }
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-stone-800 dark:text-stone-100">
                    {v.crianca?.nomeCompleto}
                  </p>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_CLS[v.status]}`}>
                    {STATUS_LABEL[v.status]}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-stone-600 dark:text-stone-300">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-stone-400 shrink-0" />
                    <span>
                      {new Date(v.data.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')} às {v.hora}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-stone-400 shrink-0" />
                    <span>{v.endereco}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-stone-400 shrink-0" />
                    <span>{v.responsavel?.nome}</span>
                  </div>
                </div>
                {v.observacao && (
                  <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-3">
                    <p className="text-xs text-stone-400 uppercase font-semibold mb-1">Observação</p>
                    <p className="text-sm text-stone-600 dark:text-stone-300">{v.observacao}</p>
                  </div>
                )}
              </div>
            )
          })()}
        </Modal>
      )}

      {/* Modal Detalhe */}
      {detalhe && (
        <Modal
          title={`Detalhe — ${detalhe.nomeCompleto}`}
          onClose={() => {
            setDetalhe(null)
            setAbaDetalhe('dados')
            setDetalheHistorico(null)
            setDetalheDataInicio(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
            setDetalheDataFim(new Date().toISOString().slice(0, 10))
          }}
          size="lg"
        >
          {/* Tabs */}
          <div className="flex border-b border-stone-200 dark:border-stone-700 mb-4 -mt-2">
            <button
              type="button"
              onClick={() => setAbaDetalhe('dados')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                abaDetalhe === 'dados'
                  ? 'border-stone-900 text-stone-900 dark:border-stone-100 dark:text-stone-100'
                  : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              Detalhes
            </button>
            <button
              type="button"
              onClick={() => {
                setAbaDetalhe('historico')
                if (!detalheHistorico) buscarHistoricoDetalhe(detalhe.id)
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                abaDetalhe === 'historico'
                  ? 'border-stone-900 text-stone-900 dark:border-stone-100 dark:text-stone-100'
                  : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              Histórico
            </button>
          </div>

          {abaDetalhe === 'dados' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <AvatarWithFallback foto={detalhe.foto} nome={detalhe.nomeCompleto} size="lg" />
                <div className="flex-1 space-y-1">
                  <p className="text-lg font-semibold text-stone-800 dark:text-stone-100">{detalhe.nomeCompleto}</p>
                  <p className="text-sm text-stone-500">
                    {detalhe.continuacao?.nome ?? todasContinuacoes.find((x) => x.id === detalhe.continuacaoId)?.nome}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-stone-400 uppercase font-semibold mb-0.5">Data de nascimento</p>
                  <p className="text-stone-700 dark:text-stone-300">
                    {detalhe.dataNascimento
                      ? new Date(detalhe.dataNascimento.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 uppercase font-semibold mb-0.5">Responsável</p>
                  <p className="text-stone-700 dark:text-stone-300">{detalhe.nomeResponsavel}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 uppercase font-semibold mb-0.5">Telefone do responsável</p>
                  <p className="text-stone-700 dark:text-stone-300">{detalhe.telefoneResponsavel}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 uppercase font-semibold mb-0.5">Telefone da criança</p>
                  <p className="text-stone-700 dark:text-stone-300">{detalhe.telefoneCrianca || '—'}</p>
                </div>
              </div>

              {detalhe.descricao && (
                <div>
                  <p className="text-xs text-stone-400 uppercase font-semibold mb-1">Descrição</p>
                  <p className="text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap bg-stone-50 dark:bg-stone-800 rounded-lg p-3">{detalhe.descricao}</p>
                </div>
              )}

              {detalhe.observacao && (
                <div>
                  <p className="text-xs text-stone-400 uppercase font-semibold mb-1">Observação</p>
                  <p className="text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">{detalhe.observacao}</p>
                </div>
              )}

              {temPermissao('gerenciar_criancas') && (
                <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-700">
                  <button
                    type="button"
                    onClick={() => { abrirEditar(detalhe); setDetalhe(null); setAbaDetalhe('dados'); setDetalheHistorico(null); setDetalheDataInicio(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)); setDetalheDataFim(new Date().toISOString().slice(0, 10)) }}
                    className="btn-primary"
                  >
                    <Pencil size={14} /> Editar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Filtro de período */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <label className="label">De</label>
                  <input
                    type="date"
                    className="input"
                    value={detalheDataInicio}
                    max={detalheDataFim}
                    onChange={(e) => setDetalheDataInicio(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="label">Até</label>
                  <input
                    type="date"
                    className="input"
                    value={detalheDataFim}
                    min={detalheDataInicio}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDetalheDataFim(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn-secondary self-end"
                  onClick={() => buscarHistoricoDetalhe(detalhe.id)}
                  disabled={detalheLoadingHistorico}
                >
                  Buscar
                </button>
              </div>

              {detalheLoadingHistorico && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
                </div>
              )}

              {!detalheLoadingHistorico && detalheHistorico && (
                <>
                  {/* Resumo */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-emerald-600">{detalheHistorico.estatisticas.presentes}</p>
                      <p className="text-xs text-stone-400">Presenças</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-red-500">{detalheHistorico.estatisticas.ausentes}</p>
                      <p className="text-xs text-stone-400">Ausências</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-amber-600">{detalheHistorico.estatisticas.justificados}</p>
                      <p className="text-xs text-stone-400">Justificadas</p>
                    </div>
                  </div>

                  {/* Lista */}
                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {detalheHistorico.historico.length === 0 ? (
                      <p className="text-sm text-stone-400 text-center py-6">Nenhum registro encontrado neste período.</p>
                    ) : (
                      detalheHistorico.historico.map((p) => (
                        <div
                          key={p.id}
                          className={`py-2.5 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50 ${
                            p.status === 'justificado' ? 'border-l-2 border-amber-400' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-stone-600 dark:text-stone-400">
                              {new Date(p.data.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                            <StatusPresenca status={p.status} />
                          </div>
                          {p.observacao && (
                            <div className="flex items-start gap-1.5 mt-1.5">
                              <MessageSquare size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-stone-500 italic">{p.observacao}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {!detalheLoadingHistorico && !detalheHistorico && (
                <p className="text-sm text-stone-400 text-center py-8">
                  Selecione o período e clique em Buscar para ver o histórico.
                </p>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Modal Arquivar */}
      {showConfirmDelete && (
        <Modal
          title="Arquivar cadastro"
          onClose={() => { setShowConfirmDelete(null); setArquivamento({ motivo: '', observacao: '' }) }}
          size="sm"
        >
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
            Arquivando <strong>{showConfirmDelete.nomeCompleto}</strong>. O histórico será preservado.
          </p>
          <div className="space-y-3">
            <div>
              <label className="label">Motivo *</label>
              <select
                className="input"
                value={arquivamento.motivo}
                onChange={(e) => setArquivamento({ ...arquivamento, motivo: e.target.value })}
              >
                <option value="">Selecione...</option>
                <option value="casamento">Casamento</option>
                <option value="transferencia_outra_congregacao">Transferência para outra congregação</option>
                <option value="falecimento">Falecimento</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            {arquivamento.motivo === 'outros' && (
              <div>
                <label className="label">Observação *</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={arquivamento.observacao}
                  onChange={(e) => setArquivamento({ ...arquivamento, observacao: e.target.value })}
                  placeholder="Descreva o motivo..."
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={() => { setShowConfirmDelete(null); setArquivamento({ motivo: '', observacao: '' }) }}
              className="btn-secondary"
              disabled={arquivando}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => deletar(showConfirmDelete.id)}
              className="btn-danger"
              disabled={arquivando}
            >
              {arquivando ? 'Arquivando...' : 'Arquivar'}
            </button>
          </div>
        </Modal>
      )}

      {/* Preview PDF */}
      {pdfPreview && (
        <PdfPreview
          url={pdfPreview.url}
          nomeArquivo={pdfPreview.nomeArquivo}
          onClose={() => setPdfPreview(null)}
        />
      )}
    </div>
  )
}
