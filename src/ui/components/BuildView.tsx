import type { GameCatalog } from '../../data/catalog'
import type { PatchIssue } from '../../engine/patchValidation'
import type { Build } from '../../engine/types'
import { POSITION_LABELS } from '../labels'
import styles from './BuildView.module.css'
import { GameIcon } from './GameIcon'

type BuildViewProps = {
  build: Build
  catalog: GameCatalog
  /** Éléments du build introuvables ou déplacés dans le patch courant. */
  issues?: PatchIssue[]
  /** Sections à afficher (toutes par défaut). */
  sections?: readonly BuildViewSection[]
  /** Masque l'en-tête (champion, nom) quand la carte englobante l'affiche déjà. */
  hideHeader?: boolean
}

export type BuildViewSection = 'runes' | 'spells' | 'firstItem' | 'items'
const ALL_SECTIONS: readonly BuildViewSection[] = ['runes', 'spells', 'firstItem', 'items']

/** Un build lisible d'un coup d'œil : runes, sorts, premier item, ordre des items. */
export function BuildView({
  build,
  catalog,
  issues = [],
  sections = ALL_SECTIONS,
  hideHeader = false,
}: BuildViewProps) {
  const show = (section: BuildViewSection) => sections.includes(section)
  const champion = catalog.championsById.get(build.championId) ?? null
  const { runes } = build
  const keystone = catalog.runesById.get(runes.keystone) ?? null
  const primaryTree = catalog.treesById.get(runes.primaryTree) ?? null
  const secondaryTree = catalog.treesById.get(runes.secondaryTree) ?? null
  const rune = (id: string) => catalog.runesById.get(id) ?? null
  const item = (id: string) => {
    const found = catalog.itemsById.get(id)
    return found ? { name: found.name, icon: found.image } : null
  }
  const nameOf = (entry: { name: string } | null, id: string) => entry?.name ?? `inconnu (${id})`
  const minorNames = [...runes.primarySlots, ...runes.secondarySlots]
    .map((id) => nameOf(rune(id), id))
    .join(', ')

  return (
    <article
      className={styles.build}
      data-embedded={hideHeader || undefined}
      aria-label={`Build ${build.name}`}
    >
      {!hideHeader && (
        <header className={styles.header}>
          <GameIcon
            entry={champion && { name: champion.name, icon: champion.image }}
            fallbackId={build.championId}
            size={48}
          />
          <div className={styles.titles}>
            <h2 className={styles.name}>{build.name}</h2>
            <p className="muted">
              {champion?.name ?? build.championId}, {POSITION_LABELS[build.position]}
            </p>
          </div>
        </header>
      )}

      {issues.length > 0 && (
        <div className={styles.issues} role="alert">
          <p>
            {issues.length === 1
              ? `1 élément à revoir pour le patch ${catalog.version} :`
              : `${issues.length} éléments à revoir pour le patch ${catalog.version} :`}
          </p>
          <ul>
            {issues.map((issue) => (
              <li key={issue.path}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      {show('runes') && (
        <section className={styles.section} aria-label="Runes">
          <h3 className={styles.sectionTitle}>Runes</h3>
          <div className={styles.runes}>
            <div className={styles.runeTree}>
              <GameIcon
                entry={primaryTree}
                fallbackId={runes.primaryTree}
                size={24}
                shape="round"
              />
              <GameIcon entry={keystone} fallbackId={runes.keystone} size={48} shape="round" />
              {runes.primarySlots.map((id, i) => (
                <GameIcon
                  key={`${id}-${i}`}
                  entry={rune(id)}
                  fallbackId={id}
                  size={32}
                  shape="round"
                />
              ))}
            </div>
            <div className={styles.runeTree}>
              <GameIcon
                entry={secondaryTree}
                fallbackId={runes.secondaryTree}
                size={24}
                shape="round"
              />
              {runes.secondarySlots.map((id, i) => (
                <GameIcon
                  key={`${id}-${i}`}
                  entry={rune(id)}
                  fallbackId={id}
                  size={32}
                  shape="round"
                />
              ))}
              <span className={styles.shards}>
                {runes.shards.map((id, i) => (
                  <GameIcon
                    key={`${id}-${i}`}
                    entry={catalog.shardsById.get(id) ?? null}
                    fallbackId={id}
                    size={22}
                    shape="round"
                  />
                ))}
              </span>
            </div>
          </div>
          <p className={styles.caption}>
            <strong>{nameOf(keystone, runes.keystone)}</strong> (
            {nameOf(primaryTree, runes.primaryTree)} et {nameOf(secondaryTree, runes.secondaryTree)}
            ) : {minorNames}.
          </p>
        </section>
      )}

      {show('spells') && (
        <section className={styles.section} aria-label="Sorts d'invocateur">
          <h3 className={styles.sectionTitle}>Sorts</h3>
          <ul className={styles.inline}>
            {build.summonerSpells.map((id) => {
              const spell = catalog.summonerSpellsById.get(id) ?? null
              return (
                <li key={id} className={styles.named}>
                  <GameIcon entry={spell} fallbackId={id} size={32} label="" />
                  <span>{nameOf(spell, id)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {show('firstItem') && (
        <section className={styles.section} aria-label="Premier item">
          <h3 className={styles.sectionTitle}>Premier item</h3>
          <ul className={styles.inline}>
            {build.firstItemOptions.map((option, i) => (
              <li key={option.itemId} className={styles.named}>
                {i > 0 && <span className={styles.or}>ou</span>}
                <GameIcon
                  entry={item(option.itemId)}
                  fallbackId={option.itemId}
                  size={32}
                  label=""
                />
                <span>{nameOf(item(option.itemId), option.itemId)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {show('items') && (
        <section className={styles.section} aria-label="Ordre des items">
          <h3 className={styles.sectionTitle}>Ordre des items</h3>
          <ol className={styles.slots}>
            {[...build.itemOrder]
              .sort((a, b) => a.slot - b.slot)
              .map((slot) => (
                <li key={slot.slot} className={styles.slot}>
                  <span className={styles.slotNumber}>{slot.slot}</span>
                  <GameIcon entry={item(slot.default)} fallbackId={slot.default} size={40} />
                  {slot.alternatives.length > 0 && (
                    <span className={styles.alternatives} aria-label="Alternatives">
                      {slot.alternatives.map((alt) => (
                        <GameIcon
                          key={alt.itemId}
                          entry={item(alt.itemId)}
                          fallbackId={alt.itemId}
                          size={22}
                          label={`ou ${nameOf(item(alt.itemId), alt.itemId)} : ${alt.explain}`}
                        />
                      ))}
                    </span>
                  )}
                </li>
              ))}
          </ol>
          {build.itemOrder.some((s) => s.alternatives.length > 0) && (
            <p className={styles.caption}>Sous un item : son alternative selon la partie.</p>
          )}
        </section>
      )}
    </article>
  )
}
