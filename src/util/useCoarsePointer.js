import { useEffect, useState } from 'react'

// True when the device's primary pointer is coarse (touch). UA sniffing was
// wrong on tablets and desktop-touch and only ran once at mount; a
// (pointer: coarse) media query covers those cases and re-evaluates if the
// pointer capability changes (e.g. detachable keyboards).
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }
    const mql = window.matchMedia('(pointer: coarse)')
    const update = () => setCoarse(mql.matches)
    update()
    // Safari <14 only supports the deprecated addListener API.
    if (mql.addEventListener) {
      mql.addEventListener('change', update)
      return () => mql.removeEventListener('change', update)
    }
    mql.addListener(update)
    return () => mql.removeListener(update)
  }, [])
  return coarse
}
