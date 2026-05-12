interface Props {
  visible: boolean
  showTimer: boolean
  timerLabel: string
  timerTime: string
  timerSub: string
  showBtn: boolean
  btnClass: string
  btnText: string
  onAction: () => void
}

export default function BottomBar({
  visible, showTimer, timerLabel, timerTime, timerSub,
  showBtn, btnClass, btnText, onAction,
}: Props) {
  return (
    <div className={`bottom-bar${visible ? ' visible' : ''}`}>
      <div className="bottom-bar-inner">
        <div className="bottom-bar-middle" style={!showTimer ? { display: 'none' } : undefined}>
          <div className="bottom-bar-timer active">
            <div className="bottom-bar-timer-label">{timerLabel}</div>
            <div className="bottom-bar-timer-time">{timerTime}</div>
            <div className="bottom-bar-timer-sub">{timerSub}</div>
          </div>
        </div>
        <button
          className={`bottom-bar-btn ${btnClass}`}
          onClick={onAction}
          style={!showBtn ? { display: 'none' } : undefined}
        >
          {btnText}
        </button>
      </div>
    </div>
  )
}
