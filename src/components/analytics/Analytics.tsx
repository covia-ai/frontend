'use client'

import { useEffect } from 'react'
import { initAnalytics } from '@/lib/analytics'

/**
 * Boots GA4 + PostHog once the user has granted analytics consent, and keeps
 * them in step with later consent changes (D070 §5.1).
 *
 * Nothing loads on mount by itself: `initAnalytics` declines outright under
 * Do Not Track, off the two production hosts, and until consent exists.
 */
export function Analytics() {
  useEffect(() => initAnalytics(), [])
  return null
}
