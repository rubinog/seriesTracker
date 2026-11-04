import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useStore } from './store'
import Library from './pages/Library'
import Upcoming from './pages/Upcoming'
import Stats from './pages/Stats'
import Search from './pages/Search'
import ShowPage from './pages/Show'
import SettingsPage from './pages/Settings'

function Login() {
  const { login } = useStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const field = 'w-full rounded-xl border border-line bg-bg/70 px-4 py-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10'
  return (
    <form
      className="mx-5 flex min-h-full flex-col justify-center gap-3 rounded-[2rem] border border-line/80 bg-surface/90 p-7 shadow-[0_20px_70px_-30px_rgba(27,22,47,.3)] backdrop-blur sm:mx-auto sm:w-full sm:max-w-sm"
      onSubmit={async e => {
        e.preventDefault()
        setErr('')
        try { await login(mode, u, p) } catch (x) {
          const m = (x as Error).message
          setErr(({
            invalid_credentials: 'Username o password errati.',
            too_many_attempts: 'Troppi tentativi. Riprova tra qualche minuto.',
            username_taken: 'Username già in uso.',
            signup_disabled: 'Le registrazioni sono disattivate.',
          } as Record<string, string>)[m] ?? 'Impossibile completare la richiesta. Controlla i dati inseriti.')
        }
      }}
    >
      <img src="/icon-192.png" alt="" className="mb-2 h-16 w-16 rounded-2xl shadow-md shadow-black/10" />
      <h1 className="text-4xl font-bold tracking-tight">Serie<span className="text-accent">.</span></h1>
      <p className="mb-4 text-muted">Track your shows, keep your freedom.</p>
      <input className={field} placeholder="Username" autoCapitalize="none" value={u} onChange={e => setU(e.target.value)} />
      <input className={field} type="password" placeholder="Password (min 8)" value={p} onChange={e => setP(e.target.value)} />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="rounded-xl bg-accent py-3 font-semibold text-white shadow-lg shadow-accent/20 transition active:scale-[.98]">
        {mode === 'login' ? 'Accedi' : 'Crea account'}
      </button>
      <button type="button" className="text-sm text-muted" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
      </button>
    </form>
  )
}

const tabs = [
  { to: '/', label: 'Prossimi', icon: 'play' },
  { to: '/library', label: 'Le mie', icon: 'library' },
  { to: '/search', label: 'Cerca', icon: 'search' },
  { to: '/stats', label: 'Statistiche', icon: 'stats' },
  { to: '/settings', label: 'Altro', icon: 'settings' },
]

function TabIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    play: <path d="m9 6 10 6-10 6V6Z" />,
    library: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4 4" /></>,
    stats: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /></>,
    settings: <><path d="M4 7h16M4 12h16M4 17h16" /><circle cx="8" cy="7" r="2" fill="var(--surface)" /><circle cx="15" cy="12" r="2" fill="var(--surface)" /><circle cx="10" cy="17" r="2" fill="var(--surface)" /></>,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[1.2rem] w-[1.2rem]">{paths[name]}</svg>
}

export default function App() {
  const { user, ready } = useStore()
  if (!ready) return null
  if (!user) return <Login />
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <main className="flex-1 overflow-y-auto pb-28">
        <Routes>
          <Route path="/" element={<Upcoming />} />
          <Route path="/library" element={<Library />} />
          <Route path="/search" element={<Search />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/show/:id" element={<ShowPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <nav aria-label="Navigazione principale" className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-2xl px-4 pb-[max(.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg items-center rounded-[1.6rem] border border-white/70 bg-surface/90 p-1.5 shadow-[0_12px_40px_-12px_rgba(27,22,47,.25)] backdrop-blur-xl dark:border-white/10">
          {tabs.map(t => (
            <NavLink key={t.to} to={t.to} end className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1.2rem] px-1 py-2 transition-all duration-200 ${
                isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-bg hover:text-text'}`}>
              <TabIcon name={t.icon} />
              <span className="text-[0.62rem] font-semibold leading-none sm:text-xs">{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
