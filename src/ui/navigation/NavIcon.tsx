import type { ReactNode } from 'react'
import type { ScreenId } from './routes'

const paths: Record<ScreenId, ReactNode> = {
  // 2 × 3 emplacements : la draft
  draft: (
    <>
      <rect x="4" y="4" width="6" height="4" rx="1" />
      <rect x="14" y="4" width="6" height="4" rx="1" />
      <rect x="4" y="10" width="6" height="4" rx="1" />
      <rect x="14" y="10" width="6" height="4" rx="1" />
      <rect x="4" y="16" width="6" height="4" rx="1" />
      <rect x="14" y="16" width="6" height="4" rx="1" />
    </>
  ),
  // Ampoule : le conseil
  reco: (
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
  ),
  // Horloge : la partie en cours
  partie: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  // Liste : les builds
  builds: (
    <>
      <rect x="4" y="5" width="4" height="4" rx="1" />
      <rect x="4" y="15" width="4" height="4" rx="1" />
      <path d="M11 7h9M11 17h9M11 12h9" />
    </>
  ),
}

export function NavIcon({ screen }: { screen: ScreenId }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[screen]}
    </svg>
  )
}
