import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Baby, AlertTriangle, Cake, Building2, ArrowRight, FileDown, X, ChevronRight, MessageSquare } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import PdfPreview from '../components/PdfPreview'
import Modal from '../components/Modal'
import { AvatarWithFallback } from '../components/Avatar'

const PERIODOS = [
  { v: '1m', l: '1 Mês' },
  { v: '3m', l: '3 Meses' },
  { v: '6m', l: '6 Meses' },
  { v: '12m', l: '1 Ano' },
  { v: 'all', l: 'Tudo' },
]

export default function Dashboard() {
  const { isAdminGeral } = useAuth()

  const [continuacoes, setContinuacoes] = useState([])
  const [aniversariantes, setAniversariantes] = useState([])
  const [faltas, setFaltas] = useState([])
  const [resumos, setResumos] = useState({})
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('1m')
  const [loadingResumos, setLoadingResumos] = useState(false)
  const [pdfPreview, setPdfPreview] = useState(null)
  const [contDetalhe, setContDetalhe] = useState(null)
  const [criancaDetalhe, setCriancaDetalhe] = useState(null)
  const [loadingCrianca, setLoadingCrianca] = useState(false)

  const carregarResumos = useCallback(async (conts, per) => {
    setLoadingResumos(true)
    const resumoMap = {}
    await Promise.all(
      conts.map(async (c) => {
        try {
          const r = await api.get(`/dashboard/continuacao/${c.id}?periodo=${per}`)
          resumoMap[c.id] = r.data
        } catch {}
      })
    )
    setResumos(resumoMap)
    setLoadingResumos(false)
  }, [])

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [contRes, anivRes, faltasRes] = await Promise.all([
          api.get('/continuacoes'),
          api.get('/dashboard/aniversariantes'),
          api.get('/dashboard/faltas-consecutivas?minFaltas=2'),
        ])
        setContinuacoes(contRes.data)
        setAniversariantes(anivRes.data)
        setFaltas(faltasRes.data)
        await carregarResumos(contRes.data, periodo)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (continuacoes.length > 0) {
      carregarResumos(continuacoes, periodo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo])

  const abrirPdf = (url, nomeArquivo) => setPdfPreview({ url, nomeArquivo })

  const abrirDetalheContinuacao = (c) => {
    const r = resumos[c.id]
    setContDetalhe({ ...c, resumo: r })
  }

  const abrirDetalheCrianca = async (id) => {
    setLoadingCrianca(true)
    try {
      const [detRes, histRes] = await Promise.all([
        api.get(`/criancas/${id}`),
        api.get(`/criancas/${id}/historico?periodo=${periodo}`),
      ])
      setCriancaDetalhe({ crianca: detRes.data, ...histRes.data })
    } catch {
      setCriancaDetalhe(null)
    } finally {
      setLoadingCrianca(false)
    }
  }

  const labelPeriodo = PERIODOS.find((p) => p.v === periodo)?.l ?? '-'

  const mesNome = new Date().toLocaleString('pt-BR', { month: 'long' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-stone-500 mt-1 capitalize">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Seletor de período + botão PDF geral */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.v}
              onClick={() => setPeriodo(p.v)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                periodo === p.v
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {p.l}
            </button>
          ))}
        </div>
        {isAdminGeral && (
          <button
            onClick={() => abrirPdf(`/relatorios/geral?periodo=${periodo}`, `relatorio_geral_${periodo}.pdf`)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <FileDown size={13} />
            Relatório Geral PDF
          </button>
        )}
      </div>

      {/* Cards das continuações */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {continuacoes.map((c) => {
          const r = resumos[c.id]
          const perc = r?.periodo?.percPresenca ?? null
          const total = c._count?.criancas ?? 0
          return (
            <div
              key={c.id}
              className="card p-4 cursor-pointer hover:border-stone-300 transition-colors"
              onClick={() => abrirDetalheContinuacao(c)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-stone-400 uppercase font-semibold mb-0.5">
                    {c.nome}
                  </p>
                  <p className="text-2xl font-bold text-stone-800">{total}</p>
                  <p className="text-xs text-stone-400">jovens e menores ativos</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="w-10 h-10 bg-gelo rounded-lg flex items-center justify-center">
                    <Building2 size={18} className="text-stone-400" />
                  </div>
                  <button
                    onClick={() => abrirPdf(`/relatorios/continuacao/${c.id}?periodo=${periodo}`, `relatorio_${c.nome?.replace(/\s+/g,'_')}_${periodo}.pdf`)}
                    title="Baixar relatório PDF"
                    className="text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <FileDown size={15} />
                  </button>
                </div>
              </div>
              {loadingResumos ? (
                <div className="h-5 flex items-center">
                  <div className="w-4 h-4 border border-stone-200 border-t-stone-400 rounded-full animate-spin" />
                </div>
              ) : perc !== null && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-stone-500">{labelPeriodo}</span>
                    <span
                      className={`text-xs font-bold ${
                        perc >= 75
                          ? 'text-emerald-600'
                          : perc >= 50
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {perc}%
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        perc >= 75
                          ? 'bg-emerald-500'
                          : perc >= 50
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                      style={{ width: `${perc}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas de faltas */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="section-title">Alertas de Faltas</h2>
            </div>
            <span className="text-xs text-stone-400">{faltas.length} jovem(ns)</span>
          </div>
          <div className="divide-y divide-stone-50 max-h-80 overflow-y-auto">
            {faltas.length === 0 ? (
              <p className="px-5 py-8 text-sm text-stone-400 text-center">
                Nenhuma falta consecutiva registrada.
              </p>
            ) : (
              faltas.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 cursor-pointer"
                  onClick={() => abrirDetalheCrianca(c.id)}
                >
                  <div>
                    <p className="text-sm font-medium text-stone-700">{c.nomeCompleto}</p>
                    <p className="text-xs text-stone-400">{c.continuacao?.nome}</p>
                  </div>
                  <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    {c.faltasConsecutivas} falta(s)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Aniversariantes */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Cake size={16} className="text-rose-400" />
              <h2 className="section-title">Aniversariantes do mês</h2>
            </div>
            <span className="text-xs text-stone-400 capitalize">{mesNome}</span>
          </div>
          <div className="divide-y divide-stone-50 max-h-80 overflow-y-auto">
            {aniversariantes.length === 0 ? (
              <p className="px-5 py-8 text-sm text-stone-400 text-center">
                Nenhum aniversariante este mês.
              </p>
            ) : (
              aniversariantes.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 cursor-pointer"
                  onClick={() => abrirDetalheCrianca(c.id)}
                >
                  <div>
                    <p className="text-sm font-medium text-stone-700">{c.nomeCompleto}</p>
                    <p className="text-xs text-stone-400">{c.continuacao?.nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-rose-500 font-semibold">
                      {new Date(c.dataNascimento).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-stone-400">{c.idade} anos</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Atalhos */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/presencas"
          className="card p-5 flex items-center justify-between group hover:border-stone-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Baby size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">Lançar Presença</p>
              <p className="text-xs text-stone-400">Registrar chamada de hoje</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
        </Link>

        <Link
          to="/criancas"
          className="card p-5 flex items-center justify-between group hover:border-stone-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Baby size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">Gerenciar Jovens e Menores</p>
              <p className="text-xs text-stone-400">Cadastros e histórico</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
        </Link>
      </div>

      {/* Preview PDF */}
      {pdfPreview && (
        <PdfPreview
          url={pdfPreview.url}
          nomeArquivo={pdfPreview.nomeArquivo}
          onClose={() => setPdfPreview(null)}
        />
      )}

      {/* Modal Detalhe Continuação */}
      {contDetalhe && (
        <Modal
          title={`Continuação — ${contDetalhe.nome}`}
          onClose={() => setContDetalhe(null)}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-stone-400 uppercase font-semibold mb-1">Nome</p>
                <p className="text-sm text-stone-800 font-medium">{contDetalhe.nome}</p>
              </div>
              <div>
                <p className="text-xs text-stone-400 uppercase font-semibold mb-1">Descrição</p>
                <p className="text-sm text-stone-600">{contDetalhe.descricao || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-stone-400 uppercase font-semibold mb-1">Auxiliares</p>
                <p className="text-sm text-stone-600">
                  {contDetalhe.auxiliares?.length > 0
                    ? contDetalhe.auxiliares.map((a) => a.nome).join(', ')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-400 uppercase font-semibold mb-1">Total de jovens/menores</p>
                <p className="text-sm text-stone-800 font-bold">{contDetalhe._count?.criancas ?? 0}</p>
              </div>
            </div>

            {contDetalhe.resumo?.periodo && (
              <>
                <div className="border-t border-stone-100 pt-3">
                  <p className="text-xs text-stone-400 uppercase font-semibold mb-2">Estatísticas — {labelPeriodo}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-stone-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-stone-700">{contDetalhe.resumo.periodo.totalRegistros}</p>
                      <p className="text-xs text-stone-400">Registros</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-emerald-600">{contDetalhe.resumo.periodo.totalPresentes}</p>
                      <p className="text-xs text-stone-400">Presenças</p>
                    </div>
                    <div className="bg-stone-50 rounded-lg p-3 text-center">
                      <p className={`text-lg font-bold ${contDetalhe.resumo.periodo.percPresenca >= 75 ? 'text-emerald-600' : contDetalhe.resumo.periodo.percPresenca >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {contDetalhe.resumo.periodo.percPresenca}%
                      </p>
                      <p className="text-xs text-stone-400">Presença</p>
                    </div>
                  </div>
                </div>

                {contDetalhe.resumo.ranking?.length > 0 && (
                  <div className="border-t border-stone-100 pt-3">
                    <p className="text-xs text-stone-400 uppercase font-semibold mb-2">Ranking</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {contDetalhe.resumo.ranking.map((r, i) => (
                        <div
                          key={r.criancaId}
                          className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-stone-50 cursor-pointer"
                          onClick={() => { setContDetalhe(null); abrirDetalheCrianca(r.criancaId) }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-400 w-5">{i + 1}.</span>
                            <span className="text-sm text-stone-700">{r.nome}</span>
                          </div>
                          <span className={`text-xs font-bold ${r.percPresenca >= 75 ? 'text-emerald-600' : r.percPresenca >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {r.percPresenca}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Detalhe Criança */}
      {(criancaDetalhe || loadingCrianca) && (
        <Modal
          title={criancaDetalhe ? `Detalhe — ${criancaDetalhe.crianca?.nomeCompleto}` : 'Carregando...'}
          onClose={() => { setCriancaDetalhe(null); setLoadingCrianca(false) }}
          size="lg"
        >
          {loadingCrianca ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
            </div>
          ) : criancaDetalhe && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <AvatarWithFallback foto={criancaDetalhe.crianca?.foto} nome={criancaDetalhe.crianca?.nomeCompleto} size="lg" />
                <div>
                  <p className="text-lg font-bold text-stone-800">{criancaDetalhe.crianca?.nomeCompleto}</p>
                  <p className="text-sm text-stone-500">{criancaDetalhe.crianca?.continuacao?.nome}</p>
                  {criancaDetalhe.crianca?.dataNascimento && (
                    <p className="text-xs text-stone-400">
                      Nascimento: {new Date(criancaDetalhe.crianca.dataNascimento).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-stone-400">Responsável</p>
                  <p className="text-sm text-stone-700">{criancaDetalhe.crianca?.nomeResponsavel}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400">Telefone</p>
                  <p className="text-sm text-stone-700">{criancaDetalhe.crianca?.telefoneResponsavel}</p>
                </div>
              </div>

              {criancaDetalhe.estatisticas && (
                <div className="border-t border-stone-100 pt-3">
                  <p className="text-xs text-stone-400 uppercase font-semibold mb-2">Estatísticas — {labelPeriodo}</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Total', val: criancaDetalhe.estatisticas.total, color: 'text-stone-700', bg: 'bg-stone-50' },
                      { label: 'Presenças', val: criancaDetalhe.estatisticas.presentes, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Faltas', val: criancaDetalhe.estatisticas.ausentes, color: 'text-red-500', bg: 'bg-red-50' },
                      { label: 'Justificadas', val: criancaDetalhe.estatisticas.justificados, color: 'text-amber-600', bg: 'bg-amber-50' },
                    ].map((s) => (
                      <div key={s.label} className={`rounded-lg p-3 text-center ${s.bg}`}>
                        <p className={`text-xl font-bold ${s.color}`}>{s.val ?? 0}</p>
                        <p className="text-xs text-stone-400">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {criancaDetalhe.historico?.length > 0 && (
                <div className="border-t border-stone-100 pt-3">
                  <p className="text-xs text-stone-400 uppercase font-semibold mb-2">Últimas presenças</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {criancaDetalhe.historico.slice(0, 10).map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-stone-50">
                        <span className="text-sm text-stone-600">
                          {new Date(p.data).toLocaleDateString('pt-BR')}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.status === 'presente' ? 'bg-emerald-100 text-emerald-700' :
                          p.status === 'ausente' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
