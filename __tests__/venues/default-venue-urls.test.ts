import { defaultVenueUrlsFor } from '@/hooks/use-venues';

describe('defaultVenueUrlsFor', () => {
  it('offers only the stable venues in production', () => {
    expect(defaultVenueUrlsFor(true)).toEqual([
      'https://venue-1.covia.ai',
      'https://venue-2.covia.ai',
    ]);
  });

  it('offers the dev, QA and local venues in preview, venue-test first', () => {
    const urls = defaultVenueUrlsFor(false);
    expect(urls).toEqual([
      'https://venue-test.covia.ai',
      'https://venue-3.covia.ai',
      'https://venue-4.covia.ai',
      'http://127.0.0.1:8080',
    ]);
  });

  it('never mixes tiers', () => {
    const prod = new Set(defaultVenueUrlsFor(true));
    expect(defaultVenueUrlsFor(false).some((url) => prod.has(url))).toBe(false);
  });
});
