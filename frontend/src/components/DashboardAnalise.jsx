import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import api from '../api/client'
import { useTheme } from '../contexts/ThemeContext'

const CORES = ['#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#14b8a6']

const toISO = (d) => {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

const defaultInicio = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 3)
  return toISO(d)
}

export default function DashboardAnalise() {
  const { dark } = useTheme()
  const [dataInicio, setDataInicio] = useState(defaultInicio)
  const [dataFim,    setDataFim]    = useState(() => toISO(new Date()))
  const [dados,      setDados]      = useState(null)
  const [loading,    setLoading]    = useState(false)

  const tooltipStyle = {
    backgroundColor: dark ? '#1c1917' : '#fff',
    border: `1px solid ${dark ? '#44403c' : '#e7e5e4'}`,
    borderRadius: '8px',
    fontSize: '12px',
    color: dark ? '#f5f5f4' : '#1c1917',
  }
  const axisColor = dark ? '#78716c' : '#a8a29e'
  const gridColor = dark ? '#292524' : '#f5f4f1'

  const carregar = useCallback(async (ini, fim) => {
    if (!ini || !fim || ini > fim) return
    setLoading(true)
    try {
      const res = await api.get(`/dashboard/serie-temporal?dataInicio=${ini}&dataFim=${fim}`)
      setDados(res.data)
    } catch {
      // silencioso — não quebra a página
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => carregar(dataInicio, dataFim), 500)
    return () => clearTimeout(t)
  }, [dataInicio, dataFim, carregar])

  const buildData = (eixo, series) => {
    if (!eixo?.length || !series?.length) return []
    return eixo.map((label, i) => {
      const entry = { label }
      series.forEach((s) => { entry[s.nome] = s.pontos[i] ?? null })
      return entry
    })
  }

  const presencaData = dados ? buildData(dados.presenca.semanas, dados.presenca.series) : []
  const visitasData  = dados ? buildData(dados.visitas.meses,    dados.visitas.series)  : []
  const series       = dados?.presenca.series ?? []

  const fmtSemana = (v) => {
    if (!v) return ''
    const d = new Date(v + 'T00:00:00')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }
  const fmtMes = (v) => {
    if (!v) return ''
    const [ano, mes] = v.split('-')
    return new Date(Number(ano), Number(mes) - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  }

  return (
    <div className="space-y-6">
      {/* Seletor de período */}
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
        {loading && (
          <div className="w-4 h-4 border-2 border-stone-300 dark:border-stone-600 border-t-stone-600 dark:border-t-stone-300 rounded-full animate-spin" />
        )}
      </div>

      {!dados && !loading && (
        <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">
          Selecione um período para carregar os dados.
        </p>
      )}

      {dados && (
        <>
          {/* ── PRESENÇA ─────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-3">
              Presença por Continuação
            </p>
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="card p-4 flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">Evolução de Presença</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">presenças por semana por continuação</p>
                {presencaData.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-8">Sem registros no período.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={presencaData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickFormatter={fmtSemana}
                        tick={{ fontSize: 10, fill: axisColor }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: axisColor }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelStyle={{ color: dark ? '#f5f5f4' : '#1c1917' }}
                        itemStyle={{ color: dark ? '#a8a29e' : '#78716c' }}
                        formatter={(v, name) => [v !== null ? v : '—', name]}
                        labelFormatter={fmtSemana}
                      />
                      {series.map((s, i) => (
                        <Line
                          key={s.continuacaoId}
                          type="monotone"
                          dataKey={s.nome}
                          stroke={CORES[i % CORES.length]}
                          strokeWidth={2}
                          dot={{ r: 3, fill: CORES[i % CORES.length] }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Cards presença */}
              <div className="flex flex-row md:flex-col gap-2 md:w-52 flex-wrap md:flex-nowrap md:max-h-72 md:overflow-y-auto">
                {dados.resumo.presenca.map((r, i) => {
                  const cor = CORES[i % CORES.length]
                  return (
                    <div
                      key={r.continuacaoId}
                      className="card p-3 flex-1 md:flex-none"
                      style={{ borderLeft: `3px solid ${cor}` }}
                    >
                      <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">
                        {r.nome}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xl font-extrabold" style={{ color: cor }}>
                          {r.percPresenca}%
                        </span>
                        <div className="flex flex-col gap-0.5 text-right">
                          <span className="text-xs">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{r.presentes}</span>
                            <span className="text-stone-400 dark:text-stone-500 ml-1">pres.</span>
                          </span>
                          <span className="text-xs">
                            <span className="font-bold text-red-500 dark:text-red-400">{r.ausentes}</span>
                            <span className="text-stone-400 dark:text-stone-500 ml-1">falta</span>
                          </span>
                          <span className="text-xs">
                            <span className="font-bold text-amber-500 dark:text-amber-400">{r.justificados}</span>
                            <span className="text-stone-400 dark:text-stone-500 ml-1">just.</span>
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 h-1 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${r.percPresenca}%`, backgroundColor: cor }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── VISITAS ──────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-3">
              Visitas Concluídas por Continuação
            </p>
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="card p-4 flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">Evolução de Visitas</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">Visitas concluídas por mês</p>
                {visitasData.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-8">Sem visitas no período.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={visitasData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickFormatter={fmtMes}
                        tick={{ fontSize: 10, fill: axisColor }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: axisColor }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelStyle={{ color: dark ? '#f5f5f4' : '#1c1917' }}
                        itemStyle={{ color: dark ? '#a8a29e' : '#78716c' }}
                        formatter={(v, name) => [v, name]}
                        labelFormatter={fmtMes}
                      />
                      {series.map((s, i) => (
                        <Line
                          key={s.continuacaoId}
                          type="monotone"
                          dataKey={s.nome}
                          stroke={CORES[i % CORES.length]}
                          strokeWidth={2}
                          dot={{ r: 3, fill: CORES[i % CORES.length] }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Cards visitas */}
              <div className="flex flex-row md:flex-col gap-2 md:w-52 flex-wrap md:flex-nowrap md:max-h-72 md:overflow-y-auto">
                {dados.resumo.visitas.map((r, i) => {
                  const cor = CORES[i % CORES.length]
                  return (
                    <div
                      key={r.continuacaoId}
                      className="card p-3 flex-1 md:flex-none"
                      style={{ borderLeft: `3px solid ${cor}` }}
                    >
                      <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">
                        {r.nome}
                      </p>
                      <div className="flex flex-col gap-1">
                        {[
                          { label: 'Concluídas', val: r.concluidas, cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' },
                          { label: 'Pendentes',  val: r.pendentes,  cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'   },
                          { label: 'Remarcadas', val: r.remarcadas, cls: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between items-center">
                            <span className="text-xs text-stone-400 dark:text-stone-500">{item.label}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.cls}`}>
                              {item.val}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
