import { useSoundStore } from '../store/soundStore'
import { RiPlayFill, RiStopFill, RiHeartFill, RiHeartLine, RiEdit2Line, RiDeleteBinLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

export default function SoundCard({ sound, onEdit }) {
  const { playSound, stopSound, toggleFavorite, deleteSound, setSoundVolume, playingIds } = useSoundStore()
  const isPlaying = playingIds.has(sound.id)

  const handlePlay = (e) => {
    e.stopPropagation()
    if (isPlaying) stopSound(sound.id)
    else playSound(sound.id)
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    await deleteSound(sound.id)
    toast.success(`"${sound.name}" deleted`)
  }

  const handleFav = (e) => {
    e.stopPropagation()
    toggleFavorite(sound.id)
  }

  return (
    <div
      className={`sound-card ${isPlaying ? 'playing' : ''} ${sound.favorite ? 'fav' : ''}`}
      onDoubleClick={() => playSound(sound.id)}
      title={`Double-click or press ${sound.hotkey || 'play'} to play`}
    >
      {/* Emoji */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="sound-emoji">{sound.emoji || '🎵'}</span>
        {isPlaying && (
          <div className="waveform" style={{ marginLeft: 'auto' }}>
            {[1,2,3,4].map(i => <div key={i} className="waveform-bar" />)}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="sound-name" title={sound.name}>{sound.name}</div>

      {/* Hotkey badge */}
      {sound.hotkey && (
        <span className="sound-hotkey">{sound.hotkey}</span>
      )}

      {/* Volume */}
      <div className="vol-row">
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🔊</span>
        <input
          type="range" min="0" max="100"
          value={sound.volume ?? 80}
          className="vol-slider"
          onClick={e => e.stopPropagation()}
          onChange={e => setSoundVolume(sound.id, Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, var(--accent) ${sound.volume ?? 80}%, var(--border) ${sound.volume ?? 80}%)`
          }}
        />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 26, textAlign: 'right' }}>
          {sound.volume ?? 80}%
        </span>
      </div>

      {/* Actions */}
      <div className="sound-actions">
        <button
          className={`sound-btn play`}
          onClick={handlePlay}
          title={isPlaying ? 'Stop' : 'Play'}
        >
          {isPlaying ? <RiStopFill /> : <RiPlayFill />}
        </button>
        <button
          className={`sound-btn fav ${sound.favorite ? 'active' : ''}`}
          onClick={handleFav}
          title={sound.favorite ? 'Unfavorite' : 'Favorite'}
        >
          {sound.favorite ? <RiHeartFill /> : <RiHeartLine />}
        </button>
        <button className="sound-btn" onClick={(e) => { e.stopPropagation(); onEdit() }} title="Edit">
          <RiEdit2Line />
        </button>
        <button className="sound-btn danger" onClick={handleDelete} title="Delete">
          <RiDeleteBinLine />
        </button>
      </div>
    </div>
  )
}
