import { useState, useEffect, useRef } from 'react'
import type { Mode, BlockState, BBState, TabataState, CircuitState } from './types/workout'
import { WEEKS, CASA_DAYS, GYM_DAYS, TREADMILL } from './data/workout'
import AccordionBlock from './components/AccordionBlock'
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
  const [currentExIdx, setCurrentExIdx] = useState(0)
  const [bbTimerLabel, setBbTimerLabel] = useState('DESCANSO')
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restRemaining, setRestRemaining] = useState(0)
  const [restSub, setRestSub] = useState('')
  const [globalTimerSecs, setGlobalTimerSecs] = useState(0)
  const [globalTimerRunning, setGlobalTimerRunning] = useState(false)
  const [globalTimerPaused, setGlobalTimerPaused] = useState(false)
  const [autoPlaySecs, setAutoPlaySecs] = useState<number | null>(null)
  const [repCount, setRepCount] = useState<number | null>(null)
  const [tabataState, setTabataState] = useState<TabataState | null>(null)
  const [, setCircuitState] = useState<CircuitState | null>(null)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [completedExIdxs, setCompletedExIdxs] = useState<number[]>([])

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
  const globalTimerRunningRef = useRef(false)
  const currentExIdxRef = useRef(0)
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tabataIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restPausedRef = useRef(false)
  const circuitWorkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const circuitRestIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const circuitPrepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const circuitStateRef = useRef<CircuitState | null>(null)
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoPlaySecsRef = useRef<number | null>(null)
  const repIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartedRef = useRef(false)

  // Sync refs on every render
  blockStatesRef.current = blockStates
  activeBlockIdxRef.current = activeBlockIdx
  bbStateRef.current = bbState
  weekRef.current = week
  modeRef.current = mode
  dayRef.current = day
  globalTimerRunningRef.current = globalTimerRunning
  sessionStartedRef.current = sessionStarted

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
    setSessionStarted(false)
    sessionStartedRef.current = false
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
    setGlobalTimerPaused(false)
    globalTimerRef.current = setInterval(() => {
      globalTimerSecsRef.current++
      setGlobalTimerSecs(globalTimerSecsRef.current)
    }, 1000)
  }

  function stopGlobalTimer() {
    clearInterval(globalTimerRef.current!)
    globalTimerRef.current = null
    setGlobalTimerRunning(false)
    setGlobalTimerPaused(false)
  }

  function toggleGlobalTimer() {
    if (!globalTimerRunning) return
    if (globalTimerRef.current) {
      clearInterval(globalTimerRef.current!)
      globalTimerRef.current = null
      setGlobalTimerPaused(true)
      restPausedRef.current = true
    } else {
      setGlobalTimerPaused(false)
      restPausedRef.current = false
      globalTimerRef.current = setInterval(() => {
        globalTimerSecsRef.current++
        setGlobalTimerSecs(globalTimerSecsRef.current)
      }, 1000)
    }
  }

  // ── Auto-play (next state) ─────────────────────────────────────────────────
  function startAutoPlay(bi: number) {
    clearInterval(autoPlayRef.current!)
    autoPlaySecsRef.current = 8
    setAutoPlaySecs(8)
    autoPlayRef.current = setInterval(() => {
      if (restPausedRef.current) return
      const next = (autoPlaySecsRef.current ?? 1) - 1
      autoPlaySecsRef.current = next
      setAutoPlaySecs(next)
      if (next <= 0) {
        clearInterval(autoPlayRef.current!)
        autoPlayRef.current = null
        autoPlaySecsRef.current = null
        setAutoPlaySecs(null)
        enterTrainingState(bi, blockStatesRef.current[bi])
      }
    }, 1000)
  }

  function cancelAutoPlay() {
    clearInterval(autoPlayRef.current!)
    autoPlayRef.current = null
    autoPlaySecsRef.current = null
    setAutoPlaySecs(null)
  }

  // ── Rep counter ────────────────────────────────────────────────────────────
  function startRepCounter(totalReps: number, onComplete?: () => void) {
    clearInterval(repIntervalRef.current!)
    let count = 1
    setRepCount(1)
    repIntervalRef.current = setInterval(() => {
      if (restPausedRef.current) return
      count++
      if (count > totalReps) {
        clearInterval(repIntervalRef.current!)
        repIntervalRef.current = null
        setRepCount(null)
        onComplete?.()
      } else {
        setRepCount(count)
      }
    }, 1500)
  }

  function stopRepCounter() {
    clearInterval(repIntervalRef.current!)
    repIntervalRef.current = null
    setRepCount(null)
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function selectMode(m: Mode) {
    stopGlobalTimer()
    clearInterval(restIntervalRef.current!)
    setMode(m)
    setDay(todayDayIndex())
  }

  function stopCircuit() {
    clearInterval(circuitPrepIntervalRef.current!)
    clearInterval(circuitWorkIntervalRef.current!)
    clearInterval(circuitRestIntervalRef.current!)
    circuitPrepIntervalRef.current = null
    circuitWorkIntervalRef.current = null
    circuitRestIntervalRef.current = null
    circuitStateRef.current = null
    setCircuitState(null)
  }

  function goBack() {
    stopGlobalTimer()
    cancelAutoPlay()
    stopRepCounter()
    stopCircuit()
    clearInterval(restIntervalRef.current!)
    clearInterval(tabataIntervalRef.current!)
    setTabataState(null)
    tabataStateRef.current = null
    setCurrentExIdx(0); currentExIdxRef.current = 0
    setMode(null)
  }

  function selectDay(i: number) {
    stopGlobalTimer()
    cancelAutoPlay()
    stopRepCounter()
    stopCircuit()
    clearInterval(restIntervalRef.current!)
    clearInterval(tabataIntervalRef.current!)
    setTabataState(null)
    tabataStateRef.current = null
    setCurrentExIdx(0); currentExIdxRef.current = 0
    setSessionStarted(false)
    sessionStartedRef.current = false
    setDay(i)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Block activation ──────────────────────────────────────────────────────
  function activateBlock(bi: number) {
    setActiveBlockIdx(bi)
    activeBlockIdxRef.current = bi
    setShowRestTimer(false)
    clearInterval(restIntervalRef.current!)
    cancelAutoPlay()
    setCompletedExIdxs([])
    setOpenBlocks(prev => { const next = new Set(prev); next.add(bi); return next })
    if (sessionStartedRef.current) {
      setTimeout(() => autoStartBlock(bi), 600)
    }
  }

  function autoStartBlock(bi: number) {
    if (activeBlockIdxRef.current !== bi) return
    if (!sessionStartedRef.current) return
    const m = modeRef.current!
    const days = m === 'casa' ? CASA_DAYS : GYM_DAYS
    const block = days[dayRef.current].blocks[bi]
    const isTabata = block.type === 'tabata' || block.type === 'hiit'

    if (isTabata) {
      if (block.type === 'hiit') { startCircuit(bi); return }
      startTabata(bi); return
    }

    const bs = [...blockStatesRef.current]
    if (!bs[bi].started || bs[bi].currentSet === 0) {
      bs[bi] = { ...bs[bi], started: true, currentSet: 1 }
      setBlockStates(bs)
      blockStatesRef.current = bs
    }
    enterTrainingState(bi, bs[bi])
  }

  function handleAccordionToggle(bi: number) {
    setOpenBlocks(prev => {
      const next = new Set(prev)
      if (next.has(bi)) next.delete(bi); else next.add(bi)
      return next
    })
    const bs = blockStatesRef.current[bi]
    if (bs && !bs.completed) {
      activateBlock(bi)
    }
  }

  function enterTrainingState(bi: number, _bs: BlockState, exIdx = 0) {
    beepWork(); vibrate(100)
    currentExIdxRef.current = exIdx
    setCurrentExIdx(exIdx)
    setCompletedExIdxs(Array.from({ length: exIdx }, (_, i) => i))
    const m = modeRef.current!
    const days = m === 'casa' ? CASA_DAYS : GYM_DAYS
    const block = days[dayRef.current].blocks[bi]
    const isMulti = (block.type === 'superserie' || block.type === 'biserie') && block.exercises.length > 1
    setShowRestTimer(false)
    setBbState('training')
    bbStateRef.current = 'training'
    if (!block.exercises[exIdx]?.isIso) {
      if (isMulti && exIdx < block.exercises.length - 1) {
        startRepCounter(WEEKS[weekRef.current].reps, () => {
          startSwitchCountdown(bi, exIdx + 1, blockStatesRef.current[bi])
        })
      } else {
        startRepCounter(WEEKS[weekRef.current].reps, () => {
          startRestCountdown(bi)
        })
      }
    }
  }

  function startRestCountdown(bi: number, forceComplete = false) {
    if (globalTimerRunningRef.current && !globalTimerRef.current) {
      setGlobalTimerPaused(false)
      globalTimerRef.current = setInterval(() => {
        globalTimerSecsRef.current++
        setGlobalTimerSecs(globalTimerSecsRef.current)
      }, 1000)
    }
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
    setCompletedExIdxs([])
    setShowRestTimer(true)
    setRestRemaining(restSec)
    setRestSub(isLast ? 'Última serie completada' : `Serie ${bs.currentSet} de ${bs.totalSets} completada`)
    setBbState('resting')
    bbStateRef.current = 'resting'

    restPausedRef.current = false
    let remaining = restSec
    clearInterval(restIntervalRef.current!)
    restIntervalRef.current = setInterval(() => {
      if (restPausedRef.current) return
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
          startAutoPlay(bi)
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
      if (restPausedRef.current) return
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

  // ── Circuit (HIIT) ────────────────────────────────────────────────────────
  function startCircuit(bi: number) {
    const m = modeRef.current!
    const days = m === 'casa' ? CASA_DAYS : GYM_DAYS
    const block = days[dayRef.current].blocks[bi]

    setOpenBlocks(prev => { const next = new Set(prev); next.add(bi); return next })

    const bs = [...blockStatesRef.current]
    bs[bi] = { ...bs[bi], started: true }
    setBlockStates(bs)
    blockStatesRef.current = bs

    if (!globalTimerRef.current) startGlobalTimer()

    const cs: CircuitState = {
      bi, exercises: block.exercises,
      totalRounds: block.rounds!, currentRound: 1, currentExIdx: 0,
    }
    circuitStateRef.current = cs
    setCircuitState({ ...cs })
    setBbState('circuit-prep')
    bbStateRef.current = 'circuit-prep'

    const PREP_SECS = 10
    setShowRestTimer(true)
    setBbTimerLabel('Iniciando circuito en:')
    setRestRemaining(PREP_SECS)
    setRestSub('')

    let remaining = PREP_SECS
    clearInterval(circuitPrepIntervalRef.current!)
    circuitPrepIntervalRef.current = setInterval(() => {
      if (restPausedRef.current) return
      remaining--
      setRestRemaining(remaining)
      if (remaining <= 3 && remaining > 0) beep(600, 100)
      if (remaining <= 0) {
        clearInterval(circuitPrepIntervalRef.current!)
        circuitPrepIntervalRef.current = null
        setShowRestTimer(false)
        setBbState('circuit')
        bbStateRef.current = 'circuit'
        enterCircuitWork(circuitStateRef.current!)
      }
    }, 1000)
  }

  function enterCircuitWork(cs: CircuitState) {
    beepWork(); vibrate(100)
    const days = modeRef.current === 'casa' ? CASA_DAYS : GYM_DAYS
    const block = days[dayRef.current].blocks[cs.bi]
    const workSec = block.workSec ?? 40

    setShowRestTimer(false)
    setRepCount(workSec)

    let remaining = workSec
    clearInterval(circuitWorkIntervalRef.current!)
    circuitWorkIntervalRef.current = setInterval(() => {
      if (restPausedRef.current) return
      remaining--
      if (remaining <= 3 && remaining > 0) beep(600, 80)
      if (remaining <= 0) {
        clearInterval(circuitWorkIntervalRef.current!)
        circuitWorkIntervalRef.current = null
        setRepCount(null)
        enterCircuitRest(circuitStateRef.current!)
      } else {
        setRepCount(remaining)
      }
    }, 1000)
  }

  function enterCircuitRest(cs: CircuitState) {
    const nextExIdx = (cs.currentExIdx + 1) % cs.exercises.length
    const nextRound = cs.currentExIdx + 1 >= cs.exercises.length ? cs.currentRound + 1 : cs.currentRound
    const isLast = cs.currentExIdx + 1 >= cs.exercises.length && cs.currentRound >= cs.totalRounds

    if (isLast) {
      circuitStateRef.current = null
      setCircuitState(null)
      startRestCountdown(cs.bi, true)
      return
    }

    beepRest(); vibrate(150)
    const nextEx = cs.exercises[nextExIdx]
    setShowRestTimer(true)
    setRestRemaining(5)
    setBbTimerLabel('PREPARATE')
    setRestSub(`→ ${nextEx?.name ?? '—'}`)

    let remaining = 5
    clearInterval(circuitRestIntervalRef.current!)
    circuitRestIntervalRef.current = setInterval(() => {
      if (restPausedRef.current) return
      remaining--
      setRestRemaining(remaining)
      if (remaining <= 3 && remaining > 0) beep(600, 80)
      if (remaining <= 0) {
        clearInterval(circuitRestIntervalRef.current!)
        circuitRestIntervalRef.current = null
        setShowRestTimer(false)
        const newCs: CircuitState = { ...cs, currentExIdx: nextExIdx, currentRound: nextRound }
        circuitStateRef.current = newCs
        setCircuitState({ ...newCs })
        enterCircuitWork(newCs)
      }
    }, 1000)
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
            setActiveBlockIdx(finishedBi)
            activeBlockIdxRef.current = finishedBi
            startRestCountdown(finishedBi, true)
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
    tabataStateRef.current = null
    setTabataState(null)
    setBbState('idle')
    bbStateRef.current = 'idle'
  }

  // ── Derived values for render ─────────────────────────────────────────────
  const days = mode ? (mode === 'casa' ? CASA_DAYS : GYM_DAYS) : CASA_DAYS
  const currentDay = days[day]
  const currentWeekData = WEEKS[week]
  const rest = mode === 'casa' ? currentWeekData.restCasa : currentWeekData.restGym

  const showStartBtn = !sessionStarted && !sessionComplete &&
    !currentDay.isCasaCardio && !currentDay.isGymCardio &&
    blockStates.some(b => !b.completed)

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

          <div
            className={`global-timer${globalTimerRunning ? ' active' : ''}${globalTimerPaused ? ' paused' : ''}`}
            onClick={toggleGlobalTimer}
          >
            <div className="global-timer-dot" />
            <span className="global-timer-label">Sesión</span>
            <span className="global-timer-time">{fmt(globalTimerSecs)}</span>
            {globalTimerRunning && <span className="global-timer-pause-icon">{globalTimerPaused ? '▶' : '⏸'}</span>}
          </div>

          {sessionStarted && showRestTimer && (
            <div className="top-action-bar">
              <div className="top-action-timer">
                <span className="top-action-timer-label">{bbTimerLabel}</span>
                <span className="top-action-timer-time">
                  {bbState === 'circuit' || bbState === 'circuit-prep' ? String(restRemaining) : fmt(restRemaining)}
                </span>
                {restSub && <span className="top-action-timer-sub">{restSub}</span>}
              </div>
            </div>
          )}

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

          {showStartBtn && (
            <button
              className="start-session-btn"
              onClick={() => {
                sessionStartedRef.current = true
                setSessionStarted(true)
                startGlobalTimer()
                const bi = activeBlockIdxRef.current
                if (bi >= 0) setTimeout(() => autoStartBlock(bi), 300)
              }}
            >
              ▶ COMENZAR SESIÓN
            </button>
          )}

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
              activeExIdx={activeBlockIdx === bi && bbState === 'training' ? currentExIdx : -1}
              completedExIdxs={activeBlockIdx === bi ? completedExIdxs : []}
              repCount={activeBlockIdx === bi && bbState === 'training' ? repCount : null}
              week={currentWeekData}
              mode={mode}
              onToggle={() => handleAccordionToggle(bi)}
              onVideoOpen={(url) => window.open(url, '_blank')}
              isResting={activeBlockIdx === bi && showRestTimer}
              restDisplay={fmt(restRemaining)}
              restActiveLabel={activeBlockIdx === bi ? bbTimerLabel : undefined}
              restActiveSub={activeBlockIdx === bi ? restSub : undefined}
              nextSetSecs={activeBlockIdx === bi && bbState === 'next' ? autoPlaySecs : null}
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

      <TabataOverlay tabataState={tabataState} onClose={closeTabata} />
    </>
  )
}
