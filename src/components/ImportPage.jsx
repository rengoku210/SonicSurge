import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useSoundStore } from '../store/soundStore'
import { RiYoutubeLine, RiInstagramLine, RiLinkM, RiInformationLine, RiDownloadLine, RiCheckLine, RiCloseLine, RiScissorsLine } from 'react-icons/ri'

export default function ImportPage() {
  const { addSounds } = useSoundStore()
  const [url, setUrl] = useState('')
  const [ytStatus, setYtStatus] = useState(null) // null | 'checking' | 'fetching' | 'ready' | 'downloading' | 'done' | 'error'
  const [ytInfo, setYtInfo] = useState(null)
  const [ytError, setYtError] = useState('')
  const [ytProgress, setYtProgress] = useState('')
  const [clipName, setClipName] = useState('')
  const [startSec, setStartSec] = useState('')
  const [endSec, setEndSec] = useState('')
  const [ytdlpInstalled, setYtdlpInstalled] = useState(null)

  useEffect(() => {
    // Check yt-dlp on mount
    window.electronAPI.ytdlpCheckInstalled().then(res => {
      setYtdlpInstalled(res.installed)
    })
    // Listen for download progress
    window.electronAPI.onYtdlpProgress((msg) => {
      setYtProgress(msg.slice(0, 200))
    })
    return () => window.electronAPI.removeYtdlpProgressListener()
  }, [])

  const handleImportFiles = async () => {
    const imported = await window.electronAPI.importSoundFiles()
    if (!imported || imported.length === 0) return
    const added = addSounds(imported)
    toast.success(`Added ${added.length} sound${added.length > 1 ? 's' : ''}!`)
  }

  const handleFetchInfo = async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    setYtStatus('fetching')
    setYtInfo(null)
    setYtError('')
    setYtProgress('')

    const res = await window.electronAPI.ytdlpGetInfo(trimmed)
    if (!res.success) {
      setYtStatus('error')
      setYtError(res.error)
      return
    }
    setYtInfo(res)
    setClipName(res.title?.slice(0, 50) || 'clip')
    setYtStatus('ready')
  }

  const handleDownload = async () => {
    if (!ytInfo) return
    setYtStatus('downloading')
    setYtProgress('')

    const res = await window.electronAPI.ytdlpDownload({
      url: url.trim(),
      name: clipName || ytInfo.title,
      startSec: startSec ? Number(startSec) : undefined,
      endSec: endSec ? Number(endSec) : undefined,
    })

    if (!res.success) {
      setYtStatus('error')
      setYtError(res.error)
      return
    }

    const added = addSounds([{ dest: res.dest, name: res.name }])
    setYtStatus('done')
    toast.success(`"${added[0].name}" added to soundboard!`)
    setUrl('')
    setYtInfo(null)
  }

  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
  const isInstagram = url.includes('instagram.com')

  const formatDuration = (s) => {
    if (!s) return ''
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div className="import-wrap">
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Import Sounds
      </h1>

      {/* yt-dlp status banner */}
      {ytdlpInstalled !== null && (
        <div style={{
          padding: '10px 16px', borderRadius: 'var(--radius)', marginBottom: 20,
          background: ytdlpInstalled ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${ytdlpInstalled ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
          color: ytdlpInstalled ? 'var(--success)' : 'var(--danger)'
        }}>
          {ytdlpInstalled ? <RiCheckLine /> : <RiCloseLine />}
          {ytdlpInstalled
            ? '✅ yt-dlp is installed — YouTube & Instagram import is ready!'
            : '❌ yt-dlp not found in PATH. Restart the app after installing it.'}
        </div>
      )}

      {/* File Import */}
      <div className="url-import-card">
        <div className="url-import-title">📂 Import Local Files</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
          Supported: MP3, WAV, OGG, FLAC, M4A, AAC — drag & drop also works on the Soundboard tab.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleImportFiles}>📂 Browse Files</button>
          <div style={{
            flex: 1, minWidth: 180, padding: '10px 18px',
            border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)',
            textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
          }}>Or drag files onto the Soundboard tab</div>
        </div>
      </div>

      {/* YouTube / Instagram URL Import */}
      <div className="url-import-card">
        <div className="url-import-title">
          {isInstagram
            ? <RiInstagramLine style={{ color: '#e1306c', fontSize: 22 }} />
            : <RiYoutubeLine style={{ color: '#ff0000', fontSize: 22 }} />}
          YouTube / Instagram Audio Import
        </div>

        <div className="url-row" style={{ marginBottom: 12 }}>
          <input
            type="text"
            className="url-input"
            placeholder="https://www.youtube.com/watch?v=... or Instagram URL"
            value={url}
            onChange={e => { setUrl(e.target.value); setYtStatus(null); setYtInfo(null) }}
            onKeyDown={e => e.key === 'Enter' && handleFetchInfo()}
          />
          <button
            className="btn btn-primary"
            onClick={handleFetchInfo}
            disabled={!url.trim() || ytStatus === 'fetching' || ytStatus === 'downloading'}
          >
            {ytStatus === 'fetching' ? '⏳ Fetching…' : <><RiLinkM /> Fetch Info</>}
          </button>
        </div>

        {/* Error */}
        {ytStatus === 'error' && (
          <div className="url-status error">❌ {ytError}</div>
        )}

        {/* Info card */}
        {ytInfo && ytStatus !== 'error' && (
          <div style={{
            background: 'var(--bg-overlay)', borderRadius: 'var(--radius-lg)',
            padding: 16, display: 'flex', gap: 14, marginBottom: 16,
            border: '1px solid var(--border)'
          }}>
            {ytInfo.thumbnail && (
              <img src={ytInfo.thumbnail} alt="thumb"
                style={{ width: 100, height: 68, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ytInfo.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                {ytInfo.uploader && `${ytInfo.uploader} · `}{ytInfo.duration ? formatDuration(ytInfo.duration) : ''}
              </div>

              {/* Clip name */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className="form-input"
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
                  placeholder="Clip name…"
                  value={clipName}
                  onChange={e => setClipName(e.target.value)}
                />
              </div>

              {/* Trim controls */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <RiScissorsLine style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <input
                  className="form-input"
                  style={{ width: 80, padding: '5px 8px', fontSize: 12 }}
                  placeholder="Start (s)"
                  value={startSec}
                  onChange={e => setStartSec(e.target.value)}
                  type="number" min="0"
                />
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
                <input
                  className="form-input"
                  style={{ width: 80, padding: '5px 8px', fontSize: 12 }}
                  placeholder="End (s)"
                  value={endSec}
                  onChange={e => setEndSec(e.target.value)}
                  type="number" min="0"
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>leave blank = full clip</span>
              </div>
            </div>
          </div>
        )}

        {/* Download button */}
        {ytStatus === 'ready' && (
          <button className="btn btn-primary" onClick={handleDownload} style={{ width: '100%', justifyContent: 'center' }}>
            <RiDownloadLine /> Download & Add to Soundboard
          </button>
        )}

        {/* Downloading progress */}
        {ytStatus === 'downloading' && (
          <div className="url-status loading">
            ⏳ Downloading… this may take a moment
            {ytProgress && <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7, fontFamily: 'monospace', wordBreak: 'break-all' }}>{ytProgress}</div>}
          </div>
        )}

        {/* Done */}
        {ytStatus === 'done' && (
          <div className="url-status success">✅ Added to soundboard! Switch to the Soundboard tab to play it.</div>
        )}
      </div>

      {/* Virtual Audio Cable info */}
      <div className="url-import-card">
        <div className="url-import-title">🎙️ Virtual Microphone Setup</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
          To play sounds through your mic in Discord/Valorant, install a virtual audio device:
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => window.electronAPI.openExternal('https://vb-audio.com/Cable/')}>
            🔗 VB-Audio Cable (Free)
          </button>
          <button className="btn btn-ghost" onClick={() => window.electronAPI.openExternal('https://vb-audio.com/Voicemeeter/')}>
            🔗 Voicemeeter (Free)
          </button>
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-muted)' }}>
          After installing: set Discord input to <strong style={{color:'var(--accent-3)'}}>CABLE Output (VB-Audio)</strong> and enable Play Through Mic in Settings.
        </div>
      </div>
    </div>
  )
}
