import { useState, useEffect, useRef } from 'react'
import { Download, Share, X } from 'lucide-react'

function isIOS() {
  return /iPhone|iPad/.test(navigator.userAgent) ||
    (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
}

function isAndroid() {
  return /Android/.test(navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && navigator.standalone === true)
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false)
  const [ios, setIos] = useState(false)
  const [promptReady, setPromptReady] = useState(false)
  const deferredPrompt = useRef(null)

  useEffect(() => {
    if (isStandalone()) return
    if (localStorage.getItem('pwa_banner_dismissed') === 'true') return

    const iosDevice = isIOS()
    setIos(iosDevice)

    if (!iosDevice && !isAndroid()) return

    setVisible(true)

    if (iosDevice) return

    function handleBeforeInstallPrompt(e) {
      e.preventDefault()
      deferredPrompt.current = e
      setPromptReady(true)
    }

    function handleAppInstalled() {
      setVisible(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  function dismiss() {
    localStorage.setItem('pwa_banner_dismissed', 'true')
    setVisible(false)
  }

  async function install() {
    const prompt = deferredPrompt.current
    if (!prompt) return
    deferredPrompt.current = null
    setPromptReady(false)
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') dismiss()
    else {
      deferredPrompt.current = prompt
      setPromptReady(true)
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 bg-white/95 dark:bg-stone-900/95 border-t border-stone-200 dark:border-stone-700 shadow-lg">
      {ios ? (
        <Share size={20} className="shrink-0 text-stone-600 dark:text-stone-300" />
      ) : (
        <Download size={20} className="shrink-0 text-stone-600 dark:text-stone-300" />
      )}
      <p className="flex-1 text-sm text-stone-700 dark:text-stone-300">
        {ios
          ? 'Toque em Compartilhar (□↑) e depois "Adicionar à tela inicial"'
          : 'Instale o CCB na sua tela inicial'}
      </p>
      {!ios && promptReady && (
        <button
          type="button"
          onClick={install}
          className="shrink-0 px-3 py-1.5 text-sm font-medium bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors"
        >
          Instalar
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
        aria-label="Fechar"
      >
        <X size={18} />
      </button>
    </div>
  )
}
