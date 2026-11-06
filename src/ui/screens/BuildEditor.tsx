import { useEffect, useId, useState } from 'react'
import type { GameCatalog } from '../../data/catalog'
import { BuildValidationError } from '../../data/buildRepository'
import { createBuildId } from '../../data/localBuildRepository'
import {
  chooseKeystone,
  choosePrimaryRune,
  choosePrimaryTree,
  chooseSecondaryTree,
  chooseShard,
  missingChoices,
  newBuild,
  setAlternative,
  setFirstItemOption,
  setSlotItem,
  toggleSecondaryRune,
  toggleSpell,
  type RuneLocator,
} from '../../engine/buildEditing'
import { validateBuild } from '../../engine/buildSchema'
import { validateBuildAgainstData } from '../../engine/patchValidation'
import { MAX_BUILD_NAME_LENGTH, POSITIONS, type Build, type Position } from '../../engine/types'
import { useBuildEditorStore } from '../../store/buildEditorStore'
import { useBuildsStore } from '../../store/buildsStore'
import { useDraftStore } from '../../store/draftStore'
import { playerChampionId } from '../../engine/draft'
import { Button } from '../components/Button'
import { ChampionPicker } from '../components/ChampionPicker'
import { DraftCell } from '../components/DraftCell'
import { IconChoice } from '../components/IconChoice'
import { ItemPicker } from '../components/ItemPicker'
import { Sheet } from '../components/Sheet'
import { Tabs } from '../components/Tabs'
import { POSITION_LABELS } from '../labels'
import { goBack, navigate } from '../navigation/useRoute'
import styles from './BuildEditor.module.css'
import { BuildEditorItems } from './BuildEditorItems'
import { encodeEditorSheet, parseEditorSheet, type EditorSheet } from './editorSheet'

type BuildEditorProps = {
  catalog: GameCatalog
  /** Build à modifier, ou `null` pour en créer un. */
  existing: Build | null
  /** Paramètres d'URL après le build : panneau ouvert (sélecteur de champion ou d'item). */
  sheetParams: readonly string[]
}

/** Éditeur de build : identité, runes, fragments et sorts (les items arrivent en T3.7). */
export function BuildEditor({ catalog, existing, sheetParams }: BuildEditorProps) {
  const target = existing?.id ?? 'nouveau'
  const draftForPlayer = useDraftStore((s) => s.draft)
  const open = useBuildEditorStore((s) => s.open)
  const build = useBuildEditorStore((s) => (s.target === target ? s.build : null))
  const dirty = useBuildEditorStore((s) => s.dirty)
  const update = useBuildEditorStore((s) => s.update)
  const clear = useBuildEditorStore((s) => s.clear)
  const save = useBuildsStore((s) => s.save)
  const [errors, setErrors] = useState<string[]>([])
  const [resumed] = useState(() => {
    const state = useBuildEditorStore.getState()
    return state.target === target && state.dirty
  })
  const nameId = useId()

  useEffect(() => {
    open(target, () =>
      existing
        ? structuredClone(existing)
        : newBuild(
            createBuildId(),
            playerChampionId(draftForPlayer) ?? '',
            draftForPlayer.playerPosition,
          ),
    )
    // Ouvert une seule fois par cible : le brouillon vit ensuite dans le store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, open])

  if (!build) return null

  const locate: RuneLocator = (id) => catalog.runesById.get(id)
  const change = (fn: (b: Build) => Build) => {
    setErrors([])
    update(fn)
  }
  const changeRunes = (fn: (r: Build['runes']) => Build['runes']) =>
    change((b) => ({ ...b, runes: fn(b.runes) }))

  const champion = catalog.championsById.get(build.championId) ?? null
  const primaryTree = catalog.treesById.get(build.runes.primaryTree)
  const secondaryTree = catalog.treesById.get(build.runes.secondaryTree)
  const missing = [...(build.championId ? [] : ['le champion']), ...missingChoices(build)]
  const backToList = existing
    ? () => navigate('builds', 'voir', existing.id)
    : () => goBack('builds')
  const pickerBase = existing ? ['modifier', existing.id] : ['nouveau']
  const sheet = parseEditorSheet(sheetParams)
  const openSheet = (s: EditorSheet) => navigate('builds', ...pickerBase, ...encodeEditorSheet(s))
  const closeSheet = () => goBack('builds')

  async function handleSave() {
    if (!build) return
    if (missing.length > 0) {
      setErrors([`Il manque : ${missing.join(', ')}.`])
      return
    }
    const valid = validateBuild(build)
    if (!valid.ok) return setErrors(valid.errors)
    const issues = validateBuildAgainstData(build, catalog)
    if (issues.length > 0) return setErrors(issues.map((i) => i.message))
    try {
      const saved = await save(build)
      clear()
      window.location.replace(`#/builds/voir/${encodeURIComponent(saved.id)}`)
    } catch (error) {
      setErrors(
        error instanceof BuildValidationError
          ? error.errors
          : ['Enregistrement impossible : le stockage du téléphone est peut-être plein.'],
      )
    }
  }

  function handleDiscard() {
    clear()
    backToList()
  }

  return (
    <div className={styles.editor}>
      <h2 className={styles.title}>
        {existing ? `Modifier « ${existing.name} »` : 'Nouveau build'}
      </h2>

      {resumed && dirty && (
        <div className={styles.notice} role="status">
          <p>Brouillon non enregistré repris.</p>
          <Button variant="ghost" onClick={handleDiscard}>
            Abandonner le brouillon
          </Button>
        </div>
      )}

      <section className={styles.section} aria-labelledby="editeur-identite">
        <h3 id="editeur-identite" className={styles.sectionTitle}>
          Build
        </h3>
        <label htmlFor={nameId} className={styles.label}>
          Nom
          <span className={styles.counter} aria-live="polite">
            {build.name.length}/{MAX_BUILD_NAME_LENGTH}
          </span>
        </label>
        <input
          id={nameId}
          className={styles.input}
          value={build.name}
          maxLength={MAX_BUILD_NAME_LENGTH}
          onChange={(e) => change((b) => ({ ...b, name: e.target.value }))}
          placeholder="Ex : Duelliste…"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
        />
        <span className={styles.label}>Champion</span>
        <DraftCell
          side="ally"
          champion={champion}
          emptyLabel="Choisir le champion"
          ariaLabel={champion ? `Champion : ${champion.name}, changer` : 'Choisir le champion'}
          onPick={() => openSheet({ kind: 'champion' })}
        />
        <span className={styles.label}>Poste</span>
        <Tabs<Position>
          label="Poste"
          value={build.position}
          onChange={(position) => change((b) => ({ ...b, position }))}
          options={POSITIONS.map((p) => ({ value: p, label: POSITION_LABELS[p] }))}
        />
      </section>

      <section className={styles.section} aria-labelledby="editeur-principal">
        <h3 id="editeur-principal" className={styles.sectionTitle}>
          Runes principales
        </h3>
        <IconChoice
          label="Arbre principal"
          options={catalog.trees}
          selected={[build.runes.primaryTree]}
          onToggle={(id) => changeRunes((r) => choosePrimaryTree(r, id))}
          size={36}
          showSelectedName
        />
        {primaryTree ? (
          <>
            <IconChoice
              label="Rune clé"
              options={primaryTree.rows[0] ?? []}
              selected={[build.runes.keystone]}
              onToggle={(id) => changeRunes((r) => chooseKeystone(r, id, locate))}
              size={52}
              showSelectedName
            />
            {primaryTree.rows.slice(1).map((row, i) => (
              <IconChoice
                key={i}
                label={`Rune principale, ligne ${i + 1}`}
                options={row}
                selected={build.runes.primarySlots}
                onToggle={(id) => changeRunes((r) => choosePrimaryRune(r, id, locate))}
                size={40}
                showSelectedName
              />
            ))}
          </>
        ) : (
          <p className="muted">Choisis d'abord l'arbre principal.</p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="editeur-secondaire">
        <h3 id="editeur-secondaire" className={styles.sectionTitle}>
          Runes secondaires
        </h3>
        {primaryTree ? (
          <IconChoice
            label="Arbre secondaire"
            options={catalog.trees.filter((t) => t.id !== build.runes.primaryTree)}
            selected={[build.runes.secondaryTree]}
            onToggle={(id) => changeRunes((r) => chooseSecondaryTree(r, id))}
            size={36}
            showSelectedName
          />
        ) : (
          <p className="muted">Choisis d'abord l'arbre principal.</p>
        )}
        {secondaryTree && (
          <>
            <p className={styles.hint}>2 runes, sur 2 lignes différentes.</p>
            {secondaryTree.rows.slice(1).map((row, i) => (
              <IconChoice
                key={i}
                label={`Rune secondaire, ligne ${i + 1}`}
                options={row}
                selected={build.runes.secondarySlots}
                onToggle={(id) => changeRunes((r) => toggleSecondaryRune(r, id, locate))}
                size={40}
                showSelectedName
              />
            ))}
          </>
        )}
      </section>

      <section className={styles.section} aria-labelledby="editeur-fragments">
        <h3 id="editeur-fragments" className={styles.sectionTitle}>
          Fragments
        </h3>
        {catalog.shardRows.map((row, i) => (
          <div key={row.label} className={styles.shardRow}>
            <span className={styles.shardLabel}>{row.label}</span>
            <IconChoice
              label={`Fragment ${row.label}`}
              options={row.shards}
              selected={[build.runes.shards[i] ?? '']}
              onToggle={(id) =>
                changeRunes((r) =>
                  chooseShard(
                    r,
                    i,
                    id,
                    catalog.shardRows.map((x) => x.shards.map((s) => s.id)),
                  ),
                )
              }
              size={32}
              showSelectedName
            />
          </div>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="editeur-sorts">
        <h3 id="editeur-sorts" className={styles.sectionTitle}>
          Sorts d'invocateur
        </h3>
        <p className={styles.hint}>Choisis 2 sorts.</p>
        <IconChoice
          label="Sorts d'invocateur"
          options={catalog.summonerSpells}
          selected={build.summonerSpells}
          onToggle={(id) =>
            change((b) => ({ ...b, summonerSpells: toggleSpell(b.summonerSpells, id) }))
          }
          size={40}
          shape="square"
          showSelectedName
        />
      </section>

      <BuildEditorItems build={build} catalog={catalog} change={change} openSheet={openSheet} />

      <div className={styles.footer}>
        {errors.length > 0 && (
          <div className={styles.errors} role="alert">
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        )}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleDiscard}>
            Annuler
          </Button>
          <Button onClick={() => void handleSave()}>Enregistrer</Button>
        </div>
      </div>

      {sheet?.kind === 'champion' && (
        <Sheet title="Champion du build" onClose={closeSheet}>
          <ChampionPicker
            champions={catalog.champions}
            onSelect={(c) => {
              change((b) => ({ ...b, championId: c.id }))
              closeSheet()
            }}
          />
        </Sheet>
      )}
      {sheet && sheet.kind !== 'champion' && (
        <Sheet title={itemSheetTitle(sheet, build)} onClose={closeSheet}>
          <ItemPicker
            items={catalog.items}
            excludedIds={excludedItemIds(sheet, build)}
            onSelect={(item) => {
              change((b) => applyItemChoice(b, sheet, item.id))
              closeSheet()
            }}
          />
        </Sheet>
      )}
    </div>
  )
}

type ItemSheet = Exclude<EditorSheet, { kind: 'champion' }>

function itemSheetTitle(sheet: ItemSheet, build: Build): string {
  switch (sheet.kind) {
    case 'firstItem':
      return sheet.target === 'new' ? 'Option de premier item' : 'Changer le premier item'
    case 'slot':
      return `Item ${sheet.target === 'new' ? build.itemOrder.length + 1 : sheet.target + 1}`
    case 'alternative':
      return `Alternative à l'item ${sheet.slot + 1}`
  }
}

/** Items déjà présents à cet endroit : pas proposés une deuxième fois. */
function excludedItemIds(sheet: ItemSheet, build: Build): string[] {
  if (sheet.kind === 'firstItem') return build.firstItemOptions.map((o) => o.itemId)
  if (sheet.kind === 'alternative') {
    const slot = build.itemOrder[sheet.slot]
    return slot ? [slot.default, ...slot.alternatives.map((a) => a.itemId)] : []
  }
  return []
}

function applyItemChoice(build: Build, sheet: ItemSheet, itemId: string): Build {
  switch (sheet.kind) {
    case 'firstItem':
      return setFirstItemOption(build, sheet.target, itemId)
    case 'slot':
      return setSlotItem(build, sheet.target, itemId)
    case 'alternative':
      return setAlternative(build, sheet.slot, sheet.target, itemId)
  }
}
