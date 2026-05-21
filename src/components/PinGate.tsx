import { useState } from 'react'

const PIN = '2026'
const AUTH_KEY = 'trainx_auth'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function isAuthed() {
  return localStorage.getItem(AUTH_KEY) === todayStr()
}

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(isAuthed)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  if (authed) return <>{children}</>

  function handleDigit(d: string) {
    if (input.length >= 4) return
    const next = input + d
    setInput(next)
    setError(false)

    if (next.length === 4) {
      if (next === PIN) {
        localStorage.setItem(AUTH_KEY, todayStr())
        setAuthed(true)
      } else {
        setShake(true)
        setError(true)
        setTimeout(() => {
          setInput('')
          setShake(false)
        }, 600)
      }
    }
  }

  function handleDelete() {
    setInput(prev => prev.slice(0, -1))
    setError(false)
  }

  return (
    <div className="pin-screen">
      <div className="brand-logo">M<span>·</span>NK</div>
      <div className="brand-sub">mode reset</div>

      <div className={`pin-dots${shake ? ' shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`pin-dot${i < input.length ? ' filled' : ''}${error ? ' error' : ''}`}
          />
        ))}
      </div>

      {error && <div className="pin-error">PIN incorrecto</div>}
      {!error && <div className="pin-label">Ingresá tu PIN</div>}

      <div className="pin-pad">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
          <button
            key={i}
            className={`pin-btn${d === '' ? ' pin-btn-empty' : ''}${d === '⌫' ? ' pin-btn-del' : ''}`}
            onClick={() => d === '⌫' ? handleDelete() : d !== '' ? handleDigit(d) : undefined}
            disabled={d === ''}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}
