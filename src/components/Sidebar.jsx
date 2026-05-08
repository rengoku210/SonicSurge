import { useSoundStore } from '../store/soundStore'
import {
  RiSoundModuleFill, RiDownloadLine, RiSettings4Line,
  RiHeartLine, RiMicLine, RiKeyboardLine
} from 'react-icons/ri'

const NAV = [
  { id: 'soundboard', label: 'Soundboard', icon: <RiSoundModuleFill /> },
  { id: 'import', label: 'Import', icon: <RiDownloadLine /> },
  { id: 'settings', label: 'Settings', icon: <RiSettings4Line /> },
]

export default function Sidebar() {
  const { currentPage, setPage, sounds, settings, updateSettings } = useSoundStore()

  const favCount = sounds.filter(s => s.favorite).length

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🎵</div>
        <span className="logo-text">Sonic<span>Surge</span></span>
      </div>

      <div style={{ padding: '0 8px' }}>
        <div className="sidebar-section">Menu</div>
        {NAV.map(n => (
          <div
            key={n.id}
            className={`nav-item ${currentPage === n.id ? 'active' : ''}`}
            onClick={() => setPage(n.id)}
          >
            <span className="nav-icon">{n.icon}</span>
            {n.label}
            {n.id === 'soundboard' && sounds.length > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 10, background: 'var(--bg-overlay)', padding: '2px 7px', borderRadius: 99, color: 'var(--text-muted)' }}>
                {sounds.length}
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 8px 0', marginTop: 8 }}>
        <div className="sidebar-section">Quick Stats</div>
        <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StatRow icon={<RiHeartLine />} label="Favorites" value={favCount} color="var(--accent-hot)" />
          <StatRow icon={<RiSoundModuleFill />} label="Total Sounds" value={sounds.length} color="var(--accent)" />
          <StatRow icon={<RiKeyboardLine />} label="Hotkeys" value={sounds.filter(s=>s.hotkey).length} color="var(--accent-2)" />
        </div>
      </div>

      <div className="sidebar-footer">
        <div
          className={`mic-toggle ${settings.playThroughMic ? 'on' : ''}`}
          onClick={() => updateSettings({ playThroughMic: !settings.playThroughMic })}
          style={{ justifyContent: 'center', marginBottom: 8 }}
        >
          <RiMicLine />
          {settings.playThroughMic ? 'Mic Active' : 'Mic Off'}
        </div>
        <div className="status-badge">
          <div className="status-dot" />
          <span>SonicSurge v1.0.0</span>
        </div>
      </div>
    </div>
  )
}

function StatRow({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
      <span style={{ color, fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  )
}
