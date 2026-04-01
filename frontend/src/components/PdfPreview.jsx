import { useState } from 'react'
import { FileDown, X, Loader2 } from 'lucide-react'
import api from '../api/client'

/**
 * Componente de pré-visualização de PDF.
 * Recebe a URL da API (sem /api, pois o client já tem baseURL) e exibe em iframe.
 * Botão "Baixar" para confirmar o download.
 */
export default function PdfPreview({ url, nomeArquivo, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  // Busca o PDF ao montar
  useState(() => {
    let cancelled = false
    api
      .get(url, { responseType: 'blob' })
      .then((resp) => {
        if (cancelled) return
        const blob = new Blob([resp.data], { type: 'application/pdf' })
        setBlobUrl(URL.createObjectURL(blob))
      })
      .catch(() => !cancelled && setErro(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  })

  const confirmarDownload = () => {
    if (!blobUrl) return
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = nomeArquivo ?? 'relatorio.pdf'
    link.click()
  }

  const fechar = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={fechar} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ height: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 shrink-0">
          <h2 className="text-sm font-semibold text-stone-800">Pré-visualização do Relatório</h2>
          <div className="flex items-center gap-2">
            {blobUrl && (
              <button
                onClick={confirmarDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
              >
                <FileDown size={14} />
                Baixar PDF
              </button>
            )}
            <button
              onClick={fechar}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={28} className="animate-spin text-stone-400" />
            </div>
          )}
          {erro && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-red-500">Erro ao carregar o relatório.</p>
            </div>
          )}
          {blobUrl && (
            <iframe
              src={blobUrl}
              title="Relatório PDF"
              className="w-full h-full border-0"
            />
          )}
        </div>
      </div>
    </div>
  )
}
