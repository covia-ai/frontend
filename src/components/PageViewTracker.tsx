// components/PageViewTracker.tsx
'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { gtmEvent } from '@/lib/utils'

function PageViewTrackerContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
      gtmEvent.pageView(url, document.title)
    }
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