import { useMemo } from 'react'
import { INVENTORY } from '../../engine/config'
import type { Situation } from '../../engine/types'
import { nextItemFallbackReason } from '../../engine/explain'
import { buildSuggestions, componentTarget } from '../../engine/inventory'
import { useDraftStore } from '../../store/draftStore'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { GameIcon } from '../components/GameIcon'
import { ItemPicker } from '../components/ItemPicker'
import { Sheet } from '../components/Sheet'
import { Tabs, type TabOption } from '../components/Tabs'
import { useCatalog } from '../data/gameDataContext'
import { useGameRecommendation, usePreGameRecommendation } from '../data/useRecommendation'
import { SITUATION_LABELS } from '../labels'
import { goBack, navigate, useRouteParams } from '../navigation/useRoute'
import styles from './GameScreen.module.css'

const SITUATION_OPTIONS: TabOption<Situation>[] = [
  { value: 'ahead', label: SITUATION_LABELS.ahead, tone: 'ahead' },
  { value: 'even', label: SITUATION_LABELS.even, tone: 'even' },
  { value: 'behind', label: SITUATION_LABELS.behind, tone: 'behind' },
]

const ADD_PARAM = 'ajouter'
const ITEM_PARAM = 'item'

/** Panneau ouvert d'après l'URL : `#/partie/ajouter` ou `#/partie/item/2`. */
function parseSheet(params: readonly string[], ownedCount: number) {
  if (params[0] === ADD_PARAM && ownedCount < INVENTORY.maxItems) return { kind: 'add' } as const
  if (params[0] === ITEM_PARAM) {
    const index = Number(params[1])
    if (Number.isInteger(index) && index >= 0 && index < ownedCount) {
      return { kind: 'item', index } as const
    }
  }
  return null
}

export function GameScreen() {
  const catalog = useCatalog()
  const result = usePreGameRecommendation()
  const owned = useDraftStore((s) => s.ownedItemIds)
  const buy = useDraftStore((s) => s.buyItem)
  const remove = useDraftStore((s) => s.removeItem)
  const replace = useDraftStore((s) => s.replaceItem)
  const situation = useDraftStore((s) => s.situation)
  const setSituation = useDraftStore((s) => s.setSituation)
  const sheet = parseSheet(useRouteParams(), owned.length)
  const next = useGameRecommendation(result, owned, situation)

  const build =
    result.status === 'ready' && result.build.kind === 'ok'
      ? result.build.recommendation.choice
      : null
  const suggestions = useMemo(
    () => (build ? buildSuggestions(build, owned, catalog.itemsById) : []),
    [build, owned, catalog.itemsById],
  )

  if (result.status === 'loading') {
    return (
      <p className="muted" role="status">
        Chargement de tes builds…
      </p>
    )
  }

  if (result.status === 'noChampion') {
    return (
      <EmptyState
        title="Aucune partie en cours"
        description="Choisis ton poste et ton champion dans la draft pour suivre tes achats et savoir quoi acheter ensuite."
        action={
          <Button variant="secondary" onClick={() => navigate('draft')}>
            Remplir la draft
          </Button>
        }
      />
    )
  }

  const closeSheet = () => goBack('partie')
  const itemName = (id: string) => catalog.itemsById.get(id)?.name ?? id
  const emptySlots = INVENTORY.maxItems - owned.length

  return (
    <>
      <div className={styles.situation}>
        <Tabs
          label="Ta situation dans la partie"
          options={SITUATION_OPTIONS}
          value={situation}
          onChange={setSituation}
        />
      </div>

      <p className="muted">
        {build
          ? `Build : ${build.name}`
          : `Aucun build pour ce champion : les achats sont notés sans suggestion.`}
      </p>

      {next && (
        <section className={styles.nextCard} aria-label="Prochain item">
          {next.recommendation ? (
            <>
              <div className={styles.next}>
                <GameIcon
                  entry={{
                    name: next.recommendation.choice.name,
                    icon: next.recommendation.choice.image,
                  }}
                  size={48}
                  label=""
                />
                <div className={styles.nextText}>
                  <p className={styles.nextLabel}>
                    Prochain item ·{' '}
                    {next.slot !== null ? `n° ${next.slot} du build` : 'de situation'}
                  </p>
                  <p className={styles.nextName}>{next.recommendation.choice.name}</p>
                </div>
              </div>
              <ul className={styles.reasons}>
                {(next.recommendation.reasons.length > 0
                  ? next.recommendation.reasons
                  : [nextItemFallbackReason(next.slot, next.categories)]
                ).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {next.componentsOwned.length > 0 && (
                <p className={styles.nextMeta}>
                  Déjà : {next.componentsOwned.map(itemName).join(', ')}.
                </p>
              )}
              {next.recommendation.alternatives[0] && (
                <p className={`${styles.nextMeta} ${styles.alternative}`}>
                  <GameIcon
                    entry={{
                      name: next.recommendation.alternatives[0].choice.name,
                      icon: next.recommendation.alternatives[0].choice.image,
                    }}
                    size={28}
                    label=""
                  />
                  Autre choix : {next.recommendation.alternatives[0].choice.name}
                </p>
              )}
            </>
          ) : (
            <p className="muted">Aucun item à proposer pour l’instant.</p>
          )}
        </section>
      )}

      <Card title={`Mes items (${owned.length}/${INVENTORY.maxItems})`}>
        <ul className={styles.inventory}>
          {owned.map((id, index) => {
            const item = catalog.itemsById.get(id)
            const target = build ? componentTarget(id, build, owned, catalog.itemsById) : null
            return (
              <li key={`${index}-${id}`}>
                <button
                  type="button"
                  className={styles.slot}
                  onClick={() => navigate('partie', ITEM_PARAM, String(index))}
                  aria-label={`${itemName(id)}${target ? `, vers ${itemName(target)}` : ''} : modifier`}
                >
                  <GameIcon
                    entry={item ? { name: item.name, icon: item.image } : null}
                    fallbackId={id}
                    size={48}
                    label=""
                  />
                  <span className={styles.name}>{itemName(id)}</span>
                  {target && <span className={styles.progress}>→ {itemName(target)}</span>}
                </button>
              </li>
            )
          })}
          {Array.from({ length: emptySlots }, (_, i) => (
            <li key={`vide-${i}`}>
              <button
                type="button"
                className={styles.slot}
                data-empty
                onClick={() => navigate('partie', ADD_PARAM)}
                aria-label="Ajouter un item acheté"
              >
                <span className={styles.plus} aria-hidden="true">
                  +
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.hint}>
          {owned.length === 0
            ? 'Touche « + » à chaque achat. Les composants sont remplacés automatiquement quand tu achètes l’item complet.'
            : 'Touche un item pour le changer ou le retirer (vendu).'}
        </p>
      </Card>

      {sheet?.kind === 'add' && (
        <Sheet title="Item acheté" onClose={closeSheet}>
          <ItemPicker
            items={catalog.items}
            suggestedIds={suggestions}
            suggestedLabel="Ton build"
            autoFocus={false}
            onSelect={(item) => {
              buy(item.id, catalog.itemsById)
              closeSheet()
            }}
          />
        </Sheet>
      )}
      {sheet?.kind === 'item' && (
        <Sheet
          title={`Remplacer ${itemName(owned[sheet.index] ?? '')}`}
          onClose={closeSheet}
          action={
            <Button
              variant="ghost"
              onClick={() => {
                remove(sheet.index)
                closeSheet()
              }}
            >
              Retirer
            </Button>
          }
        >
          <ItemPicker
            items={catalog.items}
            suggestedIds={suggestions}
            suggestedLabel="Ton build"
            autoFocus={false}
            onSelect={(item) => {
              replace(sheet.index, item.id)
              closeSheet()
            }}
          />
        </Sheet>
      )}
    </>
  )
}
