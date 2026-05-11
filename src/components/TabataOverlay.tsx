import type { TabataState } from '../types/workout'

interface Props {
  tabataState: TabataState | null
  onClose: () => void
}

function fmt2(s: number) {
  return String(s).padStart(2, '0')
}

export default function TabataOverlay({ tabataState, onClose }: Props) {
  const active = tabataState !== null
  const s = tabataState

  return (
    <div className={`tabata-overlay${active ? ' active' : ''}`}>
      <button className="tabata-close" onClick={onClose}>✕</button>
      <div className={`tabata-phase ${s?.phase === 'work' ? 'work' : 'rest-phase'}`}>
        {s?.phase === 'work' ? 'TRABAJO' : 'DESCANSO'}
      </div>
      <div className="tabata-exercise-name">
        {s ? s.exercises[s.currentExIdx]?.name ?? '—' : '—'}
      </div>
      <div className={`tabata-time${s?.phase === 'rest' ? ' rest-color' : ''}`}>
        {s ? fmt2(s.remaining) : '00'}
      </div>
      <div className="tabata-round">
        Ronda <strong>{s?.currentRound ?? 1}</strong> de {s?.totalRounds ?? 4}
      </div>
      <div className="tabata-progress">
        {s && Array.from({ length: s.totalRounds }, (_, i) => {
          const cls = i < s.currentRound - 1
            ? 'filled'
            : i === s.currentRound - 1
            ? 'current'
            : ''
          return <div key={i} className={`tabata-dot ${cls}`} />
        })}
      </div>
    </div>
  )
}
