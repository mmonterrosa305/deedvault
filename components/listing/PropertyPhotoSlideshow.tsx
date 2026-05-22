'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { propertyPhotoSlides, type PropertyPhotoSlide } from '@/lib/listing-details'

function probeImage(src: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = src
  })
}

type Props = {
  address: string | null
  resetKey?: string
}

export default function PropertyPhotoSlideshow({ address, resetKey }: Props) {
  const candidates = useMemo(
    () => (address ? propertyPhotoSlides(address) : []),
    [address]
  )
  const [slides, setSlides] = useState<PropertyPhotoSlide[]>([])
  const [index, setIndex] = useState(0)
  const [probing, setProbing] = useState(false)

  useEffect(() => {
    setIndex(0)
    if (!candidates.length) {
      setSlides([])
      setProbing(false)
      return
    }

    let cancelled = false
    setProbing(true)
    setSlides([])

    ;(async () => {
      const results = await Promise.all(
        candidates.map(async slide => ({
          slide,
          ok: await probeImage(slide.src),
        }))
      )
      if (cancelled) return
      setSlides(results.filter(r => r.ok).map(r => r.slide))
      setIndex(0)
      setProbing(false)
    })()

    return () => {
      cancelled = true
    }
  }, [candidates, resetKey])

  const go = useCallback(
    (delta: number) => {
      if (slides.length < 2) return
      setIndex(i => (i + delta + slides.length) % slides.length)
    },
    [slides.length]
  )

  if (!address) {
    return (
      <p className="font-mono text-xs py-6 text-center" style={{ color: 'var(--muted)' }}>
        No site address on record for property photos.
      </p>
    )
  }

  if (!candidates.length) {
    return (
      <p className="font-mono text-xs py-6 text-center" style={{ color: 'var(--muted)' }}>
        Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for Street View and satellite imagery.
      </p>
    )
  }

  if (probing) {
    return (
      <p className="font-mono text-xs py-6 text-center" style={{ color: 'var(--muted)' }}>
        Loading property photos…
      </p>
    )
  }

  if (!slides.length) {
    return (
      <p className="font-mono text-xs py-6 text-center" style={{ color: 'var(--muted)' }}>
        No Street View or satellite imagery available for this address.
      </p>
    )
  }

  const current = slides[index]
  const showNav = slides.length > 1

  return (
    <div>
      <div
        className="relative rounded-md overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.id}
          src={current.src}
          alt=""
          className="w-full h-48 sm:h-56 object-cover"
        />
        {showNav && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded font-mono text-lg"
              style={{
                background: 'rgba(17,17,17,0.85)',
                border: '1px solid rgba(201,168,76,0.45)',
                color: 'var(--gold)',
                cursor: 'pointer',
              }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded font-mono text-lg"
              style={{
                background: 'rgba(17,17,17,0.85)',
                border: '1px solid rgba(201,168,76,0.45)',
                color: 'var(--gold)',
                cursor: 'pointer',
              }}
            >
              ›
            </button>
          </>
        )}
        <div
          className="absolute bottom-0 left-0 right-0 px-3 py-2"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' }}
        >
          <p className="font-mono text-[10px] tracking-wide" style={{ color: 'var(--gold)' }}>
            {current.label}
          </p>
        </div>
      </div>

      {showNav && (
        <div className="flex justify-center gap-2 mt-3">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${slide.label}`}
              aria-current={i === index ? 'true' : undefined}
              className="rounded-full transition-all"
              style={{
                width: i === index ? 10 : 8,
                height: i === index ? 10 : 8,
                background: i === index ? 'var(--gold)' : 'var(--border-bright)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}

      <p className="font-mono text-xs mt-2" style={{ color: 'var(--muted)' }}>
        Google Maps — {address}
        {slides.length < candidates.length && (
          <span className="block mt-1">
            ({slides.length} of {candidates.length} views available)
          </span>
        )}
      </p>
    </div>
  )
}
