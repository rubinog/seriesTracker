import { Link } from 'react-router-dom'
import { img, type Status } from './api'

export const statusLabel: Record<Status, string> = {
  watching: 'In corso', planned: 'Da vedere', completed: 'Completate', dropped: 'Abbandonate',
}

export function Poster({ path, name, className = '' }: { path: string | null; name: string; className?: string }) {
  return path
    ? <img src={img(path)} alt={name} loading="lazy" className={`aspect-[2/3] w-full rounded-[1.15rem] bg-line object-cover shadow-md shadow-black/5 ${className}`} />
    : <div className={`flex aspect-[2/3] w-full items-center justify-center rounded-[1.15rem] bg-line p-2 text-center text-xs text-muted ${className}`}>{name}</div>
}

export function PosterLink({ id, path, name, progress }: { id: number; path: string | null; name: string; progress?: number }) {
  return (
    <Link to={`/show/${id}`} className="group block transition-transform duration-200 active:scale-[.97]">
      <div className="relative">
        <Poster path={path} name={name} className="transition-shadow duration-200 group-hover:shadow-lg group-hover:shadow-black/10" />
        {progress !== undefined && (
          <div className="absolute inset-x-2 bottom-2 h-1.5 overflow-hidden rounded-full bg-black/30">
            <div className="h-full bg-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-1 text-sm font-semibold tracking-tight">{name}</p>
    </Link>
  )
}

export const Title = ({ children }: { children: React.ReactNode }) => (
  <header className="px-5 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
    <p className="mb-1.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-accent">Series tracker</p>
    <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.04em]">{children}</h1>
  </header>
)
