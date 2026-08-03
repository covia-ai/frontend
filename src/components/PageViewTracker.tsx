// components/PageViewTracker.tsx
'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { gtmEvent } from '@/lib/utils'

const SENSITIVE_QUERY_PARAMS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'code',
]);

export function buildAnalyticsPath(pathname: string, rawQuery: string): string | null {
  // Authentication callbacks can carry bearer credentials. Never put any
  // part of those URLs in the analytics data layer.
  if (pathname === '/auth/callback') return null;

  const params = new URLSearchParams(rawQuery);
  for (const key of SENSITIVE_QUERY_PARAMS) params.delete(key);
  const query = params.toString();
  return pathname + (query ? `?${query}` : '');
}

function PageViewTrackerContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      const url = buildAnalyticsPath(pathname, searchParams?.toString() ?? '')
      if (url) gtmEvent.pageView(url, document.title)
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
