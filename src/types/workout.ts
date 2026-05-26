export type Mode = 'casa' | 'gym'

export interface Week {
  num: number
  label: string
  series: number
  reps: number
  restCasa: string
  restGym: string
  restSecCasa: number
  restSecGym: number
  iso: string
}

export interface Exercise {
  name: string
  muscle: string
  repsLabel?: string
  video?: string
  timeLabel?: string
  isIso?: boolean
}

export type BlockType = 'superserie' | 'biserie' | 'tabata' | 'hiit' | 'serie'

export interface Block {
  type: BlockType
  title: string
  badge: string
  count?: number
  timing?: string
  workSec?: number
  restSec?: number
  rounds?: number
  exercises: Exercise[]
}

export interface DayData {
  name: string
  muscle: string
  duration: string
  blocks: Block[]
  isCasaCardio?: boolean
  isGymCardio?: boolean
}

export interface BlockState {
  currentSet: number
  totalSets: number
  started: boolean
  completed: boolean
}

export type BBState = 'idle' | 'ready' | 'training' | 'switching' | 'resting' | 'tabata-done' | 'circuit'

export interface CircuitState {
  bi: number
  exercises: Exercise[]
  totalRounds: number
  currentRound: number
  currentExIdx: number
}

export interface TabataState {
  bi: number
  exercises: Exercise[]
  workSec: number
  restSec: number
  totalRounds: number
  currentRound: number
  currentExIdx: number
  phase: 'work' | 'rest'
  remaining: number
  isRoundRest?: boolean
}
