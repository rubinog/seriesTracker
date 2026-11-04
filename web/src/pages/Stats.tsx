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

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)

function Card({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub?: string; icon: string }) {
  return (
    <div className="rounded-[1.35rem] border border-line/80 bg-surface/90 p-4 shadow-[0_5px_20px_-14px_rgba(27,22,47,.35)]">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent"><Icon d={icon} /></span>
      <p className="mt-3 text-[1.7rem] font-bold leading-none tracking-tight">{value}</p>
      <p className="mt-1.5 text-xs font-medium text-muted">{label}</p>
      {sub && <p className="text-[11px] text-muted/80">{sub}</p>}
    </div>
  )
}

function Bars({ rows }: { rows: { label: string; value: number; display?: string }[] }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className={`truncate ${i === 0 ? 'font-bold' : 'font-medium'}`}>{r.label}</span>
            <span className="text-xs font-semibold text-muted">{r.display ?? r.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-accent/10">
            <div className={`h-full rounded-full bg-accent transition-all duration-700 ${i === 0 ? '' : 'opacity-60'}`}
              style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

const STATUS_COLORS = ['var(--accent)', '#38bdf8', '#fbbf24', '#cbd5e1']

function Donut({ rows }: { rows: { label: string; value: number }[] }) {
  const total = rows.reduce((a, r) => a + r.value, 0) || 1
  const R = 38, C = 2 * Math.PI * R
  const arcs = rows.map((r, i) => ({ ...r, len: (r.value / total) * C, start: rows.slice(0, i).reduce((a, x) => a + (x.value / total) * C, 0) }))
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="12" className="stroke-accent/10" />
          {arcs.map((a, i) => a.value > 0 && (
            <circle key={a.label} cx="50" cy="50" r={R} fill="none" strokeWidth="12" strokeLinecap="butt"
              stroke={STATUS_COLORS[i]} strokeDasharray={`${Math.max(a.len - 1.5, 0)} ${C}`} strokeDashoffset={-a.start} />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-none">{rows.reduce((a, r) => a + r.value, 0)}</span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">serie</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {rows.map((r, i) => (
          <li key={r.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLORS[i] }} />
            <span className="flex-1 truncate font-medium">{r.label}</span>
            <span className="font-semibold text-muted">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Histogram({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <div className="flex h-36 items-end gap-3">
      {rows.map(r => (
        <div key={r.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-xs font-semibold text-muted">{r.value || ''}</span>
          <div className="w-full rounded-t-xl bg-accent transition-all duration-700"
            style={{ height: `${Math.max((r.value / max) * 100, r.value ? 8 : 3)}%`, opacity: r.value ? 1 : 0.15 }} />
          <span className="text-[11px] font-semibold text-amber-500">{r.label.length}★</span>
        </div>
      ))}
    </div>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="px-5 pb-6">
    <h2 className="mb-3 text-base font-bold tracking-tight">{title}<span className="text-accent">.</span></h2>
    <div className="rounded-[1.35rem] border border-line/80 bg-surface/90 p-4 shadow-[0_5px_20px_-14px_rgba(27,22,47,.35)]">{children}</div>
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
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-accent to-accent/60 p-6 text-white shadow-lg shadow-accent/25">
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/15" />
          <div className="pointer-events-none absolute -bottom-12 right-10 h-28 w-28 rounded-full bg-white/10" />
          <p className="relative text-xs font-semibold uppercase tracking-[0.15em] opacity-80">Tempo davanti allo schermo</p>
          <p className="relative mt-2 text-5xl font-bold leading-none tracking-tight">
            {t.d > 0 && <>{t.d}<span className="mr-2 text-lg font-medium opacity-80">g</span></>}
            {t.h}<span className="mr-2 text-lg font-medium opacity-80">h</span>
            {t.m}<span className="text-lg font-medium opacity-80">min</span>
          </p>
          <p className="relative mt-3 text-xs opacity-80">≈ {(st.minutes / 60).toFixed(0)} ore · stima sulla durata media degli episodi</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Card icon="M5 3l14 9-14 9V3z" label="Episodi visti" value={watched.length} />
          <Card icon="M4 6h16M4 12h16M4 18h10" label="Serie nella lista" value={shows.length} sub={`${completed} completate`} />
          <Card icon="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z" label="Voto medio" value={st.avg ? st.avg.toFixed(1) : '—'} sub={`${st.ratedCount} serie votate`} />
          <Card icon="M12 8v4l3 2M12 3a9 9 0 100 18 9 9 0 000-18z" label="Serie in corso" value={shows.filter(s => s.status === 'watching').length} sub={`${shows.filter(s => s.status === 'planned').length} da vedere`} />
        </div>
      </section>

      {st.genres.length > 0 && (
        <Section title="Generi più guardati">
          <Bars rows={st.genres.map(([g, m]) => ({ label: g, value: m, display: `${Math.round(m / 60)} h` }))} />
        </Section>
      )}

      <Section title="Le tue serie per stato">
        <Donut rows={st.byStatus} />
      </Section>

      {st.topShows.length > 0 && (
        <Section title="Più tempo dedicato">
          <ul className="space-y-3.5">
            {st.topShows.map((x, i) => (
              <li key={x.show!.id}>
                <Link to={`/show/${x.show!.id}`} className="flex items-center gap-3">
                  <span className={`w-5 shrink-0 text-center text-lg font-bold ${i === 0 ? 'text-accent' : 'text-muted/60'}`}>{i + 1}</span>
                  <div className="w-11 shrink-0"><Poster path={x.show!.poster} name={x.show!.name} /></div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold tracking-tight">{x.show!.name}</span>
                    <span className="block text-xs text-muted">{x.n} episodi · {Math.round(x.min / 60)} h</span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-accent/10">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${(x.min / st.topShows[0].min) * 100}%`, opacity: i === 0 ? 1 : 0.6 }} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {st.ratedCount > 0 && (
        <Section title="Distribuzione dei voti">
          <Histogram rows={st.dist} />
          <p className="mt-4 text-xs text-muted">Preferite: <span className="font-semibold text-text">{st.top.map(s => s.name).join(', ')}</span></p>
        </Section>
      )}
    </>
  )
}
