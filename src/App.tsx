import { useState, useEffect, useRef, useCallback } from 'react'
import type { Mode, BlockState, BBState, TabataState } from './types/workout'
import { WEEKS, CASA_DAYS, GYM_DAYS, TREADMILL } from './data/workout'
import AccordionBlock from './components/AccordionBlock'
import BottomBar from './components/BottomBar'
import TabataOverlay from './components/TabataOverlay'

// ── Utils ────────────────────────────────────────────────────────────────────
function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
function beep(f = 800, d = 150) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = f; g.gain.value = 0.15; o.start()
    setTimeout(() => { o.stop(); ctx.close() }, d)
  } catch {}
}
function beepWork() { beep(880, 90); setTimeout(() => beep(1100, 90), 140) }
function beepRest() { beep(440, 350) }
function vibrate(ms = 200) { try { navigator.vibrate(ms) } catch {} }
function todayStr() { return new Date().toISOString().slice(0, 10) }
function todayDayIndex() {
  const map: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 }
  return map[new Date().getDay()] ?? 0
}

// ── Session persistence ───────────────────────────────────────────────────────
const SESSION_KEY = 'trainx_session'
const MODE_KEY = 'trainx_mode'
const WEEK_KEY = 'trainx_week'

interface SavedSession {
  date: string; mode: Mode; dayIdx: number; completedBlocks: boolean[]
}

function loadSession(mode: Mode, dayIdx: number): boolean[] | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s: SavedSession = JSON.parse(raw)
    if (s.date === todayStr() && s.mode === mode && s.dayIdx === dayIdx)
      return s.completedBlocks
  } catch {}
  return null
}

function saveSession(mode: Mode, dayIdx: number, completedBlocks: boolean[]) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ date: todayStr(), mode, dayIdx, completedBlocks }))
}

function buildBlockStates(mode: Mode, dayIdx: number, weekIdx: number): BlockState[] {
  const days = mode === 'casa' ? CASA_DAYS : GYM_DAYS
  const day = days[dayIdx]
  const w = WEEKS[weekIdx]
  const saved = loadSession(mode, dayIdx)
  return day.blocks.map((b, i) => {
    const isTabata = b.type === 'tabata' || b.type === 'hiit'
    const totalSets = isTabata ? (b.rounds ?? 4) : w.series
    const completed = saved?.[i] ?? false
    return { currentSet: completed ? totalSets : 0, totalSets, started: completed, completed }
  })
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState<Mode | null>(
    () => (localStorage.getItem(MODE_KEY) as Mode | null)
  )
  const [week, setWeek] = useState(() => parseInt(localStorage.getItem(WEEK_KEY) ?? '0'))
  const [day, setDay] = useState(todayDayIndex)

  const [blockStates, setBlockStates] = useState<BlockState[]>([])
  const [openBlocks, setOpenBlocks] = useState<Set<number>>(new Set())
  const [activeBlockIdx, setActiveBlockIdx] = useState(-1)
  const [bbState, setBbState] = useState<BBState>('idle')
  const [bbBlockName, setBbBlockName] = useState('—')
  const [bbSeriesText, setBbSeriesText] = useState('')
  const [currentExIdx, setCurrentExIdx] = useState(0)
  const [bbTimerLabel, setBbTimerLabel] = useState('DESCANSO')
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restRemaining, setRestRemaining] = useState(0)
  const [restSub, setRestSub] = useState('')
  const [globalTimerSecs, setGlobalTimerSecs] = useState(0)
  const [globalTimerRunning, setGlobalTimerRunning] = useState(false)
  const [tabataState, setTabataState] = useState<TabataState | null>(null)
  const [sessionComplete, setSessionComplete] = useState(false)

  // Refs so interval callbacks always read current values
  const blockStatesRef = useRef<BlockState[]>([])
  const activeBlockIdxRef = useRef(-1)
  const bbStateRef = useRef<BBState>('idle')
  const tabataStateRef = useRef<TabataState | null>(null)
  const weekRef = useRef(week)
  const modeRef = useRef<Mode | null>(mode)
  const dayRef = useRef(day)
  const globalTimerSecsRef = useRef(0)
  const globalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentExIdxRef = useRef(0)
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tabataIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync refs on every render
  blockStatesRef.current = blockStates
  activeBlockIdxRef.current = activeBlockIdx
  bbStateRef.current = bbState
  weekRef.current = week
  modeRef.current = mode
  dayRef.current = day

  // ── Init day content ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mode) return
    const states = buildBlockStates(mode, day, week)
    setBlockStates(states)
    blockStatesRef.current = states
    setOpenBlocks(new Set())
    setActiveBlockIdx(-1)
    setBbState('idle')
    bbStateRef.current = 'idle'
    setShowRestTimer(false)
    setSessionComplete(false)
    stopGlobalTimer()
    clearInterval(restIntervalRef.current!)

    const firstIncompleteIdx = states.findIndex(b => !b.completed)
    if (firstIncompleteIdx >= 0) activateBlock(firstIncompleteIdx)
  }, [mode, day, week]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (mode) localStorage.setItem(MODE_KEY, mode) }, [mode])
  useEffect(() => { localStorage.setItem(WEEK_KEY, String(week)) }, [week])

  // ── Global timer ──────────────────────────────────────────────────────────
  function startGlobalTimer() {
    if (globalTimerRef.current) return
    globalTimerSecsRef.current = 0
    setGlobalTimerSecs(0)
    setGlobalTimerRunning(true)
    globalTimerRef.current = setInterval(() => {
      globalTimerSecsRef.current++
      setGlobalTimerSecs(globalTimerSecsRef.current)
    }, 1000)
  }

  function stopGlobalTimer() {
    clearInterval(globalTimerRef.current!)
    globalTimerRef.current = null
    setGlobalTimerRunning(false)
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function selectMode(m: Mode) {
    stopGlobalTimer()
    clearInterval(restIntervalRef.current!)
    setMode(m)
    setDay(todayDayIndex())
  }

  function goBack() {
    stopGlobalTimer()
    clearInterval(restIntervalRef.current!)
    clearInterval(tabataIntervalRef.current!)
    setTabataState(null)
    tabataStateRef.current = null
    setCurrentExIdx(0); currentExIdxRef.current = 0
    setMode(null)
  }

  function selectDay(i: number) {
    stopGlobalTimer()
    clearInterval(restIntervalRef.current!)
    clearInterval(tabataIntervalRef.current!)
    setTabataState(null)
    tabataStateRef.current = null
    setCurrentExIdx(0); currentExIdxRef.current = 0
    setDay(i)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Block activation ──────────────────────────────────────────────────────
  function activateBlock(bi: number) {
    const m = modeRef.current!
    const days = m === 'casa' ? CASA_DAYS : GYM_DAYS
    const block = days[dayRef.current].blocks[bi]

    setActiveBlockIdx(bi)
    activeBlockIdxRef.current = bi
    setBbBlockName(block.title)
    setBbSeriesText('')
    setShowRestTimer(false)
    setBbState('ready')
    bbStateRef.current = 'ready'
  }

  function handleAccordionToggle(bi: number) {
    setOpenBlocks(prev => {
      const next = new Set(prev)
      if (next.has(bi)) next.delete(bi); else next.add(bi)
      return next
    })
    const bs = blockStatesRef.current[bi]
    if (bs && !bs.completed && !bs.started) {
      activateBlock(bi)
    }
  }

  // ── Bottom bar action ─────────────────────────────────────────────────────
  const bbAction = useCallback(() => {
    const bi = activeBlockIdxRef.current
    if (bi < 0) return
    const m = modeRef.current!
    const days = m === 'casa' ? CASA_DAYS : GYM_DAYS
    const block = days[dayRef.current].blocks[bi]
    const isTabata = block.type === 'tabata' || block.type === 'hiit'
    const state = bbStateRef.current

    if (state === 'ready') {
      if (!globalTimerRef.current) startGlobalTimer()
      if (isTabata) { startTabata(bi); return }
      const bs = [...blockStatesRef.current]
      bs[bi] = { ...bs[bi], started: true, currentSet: 1 }
      setBlockStates(bs)
      blockStatesRef.current = bs
      enterTrainingState(bi, bs[bi])
    } else if (state === 'training') {
      const isMulti = (block.type === 'superserie' || block.type === 'biserie') && block.exercises.length > 1
      if (isMulti && currentExIdxRef.current < block.exercises.length - 1) {
        startSwitchCountdown(bi, currentExIdxRef.current + 1, blockStatesRef.current[bi])
      } else {
        startRestCountdown(bi)
      }
    } else if (state === 'next') {
      enterTrainingState(bi, blockStatesRef.current[bi])
    } else if (state === 'tabata-done') {
      startRestCountdown(bi, true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function enterTrainingState(bi: number, bs: BlockState, exIdx = 0) {
    beepWork(); vibrate(100)
    currentExIdxRef.current = exIdx
    setCurrentExIdx(exIdx)
    const m = modeRef.current!
    const days = m === 'casa' ? CASA_DAYS : GYM_DAYS
    const block = days[dayRef.current].blocks[bi]
    const isMulti = (block.type === 'superserie' || block.type === 'biserie') && block.exercises.length > 1
    if (isMulti) {
      const ex = block.exercises[exIdx]
      setBbSeriesText(`S${bs.currentSet}/${bs.totalSets} · Ej ${exIdx + 1}/${block.exercises.length}: ${ex.name}`)
    } else {
      setBbSeriesText(`Serie ${bs.currentSet} de ${bs.totalSets}`)
    }
    setShowRestTimer(false)
    setBbState('training')
    bbStateRef.current = 'training'
  }

  function startRestCountdown(bi: number, forceComplete = false) {
    const w = WEEKS[weekRef.current]
    const restSec = modeRef.current === 'casa' ? w.restSecCasa : w.restSecGym
    const bs = blockStatesRef.current[bi]
    const isLast = forceComplete || bs.currentSet === bs.totalSets

    if (isLast) {
      const sessionDone = markBlockDone(bi)
      if (sessionDone) return
    }

    beepRest(); vibrate(200)
    setBbTimerLabel('DESCANSO')
    setCurrentExIdx(0); currentExIdxRef.current = 0
    setShowRestTimer(true)
    setRestRemaining(restSec)
    setRestSub(isLast ? 'Última serie completada' : `Serie ${bs.currentSet} de ${bs.totalSets} completada`)
    setBbState('resting')
    bbStateRef.current = 'resting'

    let remaining = restSec
    clearInterval(restIntervalRef.current!)
    restIntervalRef.current = setInterval(() => {
      remaining--
      setRestRemaining(remaining)
      if (remaining <= 3 && remaining > 0) beep(600, 100)
      if (remaining <= 0) {
        clearInterval(restIntervalRef.current!)
        beep(1000, 300); vibrate(300)
        setShowRestTimer(false)

        if (isLast) {
          activateNextBlock(bi)
        } else {
          const current = [...blockStatesRef.current]
          current[bi] = { ...current[bi], currentSet: current[bi].currentSet + 1 }
          setBlockStates(current)
          blockStatesRef.current = current
          setBbState('next')
          bbStateRef.current = 'next'
          setBbSeriesText(`Serie ${current[bi].currentSet} de ${current[bi].totalSets}`)
        }
      }
    }, 1000)
  }

  function startSwitchCountdown(bi: number, nextExIdx: number, bs: BlockState) {
    const m = modeRef.current!
    const days = m === 'casa' ? CASA_DAYS : GYM_DAYS
    const block = days[dayRef.current].blocks[bi]
    const nextEx = block.exercises[nextExIdx]

    beepRest(); vibrate(150)
    setBbTimerLabel('CAMBIO')
    setShowRestTimer(true)
    setRestRemaining(5)
    setRestSub(`→ ${nextEx.name}`)
    setBbState('switching')
    bbStateRef.current = 'switching'

    let remaining = 5
    clearInterval(restIntervalRef.current!)
    restIntervalRef.current = setInterval(() => {
      remaining--
      setRestRemaining(remaining)
      if (remaining <= 3 && remaining > 0) beep(600, 80)
      if (remaining <= 0) {
        clearInterval(restIntervalRef.current!)
        setBbTimerLabel('DESCANSO')
        setShowRestTimer(false)
        enterTrainingState(bi, bs, nextExIdx)
      }
    }, 1000)
  }

  function markBlockDone(bi: number): boolean {
    const bs = [...blockStatesRef.current]
    bs[bi] = { ...bs[bi], completed: true }
    setBlockStates(bs)
    blockStatesRef.current = bs
    saveSession(modeRef.current!, dayRef.current, bs.map(b => b.completed))

    const allDone = bs.every(b => b.completed)
    if (allDone) {
      setActiveBlockIdx(-1)
      activeBlockIdxRef.current = -1
      setBbState('idle')
      bbStateRef.current = 'idle'
      setSessionComplete(true)
      stopGlobalTimer()
      beep(1200, 400); vibrate(500)
      setTimeout(() => {
        document.getElementById('session-complete')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return true
    }
    return false
  }

  function activateNextBlock(bi: number) {
    const bs = blockStatesRef.current
    const nextBi = bs.findIndex((b, i) => i > bi && !b.completed)
    if (nextBi >= 0) {
      setTimeout(() => {
        setOpenBlocks(prev => {
          const next = new Set(prev)
          next.delete(bi); next.add(nextBi)
          return next
        })
        document.getElementById(`acc-${nextBi}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        activateBlock(nextBi)
      }, 400)
    }
  }

  function completeBlock(bi: number) {
    if (!markBlockDone(bi)) {
      activateNextBlock(bi)
    }
  }

  // ── Tabata ────────────────────────────────────────────────────────────────
  function startTabata(bi: number) {
    const m = modeRef.current!
    const days = m === 'casa' ? CASA_DAYS : GYM_DAYS
    const block = days[dayRef.current].blocks[bi]

    const bs = [...blockStatesRef.current]
    bs[bi] = { ...bs[bi], started: true }
    setBlockStates(bs)
    blockStatesRef.current = bs

    const ts: TabataState = {
      bi, exercises: block.exercises,
      workSec: block.workSec!, restSec: block.restSec!,
      totalRounds: block.rounds!, currentRound: 1,
      currentExIdx: 0, phase: 'work', remaining: block.workSec!,
    }
    tabataStateRef.current = ts
    setTabataState({ ...ts })
    beepWork(); vibrate(100)

    clearInterval(tabataIntervalRef.current!)
    tabataIntervalRef.current = setInterval(() => {
      const s = tabataStateRef.current!
      s.remaining--
      if (s.remaining <= 3 && s.remaining > 0) beep(600, 80)
      if (s.remaining <= 0) {
        beep(1000, 200); vibrate(200)
        if (s.phase === 'work') {
          const isLastEx = s.currentExIdx === s.exercises.length - 1
          const isLastRound = s.currentRound === s.totalRounds
          if (isLastEx && isLastRound) {
            clearInterval(tabataIntervalRef.current!)
            const finishedBi = s.bi
            setTabataState(null)
            tabataStateRef.current = null
            setBbState('tabata-done')
            bbStateRef.current = 'tabata-done'
            setActiveBlockIdx(finishedBi)
            activeBlockIdxRef.current = finishedBi
            return
          }
          s.phase = 'rest'; s.remaining = s.restSec
          beepRest(); vibrate(200)
        } else {
          s.currentExIdx++
          if (s.currentExIdx >= s.exercises.length) {
            s.currentExIdx = 0; s.currentRound++
          }
          s.phase = 'work'; s.remaining = s.workSec
          beepWork(); vibrate(100)
        }
      }
      setTabataState({ ...s })
    }, 1000)
  }

  function closeTabata() {
    clearInterval(tabataIntervalRef.current!)
    const bi = tabataStateRef.current?.bi ?? activeBlockIdxRef.current
    setTabataState(null)
    tabataStateRef.current = null
    activateBlock(bi)
  }

  // ── Derived values for render ─────────────────────────────────────────────
  const days = mode ? (mode === 'casa' ? CASA_DAYS : GYM_DAYS) : CASA_DAYS
  const currentDay = days[day]
  const currentWeekData = WEEKS[week]
  const rest = mode === 'casa' ? currentWeekData.restCasa : currentWeekData.restGym

  function getBtnProps(): { cls: string; text: string } {
    if (bbState === 'ready') {
      const block = days[day]?.blocks[activeBlockIdx]
      const isTabata = block?.type === 'tabata' || block?.type === 'hiit'
      return { cls: 'btn-start', text: isTabata ? `▶ INICIAR ${block?.type === 'hiit' ? 'CIRCUITO' : 'TABATA'}` : '▶ INICIAR BLOQUE' }
    }
    if (bbState === 'training') {
      const bs = blockStates[activeBlockIdx]
      const block = days[day]?.blocks[activeBlockIdx]
      const isMulti = block && (block.type === 'superserie' || block.type === 'biserie') && block.exercises.length > 1
      if (isMulti && currentExIdx < block.exercises.length - 1) {
        return { cls: 'btn-done-set', text: '→ SIGUIENTE EJERCICIO' }
      }
      const isLastSet = bs?.currentSet === bs?.totalSets
      if (isMulti) {
        return {
          cls: 'btn-done-set',
          text: isLastSet ? '⏱ TERMINÉ ÚLTIMA SUPERSERIE → DESCANSO' : `⏱ TERMINÉ SUPERSERIE ${bs?.currentSet} → DESCANSO`,
        }
      }
      return {
        cls: 'btn-done-set',
        text: isLastSet ? '⏱ TERMINÉ ÚLTIMA SERIE → DESCANSO' : `⏱ TERMINÉ SERIE ${bs?.currentSet} → DESCANSO`,
      }
    }
    if (bbState === 'next') {
      const bs = blockStates[activeBlockIdx]
      return { cls: 'btn-next-set', text: `▶ SERIE ${bs?.currentSet} DE ${bs?.totalSets} — ¡VAMOS!` }
    }
    if (bbState === 'tabata-done') {
      return { cls: 'btn-done-set', text: '⏱ INICIAR DESCANSO' }
    }
    return { cls: 'btn-start', text: '▶ INICIAR BLOQUE' }
  }

  const { cls: btnCls, text: btnText } = getBtnProps()
  const bbVisible = activeBlockIdx >= 0 && bbState !== 'idle' && !tabataState && !sessionComplete

  // ── Mode Select Screen ────────────────────────────────────────────────────
  if (!mode) {
    return (
      <div className="mode-screen">
        <div className="brand-logo">M<span>·</span>NK</div>
        <div className="brand-sub">mode reset</div>
        <div className="mode-cards">
          <div className="mode-card" onClick={() => selectMode('casa')}>
            <div className="mode-icon">🏠</div>
            <h2>ENTRENO EN CASA</h2>
            <p>Superseries + Tabata con mancuernas.</p>
            <span className="mode-arrow">→</span>
          </div>
          <div className="mode-card" onClick={() => selectMode('gym')}>
            <div className="mode-icon">🏋️</div>
            <h2>ENTRENO EN GYM</h2>
            <p>Biseries con máquinas y peso libre.</p>
            <span className="mode-arrow">→</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Training Screen ───────────────────────────────────────────────────────
  return (
    <>
      <div className="training-screen">
        <div className="top-bar">
          <div className="top-bar-header">
            <button className="back-btn" onClick={goBack}>← Cambiar</button>
            <div className="top-title">M<span>·</span>NK MODE</div>
            <span className="mode-label">{mode === 'casa' ? 'CASA' : 'GYM'}</span>
          </div>

          <div className={`global-timer${globalTimerRunning ? ' active' : ''}`}>
            <div className="global-timer-dot" />
            <span className="global-timer-label">Sesión</span>
            <span className="global-timer-time">{fmt(globalTimerSecs)}</span>
          </div>

          <div className="week-selector">
            {WEEKS.map((w, i) => (
              <button key={i} className={`week-btn${i === week ? ' active' : ''}`} onClick={() => setWeek(i)}>
                <div className="week-num">S{w.num}</div>
                <div className="week-label">{w.label}</div>
              </button>
            ))}
          </div>

          <div className="week-info">
            <div className="week-info-item"><strong>{currentWeekData.series}</strong> series</div>
            <div className="week-info-item"><strong>{currentWeekData.reps}</strong> reps</div>
            <div className="week-info-item">Descanso <strong>{rest}</strong></div>
            {mode === 'gym' && <div className="week-info-item">Iso <strong>{currentWeekData.iso}</strong></div>}
          </div>

          <div className="day-tabs">
            {days.map((d, i) => (
              <button key={i} className={`day-tab${i === day ? ' active' : ''}`} onClick={() => selectDay(i)}>
                {d.name}
              </button>
            ))}
          </div>
        </div>

        <div className="day-content" key={`${mode}-${day}-${week}`}>
          <div className="day-title">
            <h1>{currentDay.name.toUpperCase()}</h1>
            <div className="day-muscle">{currentDay.muscle}</div>
          </div>

          {currentDay.isCasaCardio && (
            <div className="cardio-note">
              <div className="cardio-note-icon">🏃</div>
              <div>
                <h4>Cardio LISS — 1 hora</h4>
                <p>Caminata a ritmo constante, marcha elevando rodillas, subir y bajar escaleras, o saltar la cuerda a ritmo ligero.</p>
              </div>
            </div>
          )}

          {!currentDay.isCasaCardio && blockStates.length > 0 && (
            <div className="blocks-progress">
              {blockStates.map((bs, i) => (
                <div key={i} className={`blocks-progress-bar${bs.completed ? ' done' : bs.started ? ' active-bar' : ''}`} />
              ))}
            </div>
          )}

          {currentDay.blocks.map((block, bi) => (
            <AccordionBlock
              key={`${mode}-${day}-${week}-${bi}`}
              index={bi}
              block={block}
              blockState={blockStates[bi] ?? { currentSet: 0, totalSets: 0, started: false, completed: false }}
              isOpen={openBlocks.has(bi)}
              isActive={activeBlockIdx === bi}
              week={currentWeekData}
              mode={mode}
              onToggle={() => handleAccordionToggle(bi)}
              onVideoOpen={(url) => window.open(url, '_blank')}
            />
          ))}

          {currentDay.isGymCardio && (
            <div className="cardio-note" style={{ marginTop: 4, flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div className="cardio-note-icon">🚶</div>
                <h4>Cardio LISS — Caminadora (60 min)</h4>
              </div>
              <table className="treadmill-table">
                <thead><tr><th>Min</th><th>Vel.</th><th>Incl.</th><th>Intensidad</th></tr></thead>
                <tbody>
                  {TREADMILL.map((r, i) => (
                    <tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="day-footer">
            <div className="footer-time">{currentDay.duration}</div>
            <div className="footer-note">Incluye calentamiento y elongación</div>
          </div>

          {!currentDay.isCasaCardio && !currentDay.isGymCardio && (
            <div className="cardio-note">
              <div className="cardio-note-icon">🏃</div>
              <div>
                <h4>Cardio adicional</h4>
                <p>Completá con <strong>20-40 min</strong> de cardio según tu % de grasa corporal.</p>
              </div>
            </div>
          )}


          <div id="session-complete" className={`session-complete${sessionComplete ? ' active' : ''}`}>
            <div className="complete-icon">🏆</div>
            <h2>SESIÓN COMPLETADA</h2>
            <div className="complete-time">{fmt(globalTimerSecs)}</div>
            <p>Tiempo total de entrenamiento</p>
          </div>
        </div>
      </div>

      <BottomBar
        visible={bbVisible}
        blockName={bbBlockName}
        seriesText={bbSeriesText}
        showTimer={showRestTimer}
        timerLabel={bbTimerLabel}
        timerTime={fmt(restRemaining)}
        timerSub={restSub}
        showBtn={!showRestTimer}
        btnClass={btnCls}
        btnText={btnText}
        onAction={bbAction}
      />

      <TabataOverlay tabataState={tabataState} onClose={closeTabata} />
    </>
  )
}
