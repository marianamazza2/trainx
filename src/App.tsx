import { useState, useEffect, useRef } from 'react'
import type { Mode, BlockState, BBState, TabataState, CircuitState } from './types/workout'
import { WEEKS, CASA_DAYS, GYM_DAYS, TREADMILL } from './data/workout'
import AccordionBlock from './components/AccordionBlock'

// ── Utils ────────────────────────────────────────────────────────────────────
function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
let _audioCtx: AudioContext | null = null
function getAudioCtx(): AudioContext {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume()
  return _audioCtx
}
function beep(f = 800, d = 150) {
  try {
    const ctx = getAudioCtx()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = f; g.gain.value = 0.15; o.start()
    o.stop(ctx.currentTime + d / 1000)
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
const WORKOUT_PREP_SECS = 10
const EXERCISE_SWITCH_REST_SECS = 5

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
  const [repCount, setRepCount] = useState<number | null>(null)
  const [tabataState, setTabataState] = useState<TabataState | null>(null)
  const [, setCircuitState] = useState<CircuitState | null>(null)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [completedExIdxs, setCompletedExIdxs] = useState<number[]>([])
  const [, setTopBarHeight] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [weekTemp, setWeekTemp] = useState(week)

  const topBarRef = useRef<HTMLDivElement>(null)

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
  const globalTimerPausedRef = useRef(false)
  const currentExIdxRef = useRef(0)
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tabataIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restPausedRef = useRef(false)
  const circuitWorkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const circuitRestIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const circuitPrepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const circuitStateRef = useRef<CircuitState | null>(null)
  const repIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartedRef = useRef(false)
  const topBarHeightRef = useRef(0)

  // Sync refs on every render
  blockStatesRef.current = blockStates
  activeBlockIdxRef.current = activeBlockIdx
  bbStateRef.current = bbState
  weekRef.current = week
  modeRef.current = mode
  dayRef.current = day
  globalTimerRunningRef.current = globalTimerRunning
  globalTimerPausedRef.current = globalTimerPaused
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

  useEffect(() => {
    const el = topBarRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const height = entries[0].contentRect.height
      topBarHeightRef.current = height
      setTopBarHeight(height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Global timer ──────────────────────────────────────────────────────────
  function startGlobalTimer() {
    if (globalTimerRef.current) return
    globalTimerSecsRef.current = 0
    setGlobalTimerSecs(0)
    setGlobalTimerRunning(true)
    setGlobalTimerPaused(false)
    globalTimerPausedRef.current = false
    restPausedRef.current = false
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
    globalTimerPausedRef.current = false
    restPausedRef.current = false
  }

  function toggleGlobalTimer() {
    if (!globalTimerRunningRef.current) return
    if (!globalTimerPausedRef.current) {
      clearInterval(globalTimerRef.current!)
      globalTimerRef.current = null
      setGlobalTimerPaused(true)
      globalTimerPausedRef.current = true
      restPausedRef.current = true
    } else {
      setGlobalTimerPaused(false)
      globalTimerPausedRef.current = false
      restPausedRef.current = false
      if (!globalTimerRef.current) {
        globalTimerRef.current = setInterval(() => {
          globalTimerSecsRef.current++
          setGlobalTimerSecs(globalTimerSecsRef.current)
        }, 1000)
      }
    }
  }

  function startWorkoutPrep(bi: number) {
    if (bbStateRef.current === 'switching') return
    beepRest(); vibrate(150)
    setOpenBlocks(prev => { const next = new Set(prev); next.add(bi); return next })
    setBbTimerLabel('PREPÁRATE')
    setShowRestTimer(true)
    setRestRemaining(WORKOUT_PREP_SECS)
    setRestSub('La sesión está por comenzar')
    setBbState('switching')
    bbStateRef.current = 'switching'

    let remaining = WORKOUT_PREP_SECS
    clearInterval(restIntervalRef.current!)
    restIntervalRef.current = setInterval(() => {
      if (restPausedRef.current) return
      remaining--
      setRestRemaining(remaining)
      if (remaining <= 3 && remaining > 0) beep(600, 80)
      if (remaining <= 0) {
        clearInterval(restIntervalRef.current!)
        setShowRestTimer(false)
        if (!sessionStartedRef.current) {
          sessionStartedRef.current = true
          setSessionStarted(true)
          startGlobalTimer()
        }
        autoStartBlock(bi)
      }
    }, 1000)
  }

  // ── Rep counter (circuit work countdown only) ───────────────────────────────
  function stopRepCounter() {
    clearInterval(repIntervalRef.current!)
    repIntervalRef.current = null
    setRepCount(null)
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function openSettings() {
    setWeekTemp(week)
    setSettingsOpen(true)
  }
  function closeSettings() {
    setSettingsOpen(false)
  }
  function saveSettings() {
    setWeek(weekTemp)
    setSettingsOpen(false)
  }

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
    setCompletedExIdxs([])
    setBbState('idle')
    bbStateRef.current = 'idle'
    setOpenBlocks(prev => { const next = new Set(prev); next.add(bi); return next })
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
    enterTrainingState(bi)
  }

  function handleAccordionToggle(bi: number) {
    const isCurrentlyOpen = openBlocks.has(bi)

    const isPreviewingAnotherBlock =
      sessionStartedRef.current &&
      activeBlockIdxRef.current >= 0 &&
      bi !== activeBlockIdxRef.current &&
      bbStateRef.current !== 'idle'

    setOpenBlocks(prev => {
      const next = new Set(prev)
      if (next.has(bi)) next.delete(bi); else next.add(bi)
      return next
    })

    if (isPreviewingAnotherBlock) return

    const bs = blockStatesRef.current[bi]
    const isAlreadyActive = bi === activeBlockIdxRef.current && bbStateRef.current !== 'idle'
    if (bs && !bs.completed && !isCurrentlyOpen && !isAlreadyActive) {
      activateBlock(bi)
    }
  }

  function enterTrainingState(_bi: number) {
    beepWork(); vibrate(100)
    currentExIdxRef.current = 0
    setCurrentExIdx(0)
    setCompletedExIdxs([])
    setShowRestTimer(false)
    setBbState('training')
    bbStateRef.current = 'training'
  }

  // User clicks once when the round (series) is finished → start the rest counter
  function handleFinishRound(bi: number) {
    if (bbStateRef.current !== 'training') return
    if (activeBlockIdxRef.current !== bi) return
    startRestCountdown(bi)
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
    let nextBlockTitle: string | null = null

    if (isLast) {
      const sessionDone = markBlockDone(bi)
      if (sessionDone) return
      const nextBi = blockStatesRef.current.findIndex((b, i) => i > bi && !b.completed)
      if (nextBi >= 0) {
        const days = modeRef.current === 'casa' ? CASA_DAYS : GYM_DAYS
        nextBlockTitle = days[dayRef.current].blocks[nextBi]?.title ?? null
      }
    }

    beepRest(); vibrate(200)
    setBbTimerLabel('DESCANSO ENTRE SERIES')
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
      if (isLast && nextBlockTitle && remaining <= 10 && remaining > 0) {
        setRestSub(`Prepárate para: ${nextBlockTitle}`)
      }
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
          setCurrentExIdx(0); currentExIdxRef.current = 0
          setCompletedExIdxs([])
          enterTrainingState(bi)
        }
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
        activateBlock(nextBi)
        autoStartBlock(nextBi)
        // scroll after DOM updates from activateBlock
        setTimeout(() => {
          const el = document.getElementById(`acc-${nextBi}`)
          if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY - topBarHeightRef.current - 16
            window.scrollTo({ top, behavior: 'smooth' })
          }
        }, 100)
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
    bs[bi] = { ...bs[bi], started: true, currentSet: 1 }
    setBlockStates(bs)
    blockStatesRef.current = bs

    if (!globalTimerRef.current) startGlobalTimer()

    const cs: CircuitState = {
      bi, exercises: block.exercises,
      totalRounds: block.rounds!, currentRound: 1, currentExIdx: 0,
    }
    circuitStateRef.current = cs
    setCircuitState({ ...cs })
    setBbState('circuit')
    bbStateRef.current = 'circuit'
    setShowRestTimer(false)
    setBbTimerLabel('CIRCUITO')
    setRestSub('')
    enterCircuitWork(cs)
  }

  function enterCircuitWork(cs: CircuitState) {
    beepWork(); vibrate(100)
    const days = modeRef.current === 'casa' ? CASA_DAYS : GYM_DAYS
    const block = days[dayRef.current].blocks[cs.bi]
    const workSec = block.workSec ?? 40

    currentExIdxRef.current = cs.currentExIdx
    setCurrentExIdx(cs.currentExIdx)
    setBbState('circuit')
    bbStateRef.current = 'circuit'
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
    setBbState('switching')
    bbStateRef.current = 'switching'
    setShowRestTimer(true)
    setRestRemaining(EXERCISE_SWITCH_REST_SECS)
    setBbTimerLabel('DESCANSO')
    setRestSub(`→ ${nextEx?.name ?? '—'}`)

    let remaining = EXERCISE_SWITCH_REST_SECS
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
    bs[bi] = { ...bs[bi], started: true, currentSet: 1 }
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
      if (restPausedRef.current) return
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
          s.isRoundRest = isLastEx
          beepRest(); vibrate(200)
        } else {
          s.currentExIdx++
          if (s.currentExIdx >= s.exercises.length) {
            s.currentExIdx = 0; s.currentRound++
          }
          s.phase = 'work'; s.remaining = s.workSec
          s.isRoundRest = false
          beepWork(); vibrate(100)
        }
      }
      setTabataState({ ...s })
    }, 1000)
  }

  function handleStartBlock() {
    const bi = activeBlockIdxRef.current
    if (bi < 0) return
    startWorkoutPrep(bi)
  }

  // ── Derived values for render ─────────────────────────────────────────────
  const days = mode ? (mode === 'casa' ? CASA_DAYS : GYM_DAYS) : CASA_DAYS
  const currentDay = days[day]
  const currentWeekData = WEEKS[week]

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
        <div className="top-bar" ref={topBarRef}>
          <div className="top-bar-header">
            <button className="back-btn" onClick={goBack}>←</button>
            <div className="top-title-group">
              <div className="top-title">M<span>·</span>NK MODE</div>
              <div className="top-subtitle">{currentDay.muscle.toUpperCase()}</div>
            </div>
            <div className="top-right-controls">
              <div
                className={`timer-pill${globalTimerPaused ? ' paused' : ''}${sessionStarted ? ' active' : ''}`}
                onClick={sessionStarted ? toggleGlobalTimer : undefined}
              >
                <span className="timer-pill-icon">⏱</span>
                <span className="timer-pill-time">{fmt(globalTimerSecs)}</span>
              </div>
              <button className="settings-btn" onClick={openSettings}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="4" y1="6" x2="20" y2="6"/>
                  <line x1="4" y1="12" x2="20" y2="12"/>
                  <line x1="4" y1="18" x2="20" y2="18"/>
                  <circle cx="8" cy="6" r="2.5"/>
                  <circle cx="16" cy="12" r="2.5"/>
                  <circle cx="10" cy="18" r="2.5"/>
                </svg>
              </button>
            </div>
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

          {currentDay.blocks.map((block, bi) => {
            const isTabataBlock = block.type === 'tabata' || block.type === 'hiit'
            const ts = tabataState?.bi === bi ? tabataState : null
            const isThisActive = activeBlockIdx === bi
            const isThisTraining = isThisActive && bbState === 'training' && !isTabataBlock

            const exActiveIdx = ts
              ? ts.currentExIdx
              : (isThisActive && bbState === 'circuit' ? currentExIdx : -1)

            const exRepCount = ts
              ? (ts.phase === 'work' ? ts.remaining : null)
              : (isThisActive && bbState === 'circuit' ? repCount : null)

            const tabataRoundRest = isTabataBlock && ts?.phase === 'rest' && ts?.isRoundRest
            const effectiveIsResting = (isThisActive && showRestTimer) || !!tabataRoundRest
            const effectiveRestDisplay = tabataRoundRest && ts ? fmt(ts.remaining) : fmt(restRemaining)
            const effectiveRestLabel = tabataRoundRest
              ? 'DESCANSO ENTRE RONDAS'
              : (isThisActive ? bbTimerLabel : undefined)
            const effectiveRestSub = tabataRoundRest && ts
              ? `Ronda ${ts.currentRound} de ${ts.totalRounds} completada`
              : (isThisActive ? restSub : undefined)

            return (
              <AccordionBlock
                key={`${mode}-${day}-${week}-${bi}`}
                index={bi}
                block={block}
                blockState={blockStates[bi] ?? { currentSet: 0, totalSets: 0, started: false, completed: false }}
                isOpen={openBlocks.has(bi)}
                isActive={isThisActive}
                activeExIdx={exActiveIdx}
                completedExIdxs={isThisActive ? completedExIdxs : []}
                repCount={exRepCount}
                repLabel={isTabataBlock ? 'work' : undefined}
                isTraining={isThisTraining}
                onFinishRound={() => handleFinishRound(bi)}
                week={currentWeekData}
                mode={mode}
                onToggle={() => handleAccordionToggle(bi)}
                onVideoOpen={(url) => window.open(url, '_blank')}
                isResting={effectiveIsResting}
                restDisplay={effectiveRestDisplay}
                restActiveLabel={effectiveRestLabel}
                restActiveSub={effectiveRestSub}
              />
            )
          })}

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
            {!currentDay.isCasaCardio && !currentDay.isGymCardio && (
              <div className="footer-note">🏃 Completá con <strong>20-40 min</strong> de cardio adicional</div>
            )}
          </div>


          <div id="session-complete" className={`session-complete${sessionComplete ? ' active' : ''}`}>
            <div className="complete-icon">🏆</div>
            <h2>SESIÓN COMPLETADA</h2>
            <div className="complete-time">{fmt(globalTimerSecs)}</div>
            <p>Tiempo total de entrenamiento</p>
          </div>
        </div>

        {!currentDay.isCasaCardio && !currentDay.isGymCardio && !sessionComplete && activeBlockIdx >= 0 && (
          <button
            className={`fab-btn${globalTimerPaused ? ' paused' : ''}`}
            onClick={sessionStarted ? toggleGlobalTimer : handleStartBlock}
            disabled={bbState === 'switching' && !sessionStarted}
          >
            {!sessionStarted || globalTimerPaused
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></svg>
            }
          </button>
        )}
      </div>

      {settingsOpen && (
        <div className="settings-sheet-overlay" onClick={closeSettings}>
          <div className="settings-sheet" onClick={e => e.stopPropagation()}>
            <div className="settings-sheet-handle" />
            <h2 className="settings-sheet-title">Configuración del programa</h2>

            <div className="settings-week-grid">
              {WEEKS.map((w, i) => (
                <button key={i} className={`settings-week-btn${i === weekTemp ? ' active' : ''}`} onClick={() => setWeekTemp(i)}>
                  <div className="settings-week-num">S{w.num}</div>
                  <div className="settings-week-label">{w.label.toUpperCase()}</div>
                </button>
              ))}
            </div>

            <div className="settings-info-grid">
              <div className="settings-info-card">
                <span className="settings-info-label">Series</span>
                <span className="settings-info-value">{WEEKS[weekTemp].series}</span>
              </div>
              <div className="settings-info-card">
                <span className="settings-info-label">Reps</span>
                <span className="settings-info-value">{WEEKS[weekTemp].reps}</span>
              </div>
              <div className="settings-info-card">
                <span className="settings-info-label">Descanso</span>
                <span className="settings-info-value">{mode === 'casa' ? WEEKS[weekTemp].restCasa : WEEKS[weekTemp].restGym}</span>
              </div>
              {mode === 'gym' && (
                <div className="settings-info-card">
                  <span className="settings-info-label">Isométrico</span>
                  <span className="settings-info-value">{WEEKS[weekTemp].iso}</span>
                </div>
              )}
            </div>

            <div className="settings-sheet-actions">
              <button className="settings-close-btn" onClick={closeSettings}>Cerrar</button>
              <button className="settings-save-btn" onClick={saveSettings}>✓ Guardar</button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
