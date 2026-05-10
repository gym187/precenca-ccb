import { useEffect, useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const PERIODOS = [
  { v: '1m', l: 'Último mês' },
  { v: '3m', l: 'Últimos 3 meses' },
  { v: '6m', l: 'Últimos 6 meses' },
  { v: '12m', l: 'Último ano' },
  { v: 'all', l: 'Todo o período' },
]

async function baixarPdf(url, nomeArquivo) {
  const res = await api.get(url, { responseType: 'blob' })
  const href = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = href
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(href)
}

async function baixarCsv(url, nomeArquivo) {
  const res = await api.get(url, { responseType: 'blob' })
  const href = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = href
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(href)
}

export default function Relatorios() {
  const { isAdminGeral } = useAuth()
  const { success, error } = useToast()

  const [continuacoes, setContinuacoes] = useState([])
  const [periodo, setPeriodo] = useState('1m')
  const [contSelecionada, setContSelecionada] = useState('')
  const [loading, setLoading] = useState({})

  useEffect(() => {
    api.get('/continuacoes').then((r) => {
      setContinuacoes(r.data)
      if (r.data.length > 0) setContSelecionada(r.data[0].id)
    })
  }, [])

  const baixar = async (tipo) => {
    setLoading((p) => ({ ...p, [tipo]: true }))
    try {
      const data = new Date().toISOString().slice(0, 10)
      if (tipo === 'geral') {
        await baixarPdf(`/relatorios/geral?periodo=${periodo}`, `relatorio_geral_${data}.pdf`)
      } else if (tipo === 'administrativo') {
        await baixarPdf(`/relatorios/administrativo?periodo=${periodo}`, `relatorio_administrativo_${data}.pdf`)
      } else if (tipo === 'continuacao') {
        if (!contSelecionada) return
        const nome = continuacoes.find((c) => c.id === contSelecionada)?.nome ?? 'continuacao'
        const nomeSlug = nome.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        await baixarPdf(
          `/relatorios/continuacao/${contSelecionada}?periodo=${periodo}`,
          `relatorio_${nomeSlug}_${data}.pdf`
        )
      } else if (tipo === 'csv') {
        if (!contSelecionada) return
        const nome = continuacoes.find((c) => c.id === contSelecionada)?.nome ?? 'continuacao'
        const nomeSlug = nome.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        await baixarCsv(
          `/relatorios/csv?continuacaoId=${contSelecionada}&periodo=${periodo}`,
          `presencas_${nomeSlug}_${data}.csv`
        )
      }
      success(tipo === 'csv' ? 'CSV exportado com sucesso.' : 'PDF gerado com sucesso.')
    } catch {
      error('Erro ao gerar o relatório. Tente novamente.')
    } finally {
      setLoading((p) => ({ ...p, [tipo]: false }))
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-stone-900">Relatórios</h1>
        <p className="text-sm text-stone-500 mt-1">Gere relatórios em PDF por período.</p>
      </div>

      {/* Período */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
        <p className="text-sm font-semibold text-stone-700">Período</p>
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.v}
              onClick={() => setPeriodo(p.v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                periodo === p.v
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
              }`}
            >
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* Relatório por continuação */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-stone-700">Por continuação</p>
          <p className="text-xs text-stone-400 mt-0.5">Presença individual de cada jovem/menor.</p>
        </div>
        <select
          value={contSelecionada}
          onChange={(e) => setContSelecionada(e.target.value)}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          {continuacoes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <div className="flex gap-2 flex-wrap">
          <BotaoDownload loading={loading.continuacao} onClick={() => baixar('continuacao')}>
            Baixar PDF
          </BotaoDownload>
          <BotaoDownload loading={loading.csv} onClick={() => baixar('csv')} variante="secondary">
            Exportar CSV
          </BotaoDownload>
        </div>
      </div>

      {/* Relatório geral */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-stone-700">Geral</p>
          <p className="text-xs text-stone-400 mt-0.5">Todas as continuações que você tem acesso.</p>
        </div>
        <BotaoDownload loading={loading.geral} onClick={() => baixar('geral')}>
          Baixar PDF
        </BotaoDownload>
      </div>

      {/* Relatório administrativo — só admin */}
      {isAdminGeral && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-stone-700">Administrativo</p>
            <p className="text-xs text-stone-400 mt-0.5">Ranking e resumo de todas as continuações.</p>
          </div>
          <BotaoDownload loading={loading.administrativo} onClick={() => baixar('administrativo')}>
            Baixar PDF
          </BotaoDownload>
        </div>
      )}
    </div>
  )
}

function BotaoDownload({ loading, onClick, children, variante = 'primary' }) {
  const estilos = variante === 'secondary'
    ? 'bg-white text-stone-700 border border-stone-200 hover:border-stone-400'
    : 'bg-stone-900 text-white hover:bg-stone-700'
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${estilos}`}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
      {children}
    </button>
  )
}
