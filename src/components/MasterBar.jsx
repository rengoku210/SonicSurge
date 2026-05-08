import { useSoundStore } from '../store/soundStore'
import { RiMicLine, RiMicOffLine, RiVolumeUpLine } from 'react-icons/ri'

export default function MasterBar() {
  const { settings, updateSettings, stopAll, playingIds } = useSoundStore()
  const vol = settings.masterVolume ?? 80
  const mic = settings.playThroughMic

  return (
    <div className="master-vol">
      <RiVolumeUpLine style={{ color: 'var(--accent)', fontSize: 18, flexShrink: 0 }} />
      <span className="master-vol-label">Master</span>
      <input
        type="range" min="0" max="100" value={vol}
        className="master-vol-slider"
        onChange={e => updateSettings({ masterVolume: Number(e.target.value) })}
        style={{
          background: `linear-gradient(to right, var(--accent) ${vol}%, var(--border) ${vol}%)`
        }}
      />
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 34 }}>{vol}%</span>

      <button
        className={`mic-toggle ${mic ? 'on' : ''}`}
        onClick={() => updateSettings({ playThroughMic: !mic })}
        title="Toggle Play Through Mic"
      >
        {mic ? <RiMicLine /> : <RiMicOffLine />}
        {mic ? 'Mic On' : 'Mic Off'}
      </button>

      {settings.pttKey && (
        <div className={`ptt-pill ${playingIds.size > 0 ? 'active' : ''}`}>
          🎯 PTT: {settings.pttKey}
        </div>
      )}

      {playingIds.size > 0 && (
        <button
          className="btn btn-ghost"
          onClick={stopAll}
          style={{ padding: '6px 12px', fontSize: 12 }}
        >⏹ Stop All</button>
      )}
    </div>
  )
}
