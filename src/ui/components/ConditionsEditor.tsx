import { useId } from 'react'
import { findPreset, sameCondition } from '../../engine/buildEditing'
import { WEIGHT_LEVELS } from '../../engine/config'
import type { Condition, ConditionPreset, Metric, WeightedCondition } from '../../engine/types'
import styles from './ConditionsEditor.module.css'
import { Tabs } from './Tabs'

const GROUPS: { label: string; matches: (metric: Metric) => boolean }[] = [
  { label: 'Leur équipe', matches: (m) => m.startsWith('enemy') },
  { label: 'Ton vis-à-vis', matches: (m) => m.startsWith('laneOpponent') },
  { label: 'Ta situation', matches: (m) => m === 'situation' },
]

type CommonProps = {
  presets: readonly ConditionPreset[]
  onTogglePreset: (preset: ConditionPreset) => void
}

type WeightedProps = CommonProps & {
  mode: 'weighted'
  value: readonly WeightedCondition[]
  onChange: (index: number, change: Partial<Pick<WeightedCondition, 'weight' | 'explain'>>) => void
}

type AllOfProps = CommonProps & {
  mode: 'allOf'
  value: readonly Condition[]
  explain: string
  onExplainChange: (explain: string) => void
}

/**
 * Choix des conditions par presets cochables.
 * - `weighted` (build, premier item) : chaque condition cochée a un poids et une explication.
 * - `allOf` (alternative) : toutes les conditions cochées doivent être vraies ; une explication commune.
 */
export function ConditionsEditor(props: WeightedProps | AllOfProps) {
  const explainId = useId()
  const conditions = props.mode === 'weighted' ? props.value.map((w) => w.condition) : props.value
  const custom = conditions.filter((c) => !findPreset(props.presets, c))

  return (
    <div className={styles.editor}>
      {props.mode === 'allOf' && (
        <p className={styles.hint}>
          Proposée seulement si toutes les conditions cochées sont vraies.
        </p>
      )}
      {props.mode === 'weighted' && (
        <p className={styles.hint}>
          Chaque condition vraie ajoute des points ; l'option qui en a le plus est proposée.
        </p>
      )}

      {custom.length > 0 && (
        <section className={styles.group}>
          <h3 className={styles.groupTitle}>Conditions personnalisées</h3>
          {custom.map((c) => (
            <p key={`${c.metric}${c.op}${c.value}`} className={styles.custom}>
              {c.metric} {c.op} {String(c.value)}
            </p>
          ))}
        </section>
      )}

      {GROUPS.map((group) => {
        const presets = props.presets.filter((p) => group.matches(p.condition.metric))
        if (presets.length === 0) return null
        return (
          <section key={group.label} className={styles.group} aria-label={group.label}>
            <h3 className={styles.groupTitle}>{group.label}</h3>
            {presets.map((preset) => {
              const index = conditions.findIndex((c) => sameCondition(c, preset.condition))
              const checked = index >= 0
              const weighted = props.mode === 'weighted' && checked ? props.value[index] : undefined
              return (
                <div key={preset.id} className={styles.preset} data-checked={checked || undefined}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    className={styles.check}
                    onClick={() => props.onTogglePreset(preset)}
                  >
                    <span className={styles.box} aria-hidden="true">
                      {checked && (
                        <svg width="16" height="16" viewBox="0 0 24 24">
                          <path
                            d="M5 12l5 5 9-10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {preset.label}
                  </button>
                  {props.mode === 'weighted' && weighted && (
                    <div className={styles.details}>
                      <Tabs<string>
                        label={`Poids de « ${preset.label} »`}
                        value={String(weighted.weight)}
                        onChange={(w) => props.onChange(index, { weight: Number(w) })}
                        options={WEIGHT_LEVELS.map((l) => ({
                          value: String(l.value),
                          label: l.label,
                        }))}
                      />
                      <textarea
                        rows={2}
                        className={styles.input}
                        value={weighted.explain}
                        maxLength={200}
                        onChange={(e) => props.onChange(index, { explain: e.target.value })}
                        aria-label={`Explication de « ${preset.label} »`}
                        autoComplete="off"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )
      })}

      {props.mode === 'allOf' && (
        <section className={styles.group}>
          <label htmlFor={explainId} className={styles.groupTitle}>
            Explication affichée
          </label>
          <textarea
            id={explainId}
            rows={2}
            className={styles.input}
            value={props.explain}
            maxLength={200}
            onChange={(e) => props.onExplainChange(e.target.value)}
            autoComplete="off"
          />
        </section>
      )}
    </div>
  )
}
