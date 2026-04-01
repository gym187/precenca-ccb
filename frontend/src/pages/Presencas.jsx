import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, MinusCircle, Send, RefreshCw, MessageSquare } from 'lucide-react'
import api from '../api/client'
import { useToast } from '../contexts/ToastContext'
import Modal from '../components/Modal'
import { AvatarWithFallback } from '../components/Avatar'

const STATUS_ICONES = {
  presente: <CheckCircle size={16} className="text-emerald-500" />,
  ausente: <XCircle size={16} className="text-red-500" />,
  justificado: <MinusCircle size={16} className="text-amber-500" />,
}

const STATUS_OPTIONS = ['presente', 'ausente', 'justificado']

function BotaoStatus({ status, current, onChange }) {
  const ativo = current === status
  const estilos = {
    presente: ativo
      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
      : 'bg-white text-stone-400 border-stone-200 hover:border-emerald-200',
    ausente: ativo
      ? 'bg-red-100 text-red-700 border-red-300'
      : 'bg-white text-stone-400 border-stone-200 hover:border-red-200',
    justificado: ativo
      ? 'bg-amber-100 text-amber-700 border-amber-300'
      : 'bg-white text-stone-400 border-stone-200 hover:border-amber-200',
  }
  const labels = { presente: 'P', ausente: 'F', justificado: 'J' }

  return (
    <button
      type="button"
      onClick={() => onChange(status)}
      className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all ${estilos[status]}`}
      title={status}
    >
      {labels[status]}
    </button>
  )
}

export default function Presencas() {
  const [continuacoes, setContinuacoes] = useState([])
  const [continuacaoId, setContinuacaoId] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [criancas, setCriancas] = useState([])
  const [presencaMap, setPresencaMap] = useState({})
  const [observacaoMap, setObservacaoMap] = useState({})
  const [carregado, setCarregado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [notaGeral, setNotaGeral] = useState('')
  const [showNotaGeral, setShowNotaGeral] = useState(false)
  const { success, error, info } = useToast()

  useEffect(() => {
    api.get('/continuacoes').then((r) => setContinuacoes(r.data))
  }, [])

  const carregarLista = async () => {
    if (!continuacaoId) return info('Selecione uma continuação.')
    if (!data) return info('Informe a data.')
    setLoading(true)
    try {
      const [crRes, presRes] = await Promise.all([
        api.get(`/criancas?continuacaoId=${continuacaoId}&ativo=true`),
        api.get(`/presencas?continuacaoId=${continuacaoId}&data=${data}`),
      ])

      const criancasList = crRes.data
      setCriancas(criancasList)

      // Montar mapa status + observação inicial
      const map = {}
      const obsMap = {}
      criancasList.forEach((c) => {
        const existente = presRes.data.find((p) => p.criancaId === c.id)
        map[c.id] = existente?.status ?? 'presente'
        obsMap[c.id] = existente?.observacao ?? ''
      })
      setPresencaMap(map)
      setObservacaoMap(obsMap)
      setCarregado(true)
    } catch {
      error('Erro ao carregar lista.')
    } finally {
      setLoading(false)
    }
  }

  const marcarTodos = (status, obs) => {
    const map = {}
    const obsMap = { ...observacaoMap }
    criancas.forEach((c) => {
      map[c.id] = status
      if (obs !== undefined) obsMap[c.id] = obs
    })
    setPresencaMap(map)
    setObservacaoMap(obsMap)
  }

  const marcarTodosJustificados = () => {
    setNotaGeral('')
    setShowNotaGeral(true)
  }

  const confirmarTodosJustificados = () => {
    marcarTodos('justificado', notaGeral)
    setShowNotaGeral(false)
  }

  const enviar = async () => {
    if (criancas.length === 0) return
    const presencas = criancas.map((c) => ({
      criancaId: c.id,
      status: presencaMap[c.id] ?? 'presente',
      observacao: observacaoMap[c.id] || null,
    }))
    setEnviando(true)
    try {
      await api.post('/presencas/lista', { data, tipoReuniao: 'reuniao_jovens', presencas })
      success('Presença registrada com sucesso!')
    } catch (err) {
      error(err.response?.data?.erro ?? 'Erro ao enviar presença.')
    } finally {
      setEnviando(false)
    }
  }

  const contagem = {
    presente: Object.values(presencaMap).filter((s) => s === 'presente').length,
    ausente: Object.values(presencaMap).filter((s) => s === 'ausente').length,
    justificado: Object.values(presencaMap).filter((s) => s === 'justificado').length,
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Lançamento de Presença</h1>
        <p className="text-sm text-stone-400 mt-0.5">Marque a presença dos jovens e menores por continuação</p>
      </div>

      {/* Controles */}
      <div className="card p-5 mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-44">
            <label className="label">Continuação</label>
            <select
              className="input"
              value={continuacaoId}
              onChange={(e) => { setContinuacaoId(e.target.value); setCarregado(false) }}
            >
              <option value="">Selecione...</option>
              {continuacoes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="min-w-40">
            <label className="label">Data da reunião</label>
            <input
              type="date"
              className="input"
              value={data}
              onChange={(e) => { setData(e.target.value); setCarregado(false) }}
            />
          </div>
          <button
            onClick={carregarLista}
            disabled={loading}
            className="btn-secondary h-[38px]"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Carregando...' : 'Carregar lista'}
          </button>
        </div>
      </div>

      {carregado && criancas.length > 0 && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Presentes', count: contagem.presente, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
              { label: 'Faltas', count: contagem.ausente, color: 'text-red-600 bg-red-50 border-red-100' },
              { label: 'Justificados', count: contagem.justificado, color: 'text-amber-600 bg-amber-50 border-amber-100' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Ações em lote */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-stone-400 font-medium">Marcar todos:</span>
            <button onClick={() => marcarTodos('presente')} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium transition-colors">
              Todos presentes
            </button>
            <button onClick={() => marcarTodos('ausente')} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium transition-colors">
              Todos ausentes
            </button>
            <button onClick={marcarTodosJustificados} className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium transition-colors">
              Todos justificados
            </button>
          </div>

          {/* Lista de crianças */}
          <div className="card overflow-hidden mb-4">
            <div className="divide-y divide-stone-50">
              {criancas.map((c, idx) => (
                <div
                  key={c.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <AvatarWithFallback foto={c.foto} nome={c.nomeCompleto} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800">{c.nomeCompleto}</p>
                      <p className="text-xs text-stone-400">
                        {new Date(c.dataNascimento).toLocaleDateString('pt-BR')}
                      </p>
                      {presencaMap[c.id] === 'justificado' && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <MessageSquare size={12} className="text-amber-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Motivo da justificativa..."
                            value={observacaoMap[c.id] ?? ''}
                            onChange={(e) => setObservacaoMap({ ...observacaoMap, [c.id]: e.target.value })}
                            className="text-xs border border-amber-200 rounded-md px-2 py-1 w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-amber-300 placeholder-stone-300"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {STATUS_OPTIONS.map((s) => (
                      <BotaoStatus
                        key={s}
                        status={s}
                        current={presencaMap[c.id]}
                        onChange={(val) => setPresencaMap({ ...presencaMap, [c.id]: val })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enviar */}
          <div className="flex justify-end">
            <button
              onClick={enviar}
              disabled={enviando}
              className="btn-primary px-6 py-2.5"
            >
              <Send size={16} />
              {enviando ? 'Enviando...' : `Confirmar presença (${criancas.length} jovens/menores)`}
            </button>
          </div>
        </>
      )}

      {carregado && criancas.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-stone-400 text-sm">Nenhum jovem ou menor ativo nesta continuação.</p>
        </div>
      )}

      {/* Modal nota geral para todos justificados */}
      {showNotaGeral && (
        <Modal title="Todos Justificados — Nota" onClose={() => setShowNotaGeral(false)} size="sm">
          <p className="text-sm text-stone-600 mb-3">
            Informe o motivo da justificativa (será aplicado a todos):
          </p>
          <textarea
            className="input w-full h-24 resize-none text-sm"
            placeholder="Ex: Chuva forte, feriado, reunião cancelada..."
            value={notaGeral}
            onChange={(e) => setNotaGeral(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowNotaGeral(false)} className="btn-secondary text-sm">
              Cancelar
            </button>
            <button onClick={confirmarTodosJustificados} className="btn-primary text-sm">
              Confirmar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
