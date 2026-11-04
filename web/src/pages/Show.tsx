import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, img, type Status, type TmdbDetail, type TmdbEpisode } from '../api'
import { useStore } from '../store'
import { statusLabel } from '../ui'
import { Stars } from '../Stars'
import { usePosterColor } from '../color'

export default function ShowPage() {
  const id = Number(useParams().id)
  const nav = useNavigate()
  const { shows, watched, track, setStatus, setRating, untrack, toggleEpisodes } = useStore()
  const [d, setD] = useState<TmdbDetail | null>(null)
  const [season, setSeason] = useState(1)
  const [seasonEpisodes, setSeasonEpisodes] = useState<Record<number, TmdbEpisode[]>>({})
  const [episodesError, setEpisodesError] = useState('')
  const mine = shows.find(s => s.id === id)
  const tint = usePosterColor(d?.poster_path ? img(d.poster_path, 'w92') : null)
  const eps = seasonEpisodes[season] ?? []

  useEffect(() => {
    let active = true
    setD(null)
    setSeasonEpisodes({})
    setEpisodesError('')
    api<TmdbDetail>(`/tmdb/tv/${id}?language=it-IT`).then(x => {
      if (!active) return
      setD(x)
      const first = x.seasons.find(s => s.season_number > 0)
      if (first) setSeason(first.season_number)
      return Promise.all(x.seasons.filter(s => s.season_number > 0).map(async s => {
        const r = await api<{ episodes: TmdbEpisode[] }>(`/tmdb/tv/${id}/season/${s.season_number}?language=it-IT`)
        return [s.season_number, r.episodes] as const
      }))
    }).then(entries => {
      if (active && entries) setSeasonEpisodes(Object.fromEntries(entries))
    }).catch(error => {
      if (active) setEpisodesError((error as Error).message)
    })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (!d || !Object.keys(seasonEpisodes).length) return
    const aired = Object.entries(seasonEpisodes).flatMap(([s, episodes]) =>
      episodes.filter(e => e.air_date && e.air_date <= new Date().toISOString().slice(0, 10))
        .map(e => `${s}x${e.episode_number}`))
    if (!aired.length) return
    const seen = new Set(watched.filter(w => w.id === id).map(w => `${w.season}x${w.episode}`))
    const caughtUp = aired.every(key => seen.has(key))
    if (caughtUp && mine?.status !== 'completed') setStatus(id, 'completed')
  }, [d, seasonEpisodes, watched, id, mine?.status, setStatus])

  if (!d) return <p className="p-10 text-center text-muted">Caricamento…</p>

  const seen = new Set(watched.filter(w => w.id === id && w.season === season).map(w => w.episode))
  const aired = eps.filter(e => e.air_date && e.air_date <= new Date().toISOString().slice(0, 10))
  const allSeen = aired.length > 0 && aired.every(e => seen.has(e.episode_number))
  const ensureTracked = () => { if (!mine) track({ id, name: d.name, poster: d.poster_path }) }

  return (
    <div style={tint ? ({ '--accent': tint } as React.CSSProperties) : undefined} className="min-h-full transition-colors duration-500">
      <div className="relative h-56 bg-line">
        {d.backdrop_path && <img src={img(d.backdrop_path, 'w780')} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-transparent" />
        <div className="absolute inset-0 bg-accent/20 mix-blend-multiply" />
        <button onClick={() => nav(-1)} className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] rounded-full bg-surface/90 px-3.5 py-1.5 text-sm shadow">← Indietro</button>
      </div>
      <div className="-mt-10 px-5">
        <h1 className="text-3xl font-bold tracking-tight">{d.name}<span className="text-accent">.</span></h1>
        <p className="mt-1 text-sm text-muted">
          {d.first_air_date?.slice(0, 4)} · {d.number_of_seasons} stagioni · {d.genres.map(g => g.name).join(', ')}
        </p>

        <div className="mt-4 flex items-center gap-2">
          {mine ? (
            <>
              {mine.status === 'completed' ? (
                <div className="flex-1 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 font-medium text-accent">
                  Completata · sei in pari
                </div>
              ) : (
                <select value={mine.status} onChange={e => setStatus(id, e.target.value as Status)}
                  className="flex-1 rounded-2xl border border-line bg-surface px-4 py-3 font-medium">
                  {(Object.keys(statusLabel) as Status[]).filter(s => s !== 'completed').map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
              )}
              <button onClick={() => { untrack(id); nav(-1) }} className="rounded-2xl border border-line px-4 py-3 text-muted">Rimuovi</button>
            </>
          ) : (
            <button onClick={ensureTracked} className="flex-1 rounded-2xl bg-accent py-3 font-semibold text-white">+ Aggiungi alle mie serie</button>
          )}
        </div>

        {mine && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
            <span className="text-sm font-medium text-muted">Il tuo voto</span>
            <Stars value={mine.rating} onChange={r => setRating(id, r)} size="text-2xl" />
          </div>
        )}

        {d.overview && <p className="mt-4 text-sm leading-relaxed">{d.overview}</p>}

        <div className="mt-6 flex gap-2 overflow-x-auto">
          {d.seasons.filter(s => s.season_number > 0).map(s => (
            <button key={s.season_number} onClick={() => setSeason(s.season_number)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${
                season === s.season_number ? 'bg-accent text-white' : 'border border-line bg-surface text-muted'}`}>
              Stagione {s.season_number}
            </button>
          ))}
        </div>

        {episodesError && <p className="mt-4 text-sm text-red-600">Impossibile caricare gli episodi: {episodesError}</p>}

        <button
          className="mt-4 text-sm font-medium text-accent"
          onClick={() => { ensureTracked(); toggleEpisodes(id, aired.map(e => ({ season, episode: e.episode_number })), !allSeen) }}>
          {allSeen ? 'Segna tutta la stagione come non vista' : 'Segna tutta la stagione come vista'}
        </button>

        <ul className="mt-2 divide-y divide-line">
          {eps.map(e => {
            const on = seen.has(e.episode_number)
            return (
              <li key={e.episode_number}>
                <button className="flex w-full items-center gap-3 py-3 text-left"
                  onClick={() => { ensureTracked(); toggleEpisodes(id, [{ season, episode: e.episode_number }], !on) }}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm transition-colors ${
                    on ? 'border-accent bg-accent text-white' : 'border-line text-transparent'}`}>✓</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.episode_number}. {e.name}</span>
                    <span className="block text-xs text-muted">{e.air_date ?? 'Data da definire'}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
