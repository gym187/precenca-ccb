import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Baby, AlertTriangle, Cake, Building2, ArrowRight, FileDown, MessageCircle } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import PdfPreview from '../components/PdfPreview'
import Modal from '../components/Modal'
import { AvatarWithFallback } from '../components/Avatar'
import DashboardAnalise from '../components/DashboardAnalise'

const toISO = (d) => d.toISOString().slice(0, 10)

const defaultInicio = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return toISO(d)
}

const percColor = (p) =>
  p >= 75 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444'

const percTextClass = (p) =>
  p >= 75 ? 'text-emerald-600 dark:text-emerald-400' :
  p >= 50 ? 'text-amber-600 dark:text-amber-400' :
  'text-red-600 dark:text-red-400'

const percBgClass = (p) =>
  p >= 75 ? 'bg-emerald-500' : p >= 50 ? 'bg-amber-400' : 'bg-red-400'

export default function Dashboard() {
  const { isAdminGeral } = useAuth()
  const { dark } = useTheme()

  const [continuacoes, setContinuacoes] = useState([])
  const [aniversariantes, setAniversariantes] = useState([])
  const [faltas, setFaltas] = useState([])
  const [resumos, setResumos] = useState({})
  const [loading, setLoading] = useState(true)
  const [dataInicio, setDataInicio] = useState(defaultInicio)
  const [dataFim, setDataFim] = useState(() => toISO(new Date()))
  const [loadingResumos, setLoadingResumos] = useState(false)
  const [pdfPreview, setPdfPreview] = useState(null)
  const [contDetalhe, setContDetalhe] = useState(null)
  const [criancaDetalhe, setCriancaDetalhe] = useState(null)
  const [visitasCrianca, setVisitasCrianca] = useState([])
  const [loadingCrianca, setLoadingCrianca] = useState(false)
  const [aba, setAba] = useState('resumo')

  const carregarResumos = useCallback(async (conts, ini, fim) => {
    if (!ini || !fim || ini > fim) return
    setLoadingResumos(true)
    const resumoMap = {}
    await Promise.all(
      conts.map(async (c) => {
        try {
          const r = await api.get(`/dashboard/continuacao/${c.id}?dataInicio=${ini}&dataFim=${fim}`)
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
          api.get('/dashboard/faltas-consecutivas?minFaltas=3'),
        ])
        setContinuacoes(contRes.data)
        setAniversariantes(anivRes.data)
        setFaltas(faltasRes.data)
        await carregarResumos(contRes.data, dataInicio, dataFim)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (continuacoes.length === 0) return
    const t = setTimeout(() => carregarResumos(continuacoes, dataInicio, dataFim), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim])

  const abrirPdf = (url, nomeArquivo) => setPdfPreview({ url, nomeArquivo })

  const abrirDetalheContinuacao = (c) => {
    const r = resumos[c.id]
    setContDetalhe({ ...c, resumo: r })
  }

  const abrirDetalheCrianca = async (id) => {
    setLoadingCrianca(true)
    setVisitasCrianca([])
    try {
      const [detRes, histRes, visitasRes] = await Promise.all([
        api.get(`/criancas/${id}`),
        api.get(`/criancas/${id}/historico?dataInicio=${dataInicio}&dataFim=${dataFim}`),
        api.get(`/visitas/crianca/${id}`).catch(() => ({ data: [] })),
      ])
      setCriancaDetalhe({ crianca: detRes.data, ...histRes.data })
      setVisitasCrianca(visitasRes.data)
    } catch {
      setCriancaDetalhe(null)
    } finally {
      setLoadingCrianca(false)
    }
  }

  const fmtData = (iso) =>
    iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
  const labelPeriodo = `${fmtData(dataInicio)} – ${fmtData(dataFim)}`
  const mesNome = new Date().toLocaleString('pt-BR', { month: 'long' })

  // Tooltip style para Recharts (muda com dark mode)
  const tooltipStyle = {
    backgroundColor: dark ? '#1c1917' : '#fff',
    border: `1px solid ${dark ? '#44403c' : '#e7e5e4'}`,
    borderRadius: '8px',
    fontSize: '12px',
    color: dark ? '#f5f5f4' : '#1c1917',
  }

  const axisTickColor = dark ? '#a8a29e' : '#78716c'
  const axisLineColor = dark ? '#44403c' : '#e7e5e4'
  const cursorFill = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'

  // Dados do bar chart
  const barData = continuacoes.map((c) => ({
    id: c.id,
    nome: c.nome.length > 14 ? c.nome.slice(0, 12) + '…' : c.nome,
    percentual: resumos[c.id]?.periodo?.percPresenca ?? 0,
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stone-300 dark:border-stone-600 border-t-stone-700 dark:border-t-stone-300 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 capitalize">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Abas */}
      <div className="flex border-b border-stone-100 dark:border-stone-700 mb-4">
        {[
          { v: 'resumo',  l: 'Resumo'  },
          { v: 'analise', l: 'Análise' },
        ].map((a) => (
          <button
            key={a.v}
            onClick={() => setAba(a.v)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              aba === a.v
                ? 'border-stone-800 dark:border-stone-200 text-stone-800 dark:text-stone-100'
                : 'border-transparent text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            {a.l}
          </button>
        ))}
      </div>

      {aba === 'resumo' && (
      <>
      {/* Seletor de período + botão PDF */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide">De</span>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="input w-auto text-sm"
          />
          <span className="text-stone-400 dark:text-stone-500 text-sm">até</span>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="input w-auto text-sm"
          />
          {loadingResumos && (
            <div className="w-4 h-4 border-2 border-stone-300 dark:border-stone-600 border-t-stone-600 dark:border-t-stone-300 rounded-full animate-spin" />
          )}
        </div>
        {isAdminGeral && (
          <button
            onClick={() => abrirPdf(
              `/relatorios/geral?dataInicio=${dataInicio}&dataFim=${dataFim}`,
              `relatorio_geral_${dataInicio}_${dataFim}.pdf`
            )}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-600 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
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
              className="card p-4 cursor-pointer hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
              onClick={() => abrirDetalheContinuacao(c)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-stone-400 dark:text-stone-500 uppercase font-semibold mb-0.5">
                    {c.nome}
                  </p>
                  <p className="text-2xl font-bold text-stone-800 dark:text-stone-100">{total}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">jovens e menores ativos</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="w-10 h-10 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center">
                    <Building2 size={18} className="text-stone-400 dark:text-stone-500" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      abrirPdf(
                        `/relatorios/continuacao/${c.id}?dataInicio=${dataInicio}&dataFim=${dataFim}`,
                        `relatorio_${c.nome?.replace(/\s+/g, '_')}_${dataInicio}_${dataFim}.pdf`
                      )
                    }}
                    title="Baixar relatório PDF"
                    className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                  >
                    <FileDown size={15} />
                  </button>
                </div>
              </div>
              {loadingResumos ? (
                <div className="h-5 flex items-center">
                  <div className="w-4 h-4 border border-stone-200 dark:border-stone-700 border-t-stone-400 dark:border-t-stone-500 rounded-full animate-spin" />
                </div>
              ) : perc !== null && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-stone-500 dark:text-stone-400">{labelPeriodo}</span>
                    <span className={`text-xs font-bold ${percTextClass(perc)}`}>{perc}%</span>
                  </div>
                  <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${percBgClass(perc)}`}
                      style={{ width: `${perc}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Gráfico comparativo */}
      {!loadingResumos && continuacoes.length > 0 && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Comparativo de Presença</h2>
            <span className="text-xs text-stone-400 dark:text-stone-500">{labelPeriodo}</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={barData}
              margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
              barCategoryGap="30%"
            >
              <XAxis
                dataKey="nome"
                tick={{ fontSize: 11, fill: axisTickColor }}
                axisLine={{ stroke: axisLineColor }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: axisTickColor }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(v) => [`${v}%`, 'Presença']}
                contentStyle={tooltipStyle}
                cursor={{ fill: cursorFill }}
              />
              <Bar dataKey="percentual" radius={[6, 6, 0, 0]} maxBarSize={80}>
                {barData.map((entry) => (
                  <Cell key={entry.id} fill={percColor(entry.percentual)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas de faltas */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-700">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="section-title">Alertas de Faltas</h2>
            </div>
            <span className="text-xs text-stone-400 dark:text-stone-500">{faltas.length} jovem(ns)</span>
          </div>
          <div className="divide-y divide-stone-50 dark:divide-stone-800 max-h-80 overflow-y-auto">
            {faltas.length === 0 ? (
              <p className="px-5 py-8 text-sm text-stone-400 dark:text-stone-500 text-center">
                Nenhuma falta registrada nos últimos 30 dias.
              </p>
            ) : (
              faltas.map((c) => {
                const telLimpo = (c.telefoneResponsavel ?? '').replace(/\D/g, '')
                const msgWpp = encodeURIComponent(
                  `Paz de Deus ${c.nomeResponsavel ?? 'Responsável'} sou auxiliar da ${c.nomeCompleto}, podemos conversar?`
                )
                const linkWpp = `https://wa.me/55${telLimpo}?text=${msgWpp}`

                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer transition-colors"
                    onClick={() => abrirDetalheCrianca(c.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-700 dark:text-stone-200">{c.nomeCompleto}</p>
                      <p className="text-xs text-stone-400 dark:text-stone-500">{c.continuacao?.nome}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {c.faltasNoPeriodo} falta(s)
                      </span>
                      {telLimpo && (
                        <a
                          href={linkWpp}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Enviar WhatsApp"
                          className="text-emerald-500 hover:text-emerald-600 transition-colors"
                        >
                          <MessageCircle size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Aniversariantes */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-700">
            <div className="flex items-center gap-2">
              <Cake size={16} className="text-rose-400" />
              <h2 className="section-title">Aniversariantes do mês</h2>
            </div>
            <span className="text-xs text-stone-400 dark:text-stone-500 capitalize">{mesNome}</span>
          </div>
          <div className="divide-y divide-stone-50 dark:divide-stone-800 max-h-80 overflow-y-auto">
            {aniversariantes.length === 0 ? (
              <p className="px-5 py-8 text-sm text-stone-400 dark:text-stone-500 text-center">
                Nenhum aniversariante este mês.
              </p>
            ) : (
              aniversariantes.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer transition-colors"
                  onClick={() => abrirDetalheCrianca(c.id)}
                >
                  <div>
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-200">{c.nomeCompleto}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">{c.continuacao?.nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold">
                      {new Date(c.dataNascimento).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">{c.idade} anos</p>
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
          className="card p-5 flex items-center justify-between group hover:border-stone-300 dark:hover:border-stone-600 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <Baby size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Lançar Presença</p>
              <p className="text-xs text-stone-400 dark:text-stone-500">Registrar chamada de hoje</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-stone-300 dark:text-stone-600 group-hover:text-stone-500 dark:group-hover:text-stone-400 transition-colors" />
        </Link>

        <Link
          to="/criancas"
          className="card p-5 flex items-center justify-between group hover:border-stone-300 dark:hover:border-stone-600 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Baby size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Gerenciar Jovens e Menores</p>
              <p className="text-xs text-stone-400 dark:text-stone-500">Cadastros e histórico</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-stone-300 dark:text-stone-600 group-hover:text-stone-500 dark:group-hover:text-stone-400 transition-colors" />
        </Link>
      </div>
      </>
      )}

      {aba === 'analise' && <DashboardAnalise />}

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
                <p className="text-xs text-stone-400 dark:text-stone-500 uppercase font-semibold mb-1">Nome</p>
                <p className="text-sm text-stone-800 dark:text-stone-100 font-medium">{contDetalhe.nome}</p>
              </div>
              <div>
                <p className="text-xs text-stone-400 dark:text-stone-500 uppercase font-semibold mb-1">Descrição</p>
                <p className="text-sm text-stone-600 dark:text-stone-400">{contDetalhe.descricao || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-stone-400 dark:text-stone-500 uppercase font-semibold mb-1">Auxiliares</p>
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  {contDetalhe.auxiliares?.length > 0
                    ? contDetalhe.auxiliares.map((a) => a.nome).join(', ')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-400 dark:text-stone-500 uppercase font-semibold mb-1">Total de jovens/menores</p>
                <p className="text-sm text-stone-800 dark:text-stone-100 font-bold">{contDetalhe._count?.criancas ?? 0}</p>
              </div>
            </div>

            {contDetalhe.resumo?.periodo && (() => {
              const { totalRegistros, totalPresentes, percPresenca } = contDetalhe.resumo.periodo
              const ranking = contDetalhe.resumo.ranking ?? []
              const totalAusentes = ranking.reduce((acc, r) => acc + (r.ausentes ?? 0), 0)
              const totalJustificados = ranking.reduce((acc, r) => acc + (r.justificados ?? 0), 0)
              const pieData = [
                { name: 'Presenças', value: totalPresentes, fill: '#10b981' },
                { name: 'Faltas', value: totalAusentes, fill: '#ef4444' },
                { name: 'Justificadas', value: totalJustificados, fill: '#f59e0b' },
              ].filter((d) => d.value > 0)

              return (
                <>
                  <div className="border-t border-stone-100 dark:border-stone-700 pt-4">
                    <p className="text-xs text-stone-400 dark:text-stone-500 uppercase font-semibold mb-3">
                      Estatísticas — {labelPeriodo}
                    </p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-stone-700 dark:text-stone-200">{totalRegistros}</p>
                        <p className="text-xs text-stone-400 dark:text-stone-500">Registros</p>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalPresentes}</p>
                        <p className="text-xs text-stone-400 dark:text-stone-500">Presenças</p>
                      </div>
                      <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-3 text-center">
                        <p className={`text-lg font-bold ${percTextClass(percPresenca)}`}>{percPresenca}%</p>
                        <p className="text-xs text-stone-400 dark:text-stone-500">Presença</p>
                      </div>
                    </div>

                    {/* Donut chart */}
                    {pieData.length > 0 && (
                      <div className="flex items-center gap-4 py-2">
                        <ResponsiveContainer width={130} height={130}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={38}
                              outerRadius={58}
                              paddingAngle={3}
                              dataKey="value"
                              strokeWidth={0}
                            >
                              {pieData.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={tooltipStyle}
                              formatter={(v, n) => [v, n]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2">
                          {pieData.map((d) => (
                            <div key={d.name} className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                              <span className="text-xs text-stone-600 dark:text-stone-400">
                                {d.name}:{' '}
                                <strong className="text-stone-800 dark:text-stone-200">{d.value}</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {ranking.length > 0 && (
                    <div className="border-t border-stone-100 dark:border-stone-700 pt-3">
                      <p className="text-xs text-stone-400 dark:text-stone-500 uppercase font-semibold mb-2">Ranking</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {ranking.map((r, i) => (
                          <div
                            key={r.criancaId}
                            className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                            onClick={() => { setContDetalhe(null); abrirDetalheCrianca(r.criancaId) }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-stone-400 dark:text-stone-500 w-5">{i + 1}.</span>
                              <span className="text-sm text-stone-700 dark:text-stone-200">{r.nome}</span>
                            </div>
                            <span className={`text-xs font-bold ${percTextClass(r.percPresenca)}`}>
                              {r.percPresenca}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
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
              <div className="w-7 h-7 border-2 border-stone-300 dark:border-stone-600 border-t-stone-700 dark:border-t-stone-300 rounded-full animate-spin" />
            </div>
          ) : criancaDetalhe && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <AvatarWithFallback foto={criancaDetalhe.crianca?.foto} nome={criancaDetalhe.crianca?.nomeCompleto} size="lg" />
                <div>
                  <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{criancaDetalhe.crianca?.nomeCompleto}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{criancaDetalhe.crianca?.continuacao?.nome}</p>
                  {criancaDetalhe.crianca?.dataNascimento && (
                    <p className="text-xs text-stone-400 dark:text-stone-500">
                      Nascimento: {new Date(criancaDetalhe.crianca.dataNascimento).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Responsável</p>
                  <p className="text-sm text-stone-700 dark:text-stone-200">{criancaDetalhe.crianca?.nomeResponsavel}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Telefone</p>
                  {criancaDetalhe.crianca?.telefoneResponsavel ? (() => {
                    const tel = criancaDetalhe.crianca.telefoneResponsavel.replace(/\D/g, '')
                    const msg = encodeURIComponent(`Paz de Deus ${criancaDetalhe.crianca.nomeResponsavel ?? 'Responsável'} sou auxiliar da ${criancaDetalhe.crianca.nomeCompleto}, podemos conversar?`)
                    return (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-stone-700 dark:text-stone-200">{criancaDetalhe.crianca.telefoneResponsavel}</p>
                        <a
                          href={`https://wa.me/55${tel}?text=${msg}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Enviar WhatsApp"
                          className="text-emerald-500 hover:text-emerald-600 transition-colors"
                        >
                          <MessageCircle size={15} />
                        </a>
                      </div>
                    )
                  })() : <p className="text-sm text-stone-400">—</p>}
                </div>
              </div>

              {criancaDetalhe.estatisticas && (
                <div className="border-t border-stone-100 dark:border-stone-700 pt-3">
                  <p className="text-xs text-stone-400 dark:text-stone-500 uppercase font-semibold mb-2">
                    Estatísticas — {labelPeriodo}
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Total', val: criancaDetalhe.estatisticas.total, color: 'text-stone-700 dark:text-stone-200', bg: 'bg-stone-50 dark:bg-stone-800' },
                      { label: 'Presenças', val: criancaDetalhe.estatisticas.presentes, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                      { label: 'Faltas', val: criancaDetalhe.estatisticas.ausentes, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                      { label: 'Justificadas', val: criancaDetalhe.estatisticas.justificados, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    ].map((s) => (
                      <div key={s.label} className={`rounded-lg p-3 text-center ${s.bg}`}>
                        <p className={`text-xl font-bold ${s.color}`}>{s.val ?? 0}</p>
                        <p className="text-xs text-stone-400 dark:text-stone-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {criancaDetalhe.historico?.length > 0 && (
                <div className="border-t border-stone-100 dark:border-stone-700 pt-3">
                  <p className="text-xs text-stone-400 dark:text-stone-500 uppercase font-semibold mb-2">Últimas presenças</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {criancaDetalhe.historico.slice(0, 10).map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                        <span className="text-sm text-stone-600 dark:text-stone-300">
                          {new Date(p.data.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.status === 'presente'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                            : p.status === 'ausente'
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-stone-100 dark:border-stone-700 pt-3">
                <p className="text-xs text-stone-400 dark:text-stone-500 uppercase font-semibold mb-2">Visitas</p>
                {visitasCrianca.length === 0 ? (
                  <p className="text-sm text-stone-400 dark:text-stone-500">Nenhuma visita registrada.</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {visitasCrianca.slice(0, 5).map((v) => (
                      <div key={v.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                        <div>
                          <span className="text-sm text-stone-600 dark:text-stone-300">
                            {new Date(v.data.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')} às {v.hora}
                          </span>
                          <span className="text-xs text-stone-400 dark:text-stone-500 ml-2">· {v.responsavel?.nome}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          v.status === 'concluida'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                            : v.status === 'remarcada'
                            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                        }`}>
                          {v.status === 'concluida' ? 'Concluída' : v.status === 'remarcada' ? 'Remarcada' : 'Pendente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
