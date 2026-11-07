import type { KeyboardEvent } from 'react'
import styles from './Tabs.module.css'

export type TabOption<T extends string> = {
  value: T
  label: string
  /** Teinte de l'onglet actif (ex : vert pour « Devant »). Or par défaut. */
  tone?: 'accent' | 'ahead' | 'even' | 'behind'
}

type TabsProps<T extends string> = {
  label: string
  options: TabOption<T>[]
  value: T
  onChange: (value: T) => void
}

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/** Choix exclusif entre quelques options, en une seule rangée tactile (groupe de boutons radio). */
export function Tabs<T extends string>({ label, options, value, onChange }: TabsProps<T>) {
  const currentIndex = options.findIndex((o) => o.value === value)

  // Clavier : flèches pour changer d'option, Début/Fin pour aller aux extrémités.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = options.length - 1
    let next: number
    if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else if (event.key in STEP)
      next = (currentIndex + (STEP[event.key] ?? 0) + options.length) % options.length
    else return
    event.preventDefault()
    const option = options[next]
    if (!option) return
    onChange(option.value)
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
  }

  return (
    <div
      className={styles.tabs}
      role="radiogroup"
      aria-label={label}
      data-dense={options.length >= 5 || undefined}
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={[styles.tab, styles[option.tone ?? 'accent']].join(' ')}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
