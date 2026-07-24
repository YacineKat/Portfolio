import { useEffect, useState } from 'react'

function useIntersectionOnce(ref, rootMargin = '200px 0px', threshold = 0.01) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current

    if (!element || isVisible) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [ref, isVisible, rootMargin, threshold])

  return isVisible
}

export default function useDeferredGsapReveal({
  rootRef,
  selectors,
  enabled = true,
  rootMargin = '200px 0px',
  threshold = 0.01,
  staggerStep = 0.04,
  duration = 0.9,
  reducedDuration = 0.45,
  reducedY = 18,
  normalY = 46,
  ease = 'power3.out',
  reducedEase = 'power1.out',
  start = 'top 86%',
  reducedStart = 'top 90%'
}) {
  const isVisible = useIntersectionOnce(rootRef, rootMargin, threshold)

  useEffect(() => {
    const root = rootRef.current

    if (!enabled || !isVisible || !root) {
      return undefined
    }

    let cancelled = false
    let cleanup = () => {}

    const scheduleIdleTask = window.requestIdleCallback
      ? (task) => window.requestIdleCallback(task, { timeout: 1200 })
      : (task) => window.setTimeout(task, 0)

    const cancelIdleTask = window.cancelIdleCallback
      ? (id) => window.cancelIdleCallback(id)
      : (id) => window.clearTimeout(id)

    const idleId = scheduleIdleTask(async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger')
      ])

      if (cancelled || !rootRef.current) {
        return
      }

      gsap.registerPlugin(ScrollTrigger)

      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: reduce)', () => {
        selectors.forEach((selector) => {
          rootRef.current.querySelectorAll(selector).forEach((element) => {
            gsap.fromTo(
              element,
              { autoAlpha: 0, y: reducedY },
              {
                autoAlpha: 1,
                y: 0,
                duration: reducedDuration,
                ease: reducedEase,
                scrollTrigger: {
                  trigger: element,
                  start: reducedStart,
                  once: true
                }
              }
            )
          })
        })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        selectors.forEach((selector) => {
          rootRef.current.querySelectorAll(selector).forEach((element, index) => {
            gsap.fromTo(
              element,
              { autoAlpha: 0, y: normalY },
              {
                autoAlpha: 1,
                y: 0,
                duration,
                ease,
                delay: Math.min(index * staggerStep, 0.2),
                scrollTrigger: {
                  trigger: element,
                  start,
                  once: true
                }
              }
            )
          })
        })
      })

      cleanup = () => mm.revert()
    })

    return () => {
      cancelled = true
      cancelIdleTask(idleId)
      cleanup()
    }
  }, [
    enabled,
    isVisible,
    rootRef,
    selectors,
    staggerStep,
    duration,
    reducedDuration,
    reducedY,
    normalY,
    ease,
    reducedEase,
    start,
    reducedStart
  ])
}