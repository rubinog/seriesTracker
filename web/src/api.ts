export type Status = 'watching' | 'planned' | 'completed' | 'dropped'

export interface Show { id: number; name: string; poster: string | null; status: Status; rating: number | null; updatedAt: number }
export interface Watched { id: number; season: number; episode: number }
export interface Settings { theme: 'light' | 'dark' | 'auto'; accent: string }

export const defaultSettings: Settings = { theme: 'light', accent: '#7657e8' }

const tokenKey = 'st_token'
export const getToken = () => localStorage.getItem(tokenKey)
export const setToken = (t: string | null) => (t ? localStorage.setItem(tokenKey, t) : localStorage.removeItem(tokenKey))

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch('/api' + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
  })
  if (res.status === 401 && getToken()) {
    setToken(null)
    location.reload()
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || 'error')
  return data as T
}

const send = (method: string, body?: unknown): RequestInit => ({ method, body: body ? JSON.stringify(body) : undefined })
export const put = <T,>(p: string, b?: unknown) => api<T>(p, send('PUT', b))
export const post = <T,>(p: string, b?: unknown) => api<T>(p, send('POST', b))
export const del = <T,>(p: string) => api<T>(p, send('DELETE'))

export const img = (path: string | null, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : ''

export interface TmdbShow { id: number; name: string; poster_path: string | null; first_air_date?: string; overview?: string; vote_average?: number; genre_ids?: number[] }
export interface TmdbGenre { id: number; name: string }
export interface TmdbEpisode { episode_number: number; name: string; air_date: string | null; overview: string }
export interface TmdbDetail extends TmdbShow {
  backdrop_path: string | null
  number_of_seasons: number
  seasons: { season_number: number; name: string; episode_count: number }[]
  genres: { name: string }[]
  episode_run_time?: number[]
  last_episode_to_air?: { runtime: number | null } | null
}
