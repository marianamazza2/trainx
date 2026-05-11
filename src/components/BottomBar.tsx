interface Props {
  visible: boolean
  blockName: string
  seriesText: string
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
  visible, blockName, seriesText,
  showTimer, timerLabel, timerTime, timerSub,
  showBtn, btnClass, btnText, onAction,
}: Props) {
  return (
    <div className={`bottom-bar${visible ? ' visible' : ''}`}>
      <div className="bottom-bar-inner">
        <div className="bottom-bar-info">
          <span className="bottom-bar-block-name">{blockName}</span>
          <span className="bottom-bar-series">{seriesText}</span>
        </div>
        <div className={`bottom-bar-timer${showTimer ? ' active' : ''}`}>
          <div className="bottom-bar-timer-label">{timerLabel}</div>
          <div className="bottom-bar-timer-time">{timerTime}</div>
          <div className="bottom-bar-timer-sub">{timerSub}</div>
        </div>
        {showBtn && (
          <button className={`bottom-bar-btn ${btnClass}`} onClick={onAction}>
            {btnText}
          </button>
        )}
      </div>
    </div>
  )
}
