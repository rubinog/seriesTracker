import { useEffect, useMemo, useState } from 'react'
import { api, type Show, type TmdbDetail, type TmdbGenre, type TmdbShow, type Watched } from '../api'
import { useStore } from '../store'
import { PosterLink, Title } from '../ui'

type Tab = 'trending' | 'recommended' | 'filters'

interface Results { results: TmdbShow[] }

interface Filters {
  genre: string
  year: string
  minRating: string
  sort: string
}

const defaultFilters: Filters = { genre: '', year: '', minRating: '', sort: 'popularity.desc' }

async function getRecommendations(shows: Show[], watched: Watched[]) {
  const [genreResponse, details] = await Promise.all([
    api<{ genres: TmdbGenre[] }>('/tmdb/genre/tv/list?language=it-IT'),
    Promise.all(shows.filter(s => s.status !== 'dropped').map(async show => {
      try { return [show, await api<TmdbDetail>(`/tmdb/tv/${show.id}?language=it-IT`)] as const }
      catch { return null }
    })),
  ])
  const episodeCounts = new Map<number, number>()
  for (const ep of watched) episodeCounts.set(ep.id, (episodeCounts.get(ep.id) ?? 0) + 1)

  const scores = new Map<number, number>()
  for (const item of details) {
    if (!item) continue
    const [show, detail] = item
    const ratingWeight = show.rating ? (show.rating / 2) / 3 : 1
    const weight = Math.max(1, episodeCounts.get(show.id) ?? 0) * ratingWeight
    for (const genre of detail.genres) {
      const id = genreResponse.genres.find(g => g.name === genre.name)?.id
      if (id) scores.set(id, (scores.get(id) ?? 0) + weight)
    }
  }

  const genreIds = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id)
  if (!genreIds.length) return { results: [], hasTaste: false }
  const result = await api<Results>(
    `/tmdb/discover/tv?language=it-IT&sort_by=vote_average.desc&vote_count.gte=100&with_genres=${genreIds.join('|')}`,
  )
  return { results: result.results, hasTaste: true }
}

export default function Search() {
  const { shows, watched } = useStore()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('trending')
  const [res, setRes] = useState<TmdbShow[]>([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [hasTaste, setHasTaste] = useState(true)
  const [genres, setGenres] = useState<TmdbGenre[]>([])
  const [genreError, setGenreError] = useState('')
  const [filters, setFilters] = useState<Filters>(defaultFilters)

  const tracked = useMemo(() => new Set(shows.map(s => s.id)), [shows])
  const visible = res.filter(s => !tracked.has(s.id))

  useEffect(() => {
    api<{ genres: TmdbGenre[] }>('/tmdb/genre/tv/list?language=it-IT')
      .then(r => setGenres(r.genres))
      .catch(() => setGenreError('Non riesco a caricare i generi. Riprova tra poco.'))
  }, [])

  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      setLoading(true)
      setErr('')
      try {
        if (tab === 'filters') {
          const params = new URLSearchParams({
            language: 'it-IT',
            sort_by: filters.sort,
            page: '1',
          })
          if (filters.genre) params.set('with_genres', filters.genre)
          if (filters.year) params.set('first_air_date_year', filters.year)
          if (filters.minRating) params.set('vote_average.gte', filters.minRating)
          if (q.trim()) params.set('with_text_query', q.trim())
          const r = await api<Results>(`/tmdb/discover/tv?${params.toString()}`)
          if (active) setRes(r.results)
        } else if (q.trim()) {
          const r = await api<Results>(`/tmdb/search/tv?query=${encodeURIComponent(q.trim())}&language=it-IT`)
          if (active) setRes(r.results)
        } else if (tab === 'trending') {
          const r = await api<Results>('/tmdb/trending/tv/week?language=it-IT')
          if (active) setRes(r.results)
        } else if (tab === 'recommended') {
          const r = await getRecommendations(shows, watched)
          if (active) {
            setRes(r.results)
            setHasTaste(r.hasTaste)
          }
        }
      } catch (e) {
        if (active) setErr((e as Error).message)
      } finally {
        if (active) setLoading(false)
      }
    }, q.trim() ? 300 : 0)
    return () => { active = false; clearTimeout(timer) }
  }, [q, tab, shows, watched, filters])

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(current => ({ ...current, [key]: value }))
  }

  const fieldClass = 'min-w-0 w-full appearance-none rounded-xl border border-line bg-bg/70 px-3 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10'

  return (
    <>
      <Title>Cerca</Title>
      <div className="px-5 pb-4">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca una serie…"
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent" />
      </div>
      <div className="mx-5 mb-5 flex rounded-2xl border border-line/80 bg-surface/75 p-1">
          {([['trending', 'Tendenze'], ['recommended', 'Consigliate'], ['filters', 'Filtri']] as const).map(([value, label]) => (
            <button key={value} onClick={() => setTab(value)}
              className={`flex-1 rounded-xl px-1 py-2 text-xs font-semibold transition-all sm:text-sm ${
                tab === value ? 'bg-accent text-white shadow-sm shadow-accent/20' : 'text-muted'}`}>
              {label}
            </button>
          ))}
      </div>
      {tab === 'filters' && (
        <section className="mx-5 mb-5 rounded-2xl border border-line/80 bg-surface/80 p-4 shadow-sm">
          <div className="mb-3">
            <p className="text-sm font-bold tracking-tight">Affina la ricerca</p>
            <p className="mt-0.5 text-xs text-muted">Combina i filtri. Il testo sopra è facoltativo.</p>
          </div>
          {genreError && <p className="mb-3 text-xs text-red-600">{genreError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Genere</span>
              <select value={filters.genre} onChange={e => updateFilter('genre', e.target.value)} className={fieldClass}>
                <option value="">Tutti i generi</option>
                {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Anno di uscita</span>
              <select value={filters.year} onChange={e => updateFilter('year', e.target.value)} className={fieldClass}>
                <option value="">Qualsiasi anno</option>
                {Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - i).map(y =>
                  <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Voto minimo TMDB</span>
              <select value={filters.minRating} onChange={e => updateFilter('minRating', e.target.value)} className={fieldClass}>
                <option value="">Qualsiasi voto</option>
                {[5, 6, 7, 8, 9].map(n => <option key={n} value={n}>{n}+ / 10</option>)}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Ordina per</span>
              <select value={filters.sort} onChange={e => updateFilter('sort', e.target.value)} className={fieldClass}>
                <option value="popularity.desc">Popolarità</option>
                <option value="vote_average.desc">Voto più alto</option>
                <option value="first_air_date.desc">Più recenti</option>
                <option value="first_air_date.asc">Più vecchie</option>
              </select>
            </label>
          </div>
          <button onClick={() => { setFilters(defaultFilters); setQ('') }}
            className="mt-3 text-xs font-semibold text-accent">Azzera filtri</button>
        </section>
      )}
      {tab === 'trending' && !q.trim() && <p className="px-5 pb-3 text-sm text-muted">In tendenza questa settimana</p>}
      {tab === 'recommended' && !q.trim() && <p className="px-5 pb-3 text-sm text-muted">Scelte in base alle serie che segui e ai tuoi voti</p>}
      {err && <p className="px-5 pb-4 text-sm text-red-600">{err === 'tmdb_key_missing' ? 'Chiave TMDB non configurata sul server.' : 'Non riesco a caricare le serie. Riprova tra poco.'}</p>}
      {loading && <p className="px-5 py-8 text-center text-sm text-muted">Cerco serie per te…</p>}
      {!loading && !err && tab === 'recommended' && !q.trim() && !hasTaste && (
        <p className="px-5 py-8 text-center text-sm text-muted">Aggiungi qualche serie alla tua libreria per ricevere consigli personalizzati.</p>
      )}
      {!loading && !err && (tab !== 'recommended' || q.trim() || hasTaste) && visible.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted">{res.length ? 'Hai già aggiunto tutte queste serie.' : 'Nessun risultato trovato.'}</p>
      )}
      <div className="grid grid-cols-3 gap-x-3 gap-y-5 px-5">
        {visible.map(s => <PosterLink key={s.id} id={s.id} path={s.poster_path} name={s.name} />)}
      </div>
    </>
  )
}
