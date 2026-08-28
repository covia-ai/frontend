// components/PageViewTracker.tsx
'use client'

import { useEffect, useRef, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { buildAnalyticsPath, trackPageView } from '@/lib/analytics'

// Re-exported so existing importers (and the test suite) keep their entry
// point; the implementation now lives with the rest of the analytics config.
export { buildAnalyticsPath }

function PageViewTrackerContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // GA4's `config` call emits the page_view for the load that brings gtag in,
  // so the first render here must not send a second one.
  const initialView = useRef(true)

  useEffect(() => {
    if (!pathname) return
    if (initialView.current) {
      initialView.current = false
      return
    }
    const url = buildAnalyticsPath(pathname, searchParams?.toString() ?? '')
    if (url) trackPageView(url, document.title)
  }, [pathname, searchParams])

  return null
}

export default function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <PageViewTrackerContent />
    </Suspense>
  )
}
