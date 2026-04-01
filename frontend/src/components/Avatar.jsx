import { User } from 'lucide-react'

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
}

export default function Avatar({ foto, nome, size = 'sm', className = '' }) {
  const sizeClass = SIZES[size] || SIZES.sm
  const iniciais = nome
    ? nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    : '?'

  if (foto) {
    return (
      <img
        src={foto}
        alt={nome || 'Foto'}
        className={`${sizeClass} rounded-full object-cover border border-stone-200 shrink-0 ${className}`}
        onError={(e) => {
          e.target.style.display = 'none'
          e.target.nextSibling.style.display = 'flex'
        }}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-stone-200 flex items-center justify-center shrink-0 ${className}`}
      title={nome}
    >
      <span className="font-semibold text-stone-500">{iniciais}</span>
    </div>
  )
}

export function AvatarWithFallback({ foto, nome, size = 'sm', className = '' }) {
  const sizeClass = SIZES[size] || SIZES.sm
  const iniciais = nome
    ? nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    : '?'

  return (
    <div className={`relative ${sizeClass} shrink-0 ${className}`}>
      {foto ? (
        <>
          <img
            src={foto}
            alt={nome || 'Foto'}
            className={`${sizeClass} rounded-full object-cover border border-stone-200`}
            onError={(e) => {
              e.target.style.display = 'none'
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
            }}
          />
          <div
            className={`${sizeClass} rounded-full bg-stone-200 items-center justify-center absolute inset-0`}
            style={{ display: 'none' }}
          >
            <span className="font-semibold text-stone-500">{iniciais}</span>
          </div>
        </>
      ) : (
        <div
          className={`${sizeClass} rounded-full bg-stone-200 flex items-center justify-center`}
          title={nome}
        >
          <span className="font-semibold text-stone-500">{iniciais}</span>
        </div>
      )}
    </div>
  )
}
