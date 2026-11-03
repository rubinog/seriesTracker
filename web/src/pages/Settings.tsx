import { useStore } from '../store'
import { Title } from '../ui'

const accents = ['#7657e8', '#d6336c', '#7048e8', '#1c7ed6', '#0ca678', '#f08c00']
const themes = [['light', 'Chiaro'], ['dark', 'Scuro'], ['auto', 'Automatico']] as const

export default function SettingsPage() {
  const { settings, updateSettings, user, logout } = useStore()
  return (
    <>
      <Title>Impostazioni</Title>
      <div className="space-y-6 px-5">
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Tema</h2>
          <div className="flex rounded-2xl border border-line bg-surface p-1">
            {themes.map(([v, l]) => (
              <button key={v} onClick={() => updateSettings({ theme: v })}
                className={`flex-1 rounded-xl py-2 text-sm font-medium ${settings.theme === v ? 'bg-accent text-white' : 'text-muted'}`}>{l}</button>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Colore d'accento</h2>
          <div className="flex gap-3">
            {accents.map(c => (
              <button key={c} aria-label={c} onClick={() => updateSettings({ accent: c })}
                className={`h-10 w-10 rounded-full ${settings.accent === c ? 'ring-2 ring-text ring-offset-2 ring-offset-bg' : ''}`}
                style={{ background: c }} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Account</h2>
          <p className="mb-2">{user}</p>
          <button onClick={logout} className="rounded-2xl border border-line px-4 py-2.5 text-sm">Esci</button>
        </section>
        <section className="border-t border-line pt-4">
          <h2 className="text-sm font-medium text-muted">Versione app</h2>
          <p className="mt-1 font-mono text-xs text-muted">{__APP_VERSION__}</p>
        </section>
      </div>
    </>
  )
}
