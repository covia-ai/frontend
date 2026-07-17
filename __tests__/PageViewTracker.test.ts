import { buildAnalyticsPath } from '@/components/PageViewTracker';

describe('buildAnalyticsPath', () => {
  it('never tracks authentication callback URLs', () => {
    expect(buildAnalyticsPath('/auth/callback', 'token=secret&did=did%3Akey%3Aabc')).toBeNull();
  });

  it('removes credential-shaped parameters from other page views', () => {
    expect(
      buildAnalyticsPath('/operations', 'search=echo&token=secret&code=oauth-code'),
    ).toBe('/operations?search=echo');
  });

  it('preserves ordinary query parameters', () => {
    expect(buildAnalyticsPath('/jobs', 'status=STARTED&page=2')).toBe(
      '/jobs?status=STARTED&page=2',
    );
  });
});
