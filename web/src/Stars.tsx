// Valore 1-10 (mezze stelle): ogni stella vale 2 punti
export function Stars({ value, onChange, size = 'text-3xl' }: { value: number | null; onChange?: (v: number | null) => void; size?: string }) {
  const v = value ?? 0
  return (
    <div className={`flex items-center gap-0.5 ${size}`} role={onChange ? 'radiogroup' : undefined}>
      {[1, 2, 3, 4, 5].map(i => {
        const fill = v >= i * 2 ? 1 : v >= i * 2 - 1 ? 0.5 : 0
        return (
          <span key={i} className="relative inline-block leading-none text-line">
            ★
            <span className="absolute inset-0 overflow-hidden text-amber-400" style={{ width: `${fill * 100}%` }}>★</span>
            {onChange && (
              <>
                <button aria-label={`${i - 0.5} stelle`} className="absolute inset-y-0 left-0 w-1/2"
                  onClick={() => onChange(value === i * 2 - 1 ? null : i * 2 - 1)} />
                <button aria-label={`${i} stelle`} className="absolute inset-y-0 right-0 w-1/2"
                  onClick={() => onChange(value === i * 2 ? null : i * 2)} />
              </>
            )}
          </span>
        )
      })}
      {value ? <span className="ml-2 text-sm font-semibold text-text">{value / 2}</span> : null}
    </div>
  )
}
