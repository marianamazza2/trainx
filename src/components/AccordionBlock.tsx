import { useEffect, useRef } from 'react'
import type { Block, BlockState, Mode, Week } from '../types/workout'

interface Props {
  index: number
  block: Block
  blockState: BlockState
  isOpen: boolean
  isActive: boolean
  activeExIdx: number
  completedExIdxs?: number[]
  repCount?: number | null
  week: Week
  mode: Mode
  onToggle: () => void
  onVideoOpen: (url: string) => void
}

export default function AccordionBlock({ index, block, blockState, isOpen, isActive, activeExIdx, completedExIdxs = [], repCount, week, mode, onToggle, onVideoOpen }: Props) {
  const exerciseRefs = useRef<(HTMLDivElement | null)[]>([])
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (activeExIdx >= 0 && exerciseRefs.current[activeExIdx]) {
      clearTimeout(scrollTimerRef.current!)
      scrollTimerRef.current = setTimeout(() => {
        exerciseRefs.current[activeExIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 350)
    }
  }, [activeExIdx])

  const isTabata = block.type === 'tabata' || block.type === 'hiit'
  const num = String(index + 1).padStart(2, '0')
  const rest = mode === 'casa' ? week.restCasa : week.restGym

  const subtitle = blockState.completed
    ? 'Completado ✓'
    : blockState.started
    ? `Serie ${blockState.currentSet} de ${blockState.totalSets}`
    : `${block.exercises.length} ejercicios`

  const accordionClass = [
    'accordion',
    isTabata ? 'tabata-type' : '',
    blockState.completed ? 'completed' : '',
    isActive ? 'active-block' : '',
    isOpen ? 'open' : '',
  ].filter(Boolean).join(' ')

  let instruction: string | null = null
  if (isTabata) {
    instruction = `${block.timing} · <strong>${block.rounds} rondas</strong>`
  } else if (block.type === 'superserie') {
    instruction = `${block.count} ejercicios <strong>sin descanso</strong> → ${rest} pausa → <strong>×${week.series}</strong>`
  } else if (block.type === 'biserie') {
    instruction = `2 ejercicios <strong>sin descanso</strong> → ${rest} pausa → <strong>×${week.series}</strong>`
  } else if (block.type === 'serie') {
    instruction = `<strong>${week.series} series</strong> de <strong>${week.reps} reps</strong> · Descanso: ${rest}`
  }

  return (
    <div className={accordionClass} id={`acc-${index}`}>
      <div className="accordion-header" onClick={onToggle}>
        <div className="accordion-header-left">
          <div className="accordion-num">
            <span className="accordion-num-text">{num}</span>
            <span className="check-icon">✓</span>
          </div>
          <div>
            <div className="accordion-title">{block.title}</div>
            <div className="accordion-subtitle">{subtitle}</div>
          </div>
        </div>
        <div className="accordion-right">
          <span className="accordion-badge">{block.badge}</span>
          <span className="accordion-chevron">▼</span>
        </div>
      </div>

      <div className="accordion-body">
        <div className="accordion-body-inner">
          {instruction && (
            <div
              className="block-instruction"
              dangerouslySetInnerHTML={{ __html: instruction }}
            />
          )}

          {block.exercises.map((ex, ei) => {
            const hasVideo = !!ex.video
            const isCurrentEx = isActive && activeExIdx === ei
            const isDoneInSeries = isActive && completedExIdxs.includes(ei)
            const repsText = ex.timeLabel
              ? ex.timeLabel
              : ex.repsLabel
              ? `${week.reps} reps ${ex.repsLabel}`
              : `${week.reps} reps`

            return (
              <div key={ei}>
                <div
                  ref={el => { exerciseRefs.current[ei] = el }}
                  className={`exercise${hasVideo ? '' : ' no-video'}${isCurrentEx ? ' exercise-active' : isDoneInSeries ? ' exercise-series-done' : ''}`}
                  onClick={hasVideo ? () => onVideoOpen(ex.video!) : undefined}
                >
                  <div className="exercise-inner">
                    <div className={`exercise-play${hasVideo ? '' : ' no-video'}`} />
                    <div className="exercise-info">
                      <div className="exercise-name">
                      {ex.name}
                      {isCurrentEx && repCount != null && (
                        <span className="exercise-rep-count">{repCount}</span>
                      )}
                    </div>
                      <div className="exercise-meta">
                        <span className="meta-tag reps">{repsText}</span>
                        <span className="meta-tag muscle">{ex.muscle}</span>
                        {ex.isIso && mode === 'gym' && (
                          <span className="meta-tag iso">Iso {week.iso}</span>
                        )}
                        {ex.isIso && mode === 'casa' && (
                          <span className="meta-tag iso">Isometría</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {ei < block.exercises.length - 1 && (
                  <div className="connector">
                    <div className="connector-line" />
                  </div>
                )}
              </div>
            )
          })}

          {!isTabata && (
            <div className="rest-card">
              <span className="rest-label">Descanso entre series</span>
              <span className="rest-time">{rest}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
