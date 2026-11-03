import { useEffect, useState } from 'react'

const cache = new Map<string, string>()

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (!d) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h * 60 + 360) % 360, s, l]
}

// Colore dominante pesato sulla saturazione, scurito per garantire contrasto con il testo bianco
export function extractColor(img: HTMLImageElement): string | null {
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, 32, 32)
  let data: Uint8ClampedArray
  try { data = ctx.getImageData(0, 0, 32, 32).data } catch { return null }
  const buckets = new Map<number, { w: number; r: number; g: number; b: number }>()
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    const [h, s, l] = rgbToHsl(r, g, b)
    if (l < 0.15 || l > 0.9 || s < 0.2) continue
    const w = s * (1 - Math.abs(2 * l - 1))
    const k = Math.floor(h / 20)
    const e = buckets.get(k) ?? { w: 0, r: 0, g: 0, b: 0 }
    e.w += w; e.r += r * w; e.g += g * w; e.b += b * w
    buckets.set(k, e)
  }
  let best: { w: number; r: number; g: number; b: number } | null = null
  for (const e of buckets.values()) if (!best || e.w > best.w) best = e
  if (!best) return null
  const [h, s, l] = rgbToHsl(best.r / best.w, best.g / best.w, best.b / best.w)
  return `hsl(${Math.round(h)} ${Math.round(Math.min(s, 0.75) * 100)}% ${Math.round(Math.min(l, 0.42) * 100)}%)`
}

export function usePosterColor(url: string | null): string | null {
  const [color, setColor] = useState<string | null>(url ? cache.get(url) ?? null : null)
  useEffect(() => {
    if (!url) { setColor(null); return }
    const hit = cache.get(url)
    if (hit) { setColor(hit); return }
    let alive = true
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => {
      const c = extractColor(im)
      if (c) cache.set(url, c)
      if (alive) setColor(c)
    }
    im.src = url
    return () => { alive = false }
  }, [url])
  return color
}
