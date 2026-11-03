import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, img, type TmdbDetail, type TmdbEpisode } from '../api'
import { useStore } from '../store'
import { Title } from '../ui'

interface ShowData {
  detail: TmdbDetail & { next_episode_to_air?: (TmdbEpisode & { season_number: number }) | null }
  seasons: Record<number, TmdbEpisode[]>
}

const cache = new Map<number, ShowData>()
const today = () => new Date().toISOString().slice(0, 10)

const fmtDate = (d: string) => {
  const diff = Math.round((new Date(d).getTime() - new Date(today()).getTime()) / 864e5)
  if (diff === 0) return 'Oggi'
  if (diff === 1) return 'Domani'
  if (diff < 7) return new Date(d).toLocaleDateString('it-IT', { weekday: 'long' })
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export default function Upcoming() {
  const { shows, watched, toggleEpisodes, setStatus } = useStore()
  const [data, setData] = useState<Record<number, ShowData>>(() => Object.fromEntries(cache))
  const [loading, setLoading] = useState(true)
  const watching = useMemo(() => shows.filter(s => s.status === 'watching' || s.status === 'completed'), [shows])
  const watchingKey = watching.map(s => s.id).join(',')

  useEffect(() => {
    let alive = true
    const run = async () => {
      await Promise.all(watching.map(async s => {
        try {
          const detail = (await api<ShowData['detail']>(`/tmdb/tv/${s.id}?language=it-IT`))
          const mine = watched.filter(w => w.id === s.id)
          const first = detail.seasons.find(x => x.season_number > 0)?.season_number ?? 1
          const from = mine.length ? Math.max(...mine.map(w => w.season)) : first
          const nums = detail.seasons.map(x => x.season_number).filter(n => n > 0 && n >= from)
          const seasons: ShowData['seasons'] = {}
          await Promise.all(nums.map(async n => {
            seasons[n] = (await api<{ episodes: TmdbEpisode[] }>(`/tmdb/tv/${s.id}/season/${n}?language=it-IT`)).episodes
          }))
          cache.set(s.id, { detail, seasons })
          if (alive) setData(d => ({ ...d, [s.id]: { detail, seasons } }))
        } catch { /* serie non raggiungibile: ignorata */ }
      }))
      if (alive) setLoading(false)
    }
    setLoading(true)
    run()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchingKey])

  const { toWatch, soon } = useMemo(() => {
    const toWatch: { id: number; name: string; poster: string | null; season: number; ep: TmdbEpisode; left: number }[] = []
    const soon: { id: number; name: string; poster: string | null; season: number; ep: number; title: string; date: string }[] = []
    for (const s of watching) {
      const d = data[s.id]
      if (!d) continue
      const seen = new Set(watched.filter(w => w.id === s.id).map(w => `${w.season}x${w.episode}`))
      const pending: { season: number; ep: TmdbEpisode }[] = []
      for (const n of Object.keys(d.seasons).map(Number).sort((a, b) => a - b))
        for (const ep of d.seasons[n])
          if (ep.air_date && ep.air_date <= today() && !seen.has(`${n}x${ep.episode_number}`)) pending.push({ season: n, ep })
      if (pending.length) toWatch.push({ id: s.id, name: s.name, poster: s.poster, season: pending[0].season, ep: pending[0].ep, left: pending.length })
      const nx = d.detail.next_episode_to_air
      if (nx?.air_date) soon.push({ id: s.id, name: s.name, poster: s.poster, season: nx.season_number, ep: nx.episode_number, title: nx.name, date: nx.air_date })
    }
    soon.sort((a, b) => a.date.localeCompare(b.date))
    return { toWatch, soon }
  }, [watching, watched, data])

  useEffect(() => {
    for (const x of toWatch) {
      if (shows.find(s => s.id === x.id)?.status === 'completed') setStatus(x.id, 'watching')
    }
  }, [toWatch, shows, setStatus])

  return (
    <>
      <Title>Prossimi episodi</Title>

      {watching.length === 0 && (
        <p className="px-5 pt-10 text-center text-muted">
          Nessuna serie in corso. Aggiungine una da <Link to="/search" className="text-accent">Cerca</Link>.
        </p>
      )}

      {toWatch.length > 0 && (
        <section className="px-5 pb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-tight">
            <span className="h-2 w-2 rounded-full bg-accent" />Da guardare
          </h2>
          <ul className="space-y-3">
            {toWatch.map(x => (
              <li key={x.id} className="flex items-center gap-3 rounded-[1.35rem] border border-line/80 bg-surface/90 p-2.5 shadow-[0_5px_20px_-14px_rgba(27,22,47,.35)] transition-transform duration-200 active:scale-[.99]">
                <Link to={`/show/${x.id}`} className="w-14 shrink-0">
                  {x.poster ? <img src={img(x.poster, 'w154')} alt="" className="aspect-[2/3] w-full rounded-[.9rem] object-cover" />
                    : <div className="aspect-[2/3] w-full rounded-[.9rem] bg-line" />}
                </Link>
                <Link to={`/show/${x.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-bold tracking-tight">{x.name}</p>
                  <p className="truncate text-sm text-muted">S{x.season} · E{x.ep.episode_number} — {x.ep.name}</p>
                  {x.left > 1 && <p className="text-xs text-accent">{x.left} episodi da vedere</p>}
                </Link>
                <button aria-label="Segna come visto"
                  onClick={() => toggleEpisodes(x.id, [{ season: x.season, episode: x.ep.episode_number }], true)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-accent text-lg text-white shadow-md shadow-accent/20 transition-transform active:scale-90">✓</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {soon.length > 0 && (
        <section className="px-5 pb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-tight">
            <span className="h-2 w-2 rounded-full bg-sky-400" />In arrivo
          </h2>
          <ul className="divide-y divide-line/80 overflow-hidden rounded-[1.35rem] border border-line/80 bg-surface/90 shadow-[0_5px_20px_-14px_rgba(27,22,47,.35)]">
            {soon.map(x => (
              <li key={x.id}>
                <Link to={`/show/${x.id}`} className="flex items-center gap-3 p-3.5 transition-colors hover:bg-bg/70">
                  <span className="w-20 shrink-0 text-sm font-bold capitalize text-accent">{fmtDate(x.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{x.name}</span>
                    <span className="block truncate text-xs text-muted">S{x.season} · E{x.ep} — {x.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && watching.length > 0 && toWatch.length === 0 && soon.length === 0 && (
        <p className="px-5 pt-10 text-center text-muted">Sei in pari con tutto 🎉</p>
      )}
      {loading && watching.length > 0 && toWatch.length === 0 && soon.length === 0 && (
        <p className="px-5 pt-10 text-center text-muted">Caricamento…</p>
      )}
    </>
  )
}
