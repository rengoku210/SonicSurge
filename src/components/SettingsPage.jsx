import { useState, useEffect, useCallback } from 'react'
import { useSoundStore } from '../store/soundStore'
import toast from 'react-hot-toast'
import {
  RiSettings4Line, RiSoundModuleFill, RiMicLine, RiKeyboardLine,
  RiGamepadLine, RiInformationLine, RiAddCircleLine, RiDeleteBinLine,
  RiCheckLine, RiVolumeUpLine, RiHeadphoneLine
} from 'react-icons/ri'

export default function SettingsPage() {
  const { settings, updateSettings, audioDevices, createPipeline, deletePipeline } = useSoundStore()
  const [recording, setRecording] = useState(null) // 'ptt' | 'stopAll'
  const [localPTT, setLocalPTT] = useState(settings.pttKey || 'V')
  const [localStopAll, setLocalStopAll] = useState(settings.stopAllHotkey || '')
  const [pipelineStatus, setPipelineStatus] = useState('')

  useEffect(() => { setLocalPTT(settings.pttKey || 'V') }, [settings.pttKey])
  useEffect(() => { setLocalStopAll(settings.stopAllHotkey || '') }, [settings.stopAllHotkey])

  // Key recorder
  useEffect(() => {
    if (!recording) return
    const onKey = (e) => {
      e.preventDefault()
      const parts = []
      if (e.ctrlKey) parts.push('Control')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      let k = e.key
      if (['Control','Alt','Shift'].includes(k)) return
      if (k.length === 1) k = k.toUpperCase()
      const keyMap = { ' ': 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' }
      k = keyMap[k] || k
      if (!parts.includes(k)) parts.push(k)
      const combo = parts.join('+')
      if (recording === 'ptt') setLocalPTT(combo)
      else setLocalStopAll(combo)
      setRecording(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [recording])

  const savePTT = async () => {
    await updateSettings({ pttKey: localPTT })
    toast.success(`PTT key set to "${localPTT}"`)
  }
  const saveStopAll = async () => {
    await updateSettings({ stopAllHotkey: localStopAll })
    toast.success('Stop All hotkey saved!')
  }

  const handleCreatePipeline = async () => {
    setPipelineStatus('creating')
    await createPipeline()
    setPipelineStatus('active')
    toast.success('Audio pipeline activated!')
  }

  const handleDeletePipeline = async () => {
    await deletePipeline()
    setPipelineStatus('')
    toast.success('Pipeline removed')
  }

  const vbCableDetected = audioDevices.some(d => d.toLowerCase().includes('cable') || d.toLowerCase().includes('voicemeeter'))
  const s = settings

  return (
    <div className="settings-wrap">
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <RiSettings4Line /> Settings
      </h1>

      {/* ── Audio ── */}
      <div className="settings-section">
        <div className="settings-section-title"><RiSoundModuleFill style={{color:'var(--accent)'}} /> Audio</div>

        <SettingRow label="Master Volume" desc="Global volume multiplier for all sound playback">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="range" min="0" max="100" value={s.masterVolume ?? 80}
              className="master-vol-slider" style={{ width: 140, background: `linear-gradient(to right, var(--accent) ${s.masterVolume??80}%, var(--border) ${s.masterVolume??80}%)` }}
              onChange={e => updateSettings({ masterVolume: Number(e.target.value) })} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 36 }}>{s.masterVolume ?? 80}%</span>
          </div>
        </SettingRow>

        <SettingRow label="Hear My Playback" desc="You hear the sound locally when playing. Disable to send only to mic output.">
          <Toggle on={s.hearMyPlayback !== false} onToggle={() => updateSettings({ hearMyPlayback: !s.hearMyPlayback })} />
        </SettingRow>

        <SettingRow label="Play Through Microphone" desc="Route audio to virtual mic device for Discord/Valorant">
          <Toggle on={!!s.playThroughMic} onToggle={() => updateSettings({ playThroughMic: !s.playThroughMic })} />
        </SettingRow>
      </div>

      {/* ── Virtual Audio Pipeline ── */}
      <div className="settings-section">
        <div className="settings-section-title"><RiMicLine style={{color:'var(--accent-3)'}} /> Virtual Audio Pipeline</div>

        {!vbCableDetected && (
          <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 12, color: 'var(--warning)', lineHeight: 1.6 }}>
            ⚠️ No VB-CABLE/Voicemeeter detected. Install a virtual audio driver first.
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-ghost" style={{fontSize:11,padding:'4px 10px'}} onClick={() => window.electronAPI.openExternal('https://vb-audio.com/Cable/')}>VB-CABLE ↗</button>
              <button className="btn btn-ghost" style={{fontSize:11,padding:'4px 10px'}} onClick={() => window.electronAPI.openExternal('https://vb-audio.com/Voicemeeter/')}>Voicemeeter ↗</button>
            </div>
          </div>
        )}

        {vbCableDetected && (
          <div style={{ padding: '8px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RiCheckLine /> Virtual audio driver detected
          </div>
        )}

        <SettingRow label="Virtual Input Device" desc="The device name to send soundboard output into">
          <select className="form-input" style={{ padding: '7px 12px', minWidth: 200 }}
            value={s.virtualInputDevice || ''}
            onChange={e => updateSettings({ virtualInputDevice: e.target.value })}>
            <option value="">Select device…</option>
            {audioDevices.filter(d => d.toLowerCase().includes('cable') || d.toLowerCase().includes('voicemeeter') || d.toLowerCase().includes('virtual'))
              .map(d => <option key={d} value={d}>{d}</option>)}
            {audioDevices.map(d => <option key={d + '_all'} value={d}>{d}</option>)}
          </select>
        </SettingRow>

        <SettingRow label="Virtual Output Device" desc="The device name your mic app (Discord) listens on">
          <select className="form-input" style={{ padding: '7px 12px', minWidth: 200 }}
            value={s.virtualOutputDevice || ''}
            onChange={e => updateSettings({ virtualOutputDevice: e.target.value })}>
            <option value="">Select device…</option>
            {audioDevices.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </SettingRow>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            className={`btn ${s.pipelineActive ? 'btn-ghost' : 'btn-primary'}`}
            onClick={handleCreatePipeline}
            disabled={!!s.pipelineActive}
            style={{ gap: 7 }}
          >
            <RiAddCircleLine />
            {s.pipelineActive ? 'Pipeline Active' : 'Create Pipeline'}
          </button>
          {s.pipelineActive && (
            <button className="btn btn-danger" onClick={handleDeletePipeline}>
              <RiDeleteBinLine /> Delete Pipeline
            </button>
          )}
        </div>

        {s.pipelineActive && (
          <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--accent)', lineHeight: 1.7 }}>
            ✅ <strong>Pipeline Active</strong><br/>
            Soundboard → <strong style={{color:'var(--accent-3)'}}>{s.virtualInputDevice || 'Virtual Input'}</strong> → <strong style={{color:'var(--accent-3)'}}>{s.virtualOutputDevice || 'Virtual Output'}</strong> → Discord/Valorant Mic<br/>
            <span style={{color:'var(--text-muted)',fontSize:11}}>Set Discord microphone to "{s.virtualOutputDevice || 'CABLE Output'}"</span>
          </div>
        )}
      </div>

      {/* ── Valorant PTT ── */}
      <div className="settings-section">
        <div className="settings-section-title"><RiGamepadLine style={{color:'var(--accent-2)'}} /> Valorant Push-To-Talk Sync</div>

        <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          🛡️ <strong style={{color:'var(--success)'}}>Safe:</strong> Uses standard Windows keyboard simulation (SendInput API) — identical to a physical key press. Does NOT inject into Valorant, does NOT interact with Vanguard.
        </div>

        <SettingRow label="Enable PTT Sync" desc="Auto press/release your PTT key when playing a sound">
          <Toggle on={!!s.pttEnabled} onToggle={() => updateSettings({ pttEnabled: !s.pttEnabled })} />
        </SettingRow>

        <SettingRow label="Push-To-Talk Key" desc={`Your Valorant PTT key (default: V)`}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className={`hotkey-recorder ${recording === 'ptt' ? 'recording' : ''}`}
              onClick={() => setRecording('ptt')} style={{ minWidth: 120 }}>
              {recording === 'ptt' ? '⌨ Press key…' : (localPTT || 'Click to set')}
            </div>
            <button className="btn btn-primary" style={{padding:'7px 14px'}} onClick={savePTT}>Save</button>
          </div>
        </SettingRow>

        <SettingRow label="PTT Mode" desc="Hold: key held for full duration. Tap: press & release at start.">
          <div style={{ display: 'flex', gap: 8 }}>
            {['hold', 'tap'].map(m => (
              <button key={m} className={`btn ${s.pttMode === m ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '7px 18px', textTransform: 'capitalize' }}
                onClick={() => updateSettings({ pttMode: m })}>{m}</button>
            ))}
          </div>
        </SettingRow>
      </div>

      {/* ── Global Hotkeys ── */}
      <div className="settings-section">
        <div className="settings-section-title"><RiKeyboardLine style={{color:'var(--accent)'}} /> Global Hotkeys</div>
        <SettingRow label="Stop All Sounds" desc="Global hotkey to immediately stop all playback">
          <div style={{ display: 'flex', gap: 8 }}>
            <div className={`hotkey-recorder ${recording === 'stopAll' ? 'recording' : ''}`}
              onClick={() => setRecording('stopAll')} style={{ minWidth: 140 }}>
              {recording === 'stopAll' ? '⌨ Press keys…' : (localStopAll || 'Click to set')}
            </div>
            {localStopAll && <button className="btn btn-ghost" style={{padding:'7px 12px'}} onClick={() => setLocalStopAll('')}>✕</button>}
            <button className="btn btn-primary" style={{padding:'7px 14px'}} onClick={saveStopAll}>Save</button>
          </div>
        </SettingRow>
        <div style={{ padding: '12px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
          ⚠️ Global hotkeys work even while games are in focus. Run as Administrator for best compatibility.
        </div>
      </div>

      {/* ── About ── */}
      <div className="settings-section">
        <div className="settings-section-title"><RiInformationLine style={{color:'var(--text-muted)'}} /> About SonicSurge</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          {[['Version', '1.0.0'], ['Framework', 'Electron + React'], ['Platform', 'Windows x64'], ['License', 'MIT']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{k}</span><span style={{ color: 'var(--accent)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SettingRow({ label, desc, children }) {
  return (
    <div className="setting-row">
      <div style={{ flex: 1 }}>
        <div className="setting-label">{label}</div>
        {desc && <div className="setting-desc">{desc}</div>}
      </div>
      <div style={{ marginLeft: 16, flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Toggle({ on, onToggle }) {
  return <button className={`toggle ${on ? 'on' : ''}`} onClick={onToggle} />
}
