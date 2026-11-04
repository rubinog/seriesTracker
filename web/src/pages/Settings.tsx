import { useRef, useState } from 'react'
import { api, post } from '../api'
import { useStore } from '../store'
import { Title } from '../ui'

const accents = ['#7657e8', '#d6336c', '#7048e8', '#1c7ed6', '#0ca678', '#f08c00']
const themes = [['light', 'Chiaro'], ['dark', 'Scuro'], ['auto', 'Automatico']] as const

export default function SettingsPage() {
  const { settings, updateSettings, user, logout, reload } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const exportBackup = async () => {
    try {
      const data = await api('/export')
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `seriestracker-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMsg({ ok: true, text: 'Backup scaricato.' })
    } catch {
      setMsg({ ok: false, text: 'Impossibile creare il backup.' })
    }
  }

  const importBackup = async (file: File) => {
    try {
      const r = await post<{ shows: number; episodes: number }>('/import', JSON.parse(await file.text()))
      await reload()
      setMsg({ ok: true, text: `Importate ${r.shows} serie e ${r.episodes} episodi.` })
    } catch {
      setMsg({ ok: false, text: 'File di backup non valido.' })
    }
  }

  return (
    <>
      <Title>Impostazioni</Title>
      <div className="space-y-6 px-5">
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Tema<span className="text-accent">.</span></h2>
          <div className="flex rounded-2xl border border-line bg-surface p-1">
            {themes.map(([v, l]) => (
              <button key={v} onClick={() => updateSettings({ theme: v })}
                className={`flex-1 rounded-xl py-2 text-sm font-medium ${settings.theme === v ? 'bg-accent text-white' : 'text-muted'}`}>{l}</button>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Colore d'accento<span className="text-accent">.</span></h2>
          <div className="flex gap-3">
            {accents.map(c => (
              <button key={c} aria-label={c} onClick={() => updateSettings({ accent: c })}
                className={`h-10 w-10 rounded-full ${settings.accent === c ? 'ring-2 ring-text ring-offset-2 ring-offset-bg' : ''}`}
                style={{ background: c }} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Backup<span className="text-accent">.</span></h2>
          <p className="mb-3 text-xs text-muted">Scarica le tue serie, i voti e gli episodi visti. L'importazione li unisce a quelli già presenti.</p>
          <div className="flex rounded-2xl border border-line bg-surface p-1">
            <button onClick={exportBackup} className="flex-1 rounded-xl py-2 text-sm font-medium active:bg-accent active:text-white">Esporta</button>
            <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-xl py-2 text-sm font-medium active:bg-accent active:text-white">Importa</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = '' }} />
          </div>
          {msg && <p className={`mt-2 text-xs ${msg.ok ? 'text-muted' : 'text-red-600'}`}>{msg.text}</p>}
        </section>
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Account<span className="text-accent">.</span></h2>
          <p className="mb-3">{user}</p>
          <button onClick={logout} className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm active:bg-red-700">Esci</button>
        </section>
        <section className="border-t border-line pt-4 text-center">
          <h2 className="text-sm font-medium text-muted">Versione app<span className="text-accent">.</span></h2>
          <p className="mt-1 font-mono text-xs text-muted">{__APP_VERSION__}</p>
          <p className="mt-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-accent">Series Tracker</p>
          <p className="mt-1 text-sm font-medium italic">Track your shows, keep your freedom.</p>
          <p className="mx-auto mt-4 max-w-xs text-[11px] leading-snug text-muted">
            This product uses the{' '}
            <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="font-medium underline">TMDB</a>{' '}
            API but is not endorsed or certified by TMDB.
          </p>
          <p className="mx-auto mt-3 max-w-xs text-[11px] leading-snug text-muted">
            Free and open source software, licensed under{' '}
            <a href="https://github.com/rubinog/seriesTracker/blob/main/LICENSE" target="_blank" rel="noreferrer" className="font-medium underline">AGPL-3.0</a>.
            <br />
            Made by{' '}
            <a href="https://github.com/rubinog/seriesTracker" target="_blank" rel="noreferrer" className="font-medium underline">rubinog on GitHub</a>.
          </p>
        </section>
      </div>
    </>
  )
}
