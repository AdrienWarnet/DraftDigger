import { useSyncExternalStore } from 'react'

/**
 * Bouton « Installer l'app » (T7.5). Chrome Android annonce que l'installation est possible avec
 * l'événement `beforeinstallprompt` : on le garde pour ouvrir la fenêtre d'installation au clic.
 * Rien à proposer si l'app est déjà installée (`appinstalled`, ou lancée en mode `standalone`).
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

/** À appeler au démarrage, avant le rendu : l'événement peut arriver très tôt. */
export function initInstallPrompt() {
  installed = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  window.addEventListener('beforeinstallprompt', (event) => {
    // On remplace le mini-bandeau de Chrome par notre propre bouton.
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    notify()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const canInstallNow = () => !installed && deferred !== null

/** `true` quand le navigateur permet d'installer l'app maintenant. */
export function useCanInstall(): boolean {
  return useSyncExternalStore(subscribe, canInstallNow, () => false)
}

/** Ouvre la fenêtre d'installation du navigateur. Le même événement ne sert qu'une fois. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferred
  if (!event) return 'unavailable'
  deferred = null
  notify()
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome
}
