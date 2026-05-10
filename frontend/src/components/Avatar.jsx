import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn } from 'lucide-react'

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
}

function FotoLightbox({ src, nome, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleEsc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"
      onMouseDown={(e) => { e.stopPropagation(); onClose() }}
    >
      <button
        onMouseDown={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt={nome || 'Foto'}
        className="max-w-[88vw] max-h-[80vh] rounded-2xl object-contain shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      />
      {nome && (
        <p className="mt-5 text-white text-sm font-medium bg-black/50 px-4 py-1.5 rounded-full select-none">
          {nome}
        </p>
      )}
    </div>,
    document.body
  )
}

export default function Avatar({ foto, nome, size = 'sm', className = '' }) {
  const sizeClass = SIZES[size] || SIZES.sm
  const iniciais = nome
    ? nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
    : '?'

  if (foto) {
    return (
      <img
        src={foto}
        alt={nome || 'Foto'}
        className={`${sizeClass} rounded-full object-cover border border-stone-200 shrink-0 ${className}`}
        onError={(e) => {
          e.target.style.display = 'none'
          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
        }}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center shrink-0 ${className}`}
      title={nome}
    >
      <span className="font-semibold text-stone-500 dark:text-stone-300">{iniciais}</span>
    </div>
  )
}

export function AvatarWithFallback({ foto, nome, size = 'sm', className = '' }) {
  const sizeClass = SIZES[size] || SIZES.sm
  const [lightbox, setLightbox] = useState(false)
  const iniciais = nome
    ? nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
    : '?'

  const abrirLightbox = (e) => {
    e.stopPropagation()
    setLightbox(true)
  }

  return (
    <>
      <div
        className={`relative ${sizeClass} shrink-0 ${className} ${foto ? 'cursor-zoom-in group' : ''}`}
        onClick={foto ? abrirLightbox : undefined}
        title={foto ? 'Clique para ampliar' : nome}
      >
        {foto ? (
          <>
            <img
              src={foto}
              alt={nome || 'Foto'}
              className={`${sizeClass} rounded-full object-cover border border-stone-200 dark:border-stone-600 transition-opacity group-hover:opacity-75`}
              onError={(e) => {
                e.target.style.display = 'none'
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
              }}
            />
            {/* Fallback se a imagem falhar ao carregar */}
            <div
              className={`${sizeClass} rounded-full bg-stone-200 dark:bg-stone-700 items-center justify-center absolute inset-0`}
              style={{ display: 'none' }}
            >
              <span className="font-semibold text-stone-500 dark:text-stone-300">{iniciais}</span>
            </div>
            {/* Overlay de zoom — pointer-events-none para não bloquear o clique no pai */}
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <ZoomIn size={size === 'lg' ? 18 : 12} className="text-white drop-shadow-md" />
            </div>
          </>
        ) : (
          <div
            className={`${sizeClass} rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center`}
            title={nome}
          >
            <span className="font-semibold text-stone-500 dark:text-stone-300">{iniciais}</span>
          </div>
        )}
      </div>

      {lightbox && foto && (
        <FotoLightbox src={foto} nome={nome} onClose={() => setLightbox(false)} />
      )}
    </>
  )
}
