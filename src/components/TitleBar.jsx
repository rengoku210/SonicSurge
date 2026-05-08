import { useState, useEffect } from 'react'
import { useSoundStore } from '../store/soundStore'

export default function TitleBar() {
  const { playingIds, stopAll } = useSoundStore()
  const [maximized, setMaximized] = useState(false)
  const api = window.electronAPI

  useEffect(() => {
    api.isMaximized().then(setMaximized)
  }, [])

  const handleMax = async () => {
    api.maximize()
    setTimeout(async () => setMaximized(await api.isMaximized()), 100)
  }

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <span style={{ fontSize: 18 }}>🎵</span>
        <span className="titlebar-title">SonicSurge</span>
        {playingIds.size > 0 && (
          <div className="playing-bar titlebar-no-drag">
            <div className="waveform">
              {[1,2,3,4].map(i => <div key={i} className="waveform-bar" />)}
            </div>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}>{playingIds.size} playing</span>
            <button
              className="btn btn-ghost titlebar-no-drag"
              style={{ padding: '3px 8px', fontSize: 11, marginLeft: 4 }}
              onClick={stopAll}
            >⏹ Stop All</button>
          </div>
        )}
      </div>
      <div className="titlebar-no-drag" style={{ display: 'flex', gap: 6 }}>
        <button className="win-btn" onClick={() => api.minimize()}>─</button>
        <button className="win-btn" onClick={handleMax}>{maximized ? '❐' : '□'}</button>
        <button className="win-btn close" onClick={() => api.close()}>✕</button>
      </div>
    </div>
  )
}
