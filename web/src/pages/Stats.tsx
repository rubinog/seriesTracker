import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type TmdbDetail } from '../api'
import { useStore } from '../store'
import { Poster, Title, statusLabel } from '../ui'

interface Meta { genres: string[]; runtime: number }
const metaCache = new Map<number, Meta>()
const DEFAULT_RUNTIME = 40

const fmtDuration = (min: number) => {
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = Math.round(min % 60)
  return { d, h, m }
}

function Card({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  )
}

function Bars({ rows }: { rows: { label: string; value: number; display?: string }[] }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <ul className="space-y-2.5">
      {rows.map(r => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="truncate">{r.label}</span>
            <span className="text-muted">{r.display ?? r.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="px-5 pb-6">
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
    <div className="rounded-2xl border border-line bg-surface p-4">{children}</div>
  </section>
)

export default function Stats() {
  const { shows, watched } = useStore()
  const [meta, setMeta] = useState<Record<number, Meta>>(() => Object.fromEntries(metaCache))
  const idsKey = shows.map(s => s.id).join(',')

  useEffect(() => {
    let alive = true
    shows.filter(s => !metaCache.has(s.id)).forEach(async s => {
      try {
        const d = await api<TmdbDetail>(`/tmdb/tv/${s.id}?language=it-IT`)
        const m: Meta = {
          genres: d.genres.map(g => g.name),
          runtime: d.episode_run_time?.[0] || d.last_episode_to_air?.runtime || DEFAULT_RUNTIME,
        }
        metaCache.set(s.id, m)
        if (alive) setMeta(x => ({ ...x, [s.id]: m }))
      } catch { /* metadati non disponibili: si usa la durata di default */ }
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  const st = useMemo(() => {
    const runtimeOf = (id: number) => meta[id]?.runtime ?? DEFAULT_RUNTIME
    const perShow = new Map<number, number>()
    let minutes = 0
    for (const w of watched) {
      perShow.set(w.id, (perShow.get(w.id) ?? 0) + 1)
      minutes += runtimeOf(w.id)
    }

    const genreMin = new Map<string, number>()
    for (const [id, n] of perShow)
      for (const g of meta[id]?.genres ?? []) genreMin.set(g, (genreMin.get(g) ?? 0) + n * runtimeOf(id))
    const genres = [...genreMin].sort((a, b) => b[1] - a[1]).slice(0, 8)

    const byStatus = (['watching', 'planned', 'completed', 'dropped'] as const).map(s => ({
      label: statusLabel[s], value: shows.filter(x => x.status === s).length,
    }))

    const rated = shows.filter(s => s.rating)
    const avg = rated.length ? rated.reduce((a, s) => a + s.rating!, 0) / rated.length / 2 : null
    const dist = [1, 2, 3, 4, 5].map(n => ({
      label: '★'.repeat(n), value: rated.filter(s => Math.ceil(s.rating! / 2) === n).length,
    }))
    const top = [...rated].sort((a, b) => b.rating! - a.rating!).slice(0, 3)

    const topShows = [...perShow].sort((a, b) => b[1] * runtimeOf(b[0]) - a[1] * runtimeOf(a[0])).slice(0, 5)
      .map(([id, n]) => ({ show: shows.find(s => s.id === id), n, min: n * runtimeOf(id) }))
      .filter(x => x.show)

    return { minutes, genres, byStatus, avg, ratedCount: rated.length, dist, top, topShows }
  }, [shows, watched, meta])

  if (!shows.length)
    return (
      <>
        <Title>Statistiche</Title>
        <p className="px-5 pt-10 text-center text-muted">Aggiungi qualche serie da <Link to="/search" className="text-accent">Cerca</Link> per vedere le statistiche.</p>
      </>
    )

  const t = fmtDuration(st.minutes)
  const completed = shows.filter(s => s.status === 'completed').length

  return (
    <>
      <Title>Statistiche</Title>

      <section className="px-5 pb-6">
        <div className="rounded-3xl bg-accent p-5 text-white shadow-md">
          <p className="text-sm font-medium opacity-80">Tempo passato a guardare serie</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">
            {t.d > 0 && <>{t.d}<span className="text-lg font-medium opacity-80">g </span></>}
            {t.h}<span className="text-lg font-medium opacity-80">h </span>
            {t.m}<span className="text-lg font-medium opacity-80">min</span>
          </p>
          <p className="mt-1 text-sm opacity-80">≈ {(st.minutes / 60).toFixed(0)} ore · stima sulla durata media degli episodi</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Card label="Episodi visti" value={watched.length} />
          <Card label="Serie nella lista" value={shows.length} sub={`${completed} completate`} />
          <Card label="Voto medio" value={st.avg ? `★ ${st.avg.toFixed(1)}` : '—'} sub={`${st.ratedCount} serie votate`} />
          <Card label="Serie in corso" value={shows.filter(s => s.status === 'watching').length} sub={`${shows.filter(s => s.status === 'planned').length} da vedere`} />
        </div>
      </section>

      {st.genres.length > 0 && (
        <Section title="Generi più guardati">
          <Bars rows={st.genres.map(([g, m]) => ({ label: g, value: m, display: `${Math.round(m / 60)} h` }))} />
        </Section>
      )}

      <Section title="Le tue serie per stato">
        <Bars rows={st.byStatus} />
      </Section>

      {st.topShows.length > 0 && (
        <Section title="Più tempo dedicato">
          <ul className="space-y-3">
            {st.topShows.map(x => (
              <li key={x.show!.id}>
                <Link to={`/show/${x.show!.id}`} className="flex items-center gap-3">
                  <div className="w-10 shrink-0"><Poster path={x.show!.poster} name={x.show!.name} /></div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{x.show!.name}</span>
                    <span className="block text-xs text-muted">{x.n} episodi · {Math.round(x.min / 60)} h</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {st.ratedCount > 0 && (
        <Section title="Distribuzione dei voti">
          <Bars rows={st.dist} />
          <p className="mt-4 text-xs text-muted">Preferite: {st.top.map(s => s.name).join(', ')}</p>
        </Section>
      )}
    </>
  )
}
