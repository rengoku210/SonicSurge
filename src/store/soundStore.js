import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

const api = window.electronAPI

const defaultSettings = {
  masterVolume: 80,
  playThroughMic: false,
  hearMyPlayback: true,        // user hears sound locally
  pttKey: 'V',
  pttMode: 'hold',             // 'hold' | 'tap'
  pttEnabled: false,
  outputDevice: 'default',
  virtualInputDevice: '',
  virtualOutputDevice: '',
  pipelineActive: false,
  stopAllHotkey: '',
}

export const useSoundStore = create((set, get) => ({
  sounds: [],
  settings: defaultSettings,
  activeFilter: 'all',
  searchQuery: '',
  playingIds: new Set(),       // set of currently playing sound IDs
  currentPage: 'soundboard',
  audioMap: new Map(),         // id -> HTMLAudioElement (single instance per sound)
  audioDevices: [],

  // ── Init ──────────────────────────────────────────────────────────────────
  init: async () => {
    const savedSettings = await api.getSettings()
    const settings = { ...defaultSettings, ...savedSettings }
    const meta = await api.getSoundsMeta()
    set({ settings, sounds: meta || [] })

    // List audio devices
    try {
      const devices = await api.listAudioDevices()
      set({ audioDevices: devices || [] })
    } catch (e) {}

    // Re-register per-sound hotkeys
    for (const s of (meta || [])) {
      if (s.hotkey) await api.registerHotkey({ id: s.id, accelerator: s.hotkey })
    }

    // Re-register Stop All hotkey
    if (settings.stopAllHotkey) await api.registerStopAllHotkey(settings.stopAllHotkey)

    // Sync PTT to main process
    await api.setPTTKey(settings.pttKey)
    await api.setPTTMode(settings.pttMode)

    // Hotkey listeners (clean up first to avoid duplicates on re-init)
    api.removeHotkeyListener()
    api.onHotkeyTriggered((id) => get().playSound(id))

    api.removeStopAllListener()
    api.onStopAll(() => get().stopAll())
  },

  // ── Navigation ────────────────────────────────────────────────────────────
  setPage: (p) => set({ currentPage: p }),
  setFilter: (f) => set({ activeFilter: f }),
  setSearch: (q) => set({ searchQuery: q }),

  // ── CRUD ──────────────────────────────────────────────────────────────────
  addSounds: (imported) => {
    const newSounds = imported.map(({ name }) => ({
      id: uuidv4(), filename: name,
      name: name.replace(/\.[^.]+$/, ''),
      volume: 80, hotkey: '', favorite: false,
      emoji: randomEmoji(), addedAt: Date.now(),
    }))
    const sounds = [...get().sounds, ...newSounds]
    set({ sounds })
    api.saveSoundsMeta(sounds)
    return newSounds
  },

  renameSound: (id, name) => {
    const sounds = get().sounds.map(s => s.id === id ? { ...s, name } : s)
    set({ sounds }); api.saveSoundsMeta(sounds)
  },

  deleteSound: async (id) => {
    const sound = get().sounds.find(s => s.id === id)
    if (!sound) return
    get().stopSound(id)
    await api.deleteSound(sound.filename)
    await api.unregisterHotkey(id)
    const sounds = get().sounds.filter(s => s.id !== id)
    set({ sounds }); api.saveSoundsMeta(sounds)
  },

  toggleFavorite: (id) => {
    const sounds = get().sounds.map(s => s.id === id ? { ...s, favorite: !s.favorite } : s)
    set({ sounds }); api.saveSoundsMeta(sounds)
  },

  setSoundVolume: (id, volume) => {
    // Also update live audio if playing
    const audio = get().audioMap.get(id)
    if (audio) audio.volume = clampVol(volume, get().settings.masterVolume)
    const sounds = get().sounds.map(s => s.id === id ? { ...s, volume } : s)
    set({ sounds }); api.saveSoundsMeta(sounds)
  },

  setSoundHotkey: async (id, hotkey) => {
    const res = await api.registerHotkey({ id, accelerator: hotkey })
    if (res.success) {
      const sounds = get().sounds.map(s => s.id === id ? { ...s, hotkey } : s)
      set({ sounds }); api.saveSoundsMeta(sounds)
    }
    return res
  },

  setSoundEmoji: (id, emoji) => {
    const sounds = get().sounds.map(s => s.id === id ? { ...s, emoji } : s)
    set({ sounds }); api.saveSoundsMeta(sounds)
  },

  // ── Playback ──────────────────────────────────────────────────────────────
  // KEY FIX: each sound has ONE audio element. Playing again stops previous.
  playSound: async (id) => {
    const sound = get().sounds.find(s => s.id === id)
    if (!sound) return
    const { settings } = get()

    // Stop any existing instance of this sound first
    get().stopSound(id)

    // PTT press
    if (settings.pttEnabled && settings.pttKey) {
      await api.pressPTT()
      // Small delay so game registers PTT before audio starts
      await new Promise(r => setTimeout(r, 80))
    }

    try {
      const filePath = await api.getSoundFilePath(sound.filename)
      const fileUrl = 'file:///' + filePath.replace(/\\/g, '/')

      const audio = new Audio(fileUrl)
      // Volume: use 0 if "hear my playback" is off (still plays to mic output)
      audio.volume = settings.hearMyPlayback
        ? clampVol(sound.volume ?? 80, settings.masterVolume)
        : 0

      // Prevent any looping
      audio.loop = false

      // Store reference
      const newAudioMap = new Map(get().audioMap)
      newAudioMap.set(id, audio)
      const newPlaying = new Set([...get().playingIds, id])
      set({ audioMap: newAudioMap, playingIds: newPlaying })

      const cleanup = async () => {
        const map = new Map(get().audioMap)
        const playing = new Set(get().playingIds)
        if (map.get(id) === audio) {
          map.delete(id)
          playing.delete(id)
          set({ audioMap: map, playingIds: playing })
        }
        // Release PTT after sound ends
        if (settings.pttEnabled && settings.pttKey) {
          await api.releasePTT()
        }
      }

      audio.addEventListener('ended', cleanup, { once: true })
      audio.addEventListener('error', cleanup, { once: true })

      await audio.play()
    } catch (e) {
      console.error('Playback error:', e)
      // Ensure cleanup on error
      const map = new Map(get().audioMap)
      const playing = new Set(get().playingIds)
      map.delete(id); playing.delete(id)
      set({ audioMap: map, playingIds: playing })
      if (settings.pttEnabled) await api.releasePTT()
    }
  },

  stopSound: (id) => {
    const audio = get().audioMap.get(id)
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio.src = '' // fully release resource
    }
    const map = new Map(get().audioMap)
    const playing = new Set(get().playingIds)
    map.delete(id); playing.delete(id)
    set({ audioMap: map, playingIds: playing })
  },

  stopAll: () => {
    get().audioMap.forEach(audio => {
      try { audio.pause(); audio.currentTime = 0; audio.src = '' } catch (e) {}
    })
    set({ audioMap: new Map(), playingIds: new Set() })
    // Always release PTT on stop all
    if (get().settings.pttEnabled) api.releasePTT()
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch }
    set({ settings })
    await api.saveSettings(settings)

    if ('stopAllHotkey' in patch) await api.registerStopAllHotkey(patch.stopAllHotkey || '')
    if ('pttKey' in patch) await api.setPTTKey(patch.pttKey || 'V')
    if ('pttMode' in patch) await api.setPTTMode(patch.pttMode || 'hold')
  },

  // ── Virtual Audio Pipeline ────────────────────────────────────────────────
  createPipeline: async () => {
    const { settings } = get()
    await get().updateSettings({ pipelineActive: true })
    return { success: true }
  },

  deletePipeline: async () => {
    await get().updateSettings({ pipelineActive: false })
    return { success: true }
  },

  // ── Filtered sounds ───────────────────────────────────────────────────────
  filteredSounds: () => {
    const { sounds, activeFilter, searchQuery } = get()
    let list = [...sounds]
    if (activeFilter === 'favorites') list = list.filter(s => s.favorite)
    if (activeFilter === 'recent') list = list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 20)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q))
    }
    return list
  },
}))

function clampVol(soundVol, masterVol) {
  return Math.min(1, Math.max(0, (soundVol / 100) * (masterVol / 100)))
}

const EMOJIS = ['🎵','🔊','💥','🎤','🎸','🥁','🎹','🎺','🎻','🔥','⚡','💀','🎯','🚀','👾','🎮','🏆','💣','🌊','⚔️','😂','💩','🐔','😎','🔔','📢','🎙️','🎧']
function randomEmoji() { return EMOJIS[Math.floor(Math.random() * EMOJIS.length)] }
