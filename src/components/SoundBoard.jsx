import { useState, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { useSoundStore } from '../store/soundStore'
import SoundCard from './SoundCard'
import EditModal from './EditModal'
import MasterBar from './MasterBar'
import { RiAddLine, RiFolderOpenLine, RiSearchLine } from 'react-icons/ri'

const FILTERS = [
  { id: 'all', label: '🎵 All' },
  { id: 'favorites', label: '❤️ Favorites' },
  { id: 'recent', label: '🕐 Recent' },
]

export default function SoundBoard() {
  const {
    addSounds, filteredSounds, activeFilter, setFilter,
    searchQuery, setSearch, sounds
  } = useSoundStore()

  const [dragging, setDragging] = useState(false)
  const [editSound, setEditSound] = useState(null)
  const dropRef = useRef(null)

  const handleImport = async () => {
    const imported = await window.electronAPI.importSoundFiles()
    if (!imported || imported.length === 0) return
    const added = addSounds(imported)
    toast.success(`Added ${added.length} sound${added.length > 1 ? 's' : ''}!`)
  }

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback((e) => {
    if (!dropRef.current?.contains(e.relatedTarget)) setDragging(false)
  }, [])

  const onDrop = useCallback(async (e) => {
    e.preventDefault()
    setDragging(false)
    const paths = Array.from(e.dataTransfer.files).map(f => f.path)
    if (!paths.length) return
    const imported = await window.electronAPI.dropFiles(paths)
    if (!imported || !imported.length) {
      toast.error('No valid audio files found')
      return
    }
    const added = addSounds(imported)
    toast.success(`Added ${added.length} sound${added.length > 1 ? 's' : ''}!`)
  }, [addSounds])

  const list = filteredSounds()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="board-header">
        <h1 className="board-title">Soundboard</h1>
        <span className="board-count">{sounds.length} sounds</span>
        <div className="board-actions">
          <button className="btn btn-ghost" onClick={handleImport}>
            <RiFolderOpenLine /> Import Files
          </button>
          <button className="btn btn-primary" onClick={handleImport}>
            <RiAddLine /> Add Sound
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <RiSearchLine className="search-icon" />
        <input
          type="text"
          placeholder="Search sounds…"
          value={searchQuery}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filter chips */}
      <div className="filter-bar">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`filter-chip ${activeFilter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >{f.label}</button>
        ))}
      </div>

      {/* Grid / drop zone */}
      <div
        ref={dropRef}
        className="drop-zone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{ position: 'relative' }}
      >
        {dragging && (
          <div className="drop-overlay">
            <div className="drop-overlay-icon">🎵</div>
            <div className="drop-overlay-text">Drop audio files here</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>MP3, WAV, OGG, FLAC supported</div>
          </div>
        )}

        {list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎵</div>
            <div className="empty-title">
              {searchQuery ? 'No sounds match your search' : 'No sounds yet'}
            </div>
            <div className="empty-sub">
              {searchQuery
                ? 'Try a different search term'
                : 'Click "Add Sound" or drag and drop audio files to get started'}
            </div>
            {!searchQuery && (
              <button className="btn btn-primary" onClick={handleImport}>
                <RiAddLine /> Add Your First Sound
              </button>
            )}
          </div>
        ) : (
          <div className="sound-grid">
            {list.map(s => (
              <SoundCard key={s.id} sound={s} onEdit={() => setEditSound(s)} />
            ))}
          </div>
        )}
      </div>

      {/* Master volume bar */}
      <MasterBar />

      {/* Edit modal */}
      {editSound && (
        <EditModal
          sound={editSound}
          onClose={() => setEditSound(null)}
        />
      )}
    </div>
  )
}
