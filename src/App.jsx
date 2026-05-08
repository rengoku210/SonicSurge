import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useSoundStore } from './store/soundStore'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import SoundBoard from './components/SoundBoard'
import ImportPage from './components/ImportPage'
import SettingsPage from './components/SettingsPage'

export default function App() {
  const { init, currentPage } = useSoundStore()

  useEffect(() => { init() }, [])

  return (
    <div className="app">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#14141f',
            color: '#f1f1ff',
            border: '1px solid #1e1e30',
            borderRadius: '10px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#14141f' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#14141f' } },
        }}
      />
      <TitleBar />
      <div className="main-layout">
        <Sidebar />
        <div className="content">
          {currentPage === 'soundboard' && <SoundBoard />}
          {currentPage === 'import' && <ImportPage />}
          {currentPage === 'settings' && <SettingsPage />}
        </div>
      </div>
    </div>
  )
}
