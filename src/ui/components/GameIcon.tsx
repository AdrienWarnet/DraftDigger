import styles from './GameIcon.module.css'

type GameIconProps = {
  /** Élément à afficher ; `null` = id inconnu dans ce patch (affiche « ? »). */
  entry: { name: string; icon: string } | null
  /** Id affiché dans l'infobulle quand l'élément est inconnu. */
  fallbackId?: string
  size: number
  shape?: 'square' | 'round'
  /** Nom lu par les lecteurs d'écran (par défaut : le nom de l'élément). */
  label?: string
}

/** Icône Data Dragon (champion, item, rune, sort) avec repli si l'id n'existe plus. */
export function GameIcon({ entry, fallbackId, size, shape = 'square', label }: GameIconProps) {
  const style = { width: size, height: size }
  if (!entry) {
    const text = label ?? `Inconnu dans ce patch${fallbackId ? ` (${fallbackId})` : ''}`
    return (
      <span
        className={styles.missing}
        data-shape={shape}
        style={style}
        role="img"
        aria-label={text}
        title={text}
      >
        ?
      </span>
    )
  }
  return (
    <img
      className={styles.icon}
      data-shape={shape}
      src={entry.icon}
      alt={label ?? entry.name}
      title={entry.name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
    />
  )
}
