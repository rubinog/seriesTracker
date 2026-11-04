import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, defaultSettings, del, post, put, setToken, getToken, type Settings, type Show, type Status, type Watched } from './api'

interface Ctx {
  user: string | null
  ready: boolean
  settings: Settings
  shows: Show[]
  watched: Watched[]
  login: (mode: 'login' | 'register', u: string, p: string) => Promise<void>
  logout: () => void
  reload: () => Promise<void>
  updateSettings: (s: Partial<Settings>) => void
  track: (s: { id: number; name: string; poster: string | null }, status?: Status) => void
  setStatus: (id: number, status: Status) => void
  setRating: (id: number, rating: number | null) => void
  untrack: (id: number) => void
  toggleEpisodes: (id: number, eps: { season: number; episode: number }[], watched: boolean) => void
}

const C = createContext<Ctx>(null!)
export const useStore = () => useContext(C)

function applyTheme(s: Settings) {
  const dark = s.theme === 'dark' || (s.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.setProperty('--accent', s.accent)
}

export function Provider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => {
    try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem('st_settings') || '{}') } } catch { return defaultSettings }
  })
  const [shows, setShows] = useState<Show[]>([])
  const [watched, setWatched] = useState<Watched[]>([])

  useEffect(() => { applyTheme(settings); localStorage.setItem('st_settings', JSON.stringify(settings)) }, [settings])

  const load = useCallback(async () => {
    const [me, lib] = await Promise.all([
      api<{ username: string; settings: Partial<Settings> }>('/me'),
      api<{ shows: Show[]; watched: Watched[] }>('/library'),
    ])
    setUser(me.username)
    if (Object.keys(me.settings).length) setSettings(s => ({ ...s, ...me.settings }))
    setShows(lib.shows)
    setWatched(lib.watched)
  }, [])

  useEffect(() => {
    if (!getToken()) { setReady(true); return }
    load().catch(() => {}).finally(() => setReady(true))
    const onVis = () => document.visibilityState === 'visible' && load().catch(() => {})
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [load])

  const value: Ctx = {
    user, ready, settings, shows, watched,
    reload: load,
    async login(mode, u, p) {
      const r = await post<{ token: string }>(`/auth/${mode}`, { username: u, password: p })
      setToken(r.token)
      await load()
    },
    logout() { setToken(null); setUser(null); setShows([]); setWatched([]) },
    updateSettings(patch) {
      const next = { ...settings, ...patch }
      setSettings(next)
      if (user) put('/me/settings', next).catch(() => {})
    },
    track(s, status = 'watching') {
      const show: Show = { ...s, status, rating: null, updatedAt: Date.now() }
      setShows(l => [...l.filter(x => x.id !== s.id), show])
      put(`/shows/${s.id}`, show).catch(() => {})
    },
    setStatus(id, status) {
      const cur = shows.find(s => s.id === id)
      if (!cur) return
      const next = { ...cur, status, updatedAt: Date.now() }
      setShows(l => l.map(s => (s.id === id ? next : s)))
      put(`/shows/${id}`, next).catch(() => {})
    },
    setRating(id, rating) {
      const cur = shows.find(s => s.id === id)
      if (!cur) return
      const next = { ...cur, rating, updatedAt: Date.now() }
      setShows(l => l.map(s => (s.id === id ? next : s)))
      put(`/shows/${id}`, next).catch(() => {})
    },
    untrack(id) {
      setShows(l => l.filter(s => s.id !== id))
      setWatched(l => l.filter(w => w.id !== id))
      del(`/shows/${id}`).catch(() => {})
    },
    toggleEpisodes(id, eps, w) {
      setWatched(l => {
        const key = (x: { season: number; episode: number }) => `${x.season}x${x.episode}`
        const set = new Set(eps.map(key))
        const rest = l.filter(x => !(x.id === id && set.has(key(x))))
        return w ? [...rest, ...eps.map(e => ({ id, ...e }))] : rest
      })
      post(`/shows/${id}/watched`, { episodes: eps, watched: w }).catch(() => {})
    },
  }

  return <C.Provider value={value}>{children}</C.Provider>
}
