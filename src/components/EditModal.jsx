import { useState, useEffect, useCallback } from 'react'
import { useSoundStore } from '../store/soundStore'
import toast from 'react-hot-toast'

const EMOJIS = ['🎵','🔊','💥','🎤','🎸','🥁','🎹','🎺','🎻','🔥','⚡','💀','🎯','🚀','👾','🎮','🏆','💣','🌊','⚔️','😂','💩','🐔','🤣','😎','🔔','📢','🎙️','🎼','🎧']

export default function EditModal({ sound, onClose }) {
  const { renameSound, setSoundHotkey, setSoundEmoji: _setSoundEmoji } = useSoundStore()
  const setSoundEmoji = _setSoundEmoji
  const [name, setName] = useState(sound.name)
  const [hotkey, setHotkey] = useState(sound.hotkey || '')
  const [recording, setRecording] = useState(false)
  const [emoji, setEmoji] = useState(sound.emoji || '🎵')

  const startRecording = useCallback(() => {
    setRecording(true)
    setHotkey('')
  }, [])

  useEffect(() => {
    if (!recording) return
    const keys = new Set()
    const mods = []

    const onKeyDown = (e) => {
      e.preventDefault()
      keys.add(e.code)
      const parts = []
      if (e.ctrlKey) parts.push('Control')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      // Main key
      let k = e.key
      if (k.length === 1) k = k.toUpperCase()
      if (k === 'Control' || k === 'Alt' || k === 'Shift') return
      // Map special keys
      const keyMap = { ' ': 'Space', 'ArrowUp': 'Up', 'ArrowDown': 'Down', 'ArrowLeft': 'Left', 'ArrowRight': 'Right' }
      k = keyMap[k] || k
      if (!parts.includes(k)) parts.push(k)
      setHotkey(parts.join('+'))
      setRecording(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [recording])

  const handleSave = async () => {
    if (name.trim() !== sound.name) renameSound(sound.id, name.trim())
    if (emoji !== sound.emoji) {
      setSoundEmoji(sound.id, emoji)
    }
    if (hotkey !== sound.hotkey) {
      if (hotkey) {
        const res = await setSoundHotkey(sound.id, hotkey)
        if (!res.success) {
          toast.error('Hotkey conflict: ' + res.error)
          return
        }
      } else {
        await setSoundHotkey(sound.id, '')
      }
    }
    toast.success('Sound updated!')
    onClose()
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">✏️ Edit Sound</div>

        {/* Emoji picker */}
        <div className="form-group">
          <label className="form-label">Icon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EMOJIS.map(em => (
              <button
                key={em}
                onClick={() => setEmoji(em)}
                style={{
                  fontSize: 22, background: emoji === em ? 'rgba(99,102,241,0.2)' : 'var(--bg-overlay)',
                  border: emoji === em ? '2px solid var(--accent)' : '2px solid transparent',
                  borderRadius: 8, padding: 4, cursor: 'pointer', lineHeight: 1,
                  transition: 'all 0.15s'
                }}
              >{em}</button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            className="form-input"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>

        {/* Hotkey */}
        <div className="form-group">
          <label className="form-label">Global Hotkey</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div
              className={`hotkey-recorder ${recording ? 'recording' : ''}`}
              onClick={startRecording}
              style={{ flex: 1 }}
            >
              {recording ? '⌨ Press keys…' : (hotkey || 'Click to record')}
            </div>
            {hotkey && (
              <button className="btn btn-ghost" onClick={() => setHotkey('')} style={{ padding: '8px 12px' }}>Clear</button>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Works globally while games are in focus. Example: Alt+1, Ctrl+F5
          </div>
        </div>

        {/* File info */}
        <div style={{ padding: '10px 14px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-muted)' }}>
          📁 {sound.filename}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}
