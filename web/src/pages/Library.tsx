import { useState } from 'react'
import { useStore } from '../store'
import { PosterLink, Title, statusLabel } from '../ui'
import type { Status } from '../api'

const order: Status[] = ['watching', 'planned', 'completed', 'dropped']

export default function Library() {
  const { shows, watched } = useStore()
  const [tab, setTab] = useState<Status>('watching')
  const list = shows.filter(s => s.status === tab).sort((a, b) => b.updatedAt - a.updatedAt)
  return (
    <>
      <Title>Le mie serie</Title>
      <div className="mx-5 mb-4 flex rounded-2xl border border-line/80 bg-surface/75 p-1">
        {order.map(s => (
          <button key={s} onClick={() => setTab(s)}
            className={`flex-1 whitespace-nowrap rounded-xl px-1 py-2 text-xs font-semibold transition-all ${
              tab === s ? 'bg-accent text-white shadow-sm shadow-accent/20' : 'text-muted'}`}>
            {statusLabel[s]} <span className="opacity-70">{shows.filter(x => x.status === s).length}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="px-5 pt-10 text-center text-muted">Nessuna serie qui. Usa “Cerca” per aggiungerne.</p>
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 px-5">
          {list.map(s => (
            <div key={s.id}>
              <PosterLink id={s.id} path={s.poster} name={s.name} />
              <p className="mt-1 text-xs text-muted">
                {watched.filter(w => w.id === s.id).length} ep. visti
                {s.rating ? <span className="ml-1 text-amber-500">★ {s.rating / 2}</span> : null}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
