import { isPrivateNetworkTarget } from '@/components/AddNewVenueModal';

describe('isPrivateNetworkTarget (frontend#166)', () => {
  it.each([
    'http://localhost:8080',
    'localhost',
    'http://127.0.0.1:8080',
    'http://192.168.1.20:8080',
    'http://10.0.0.5:8080',
    'http://172.16.0.5:8080',
    'my-venue.local',
  ])('flags %s as a private-network target', (value) => {
    expect(isPrivateNetworkTarget(value)).toBe(true);
  });

  it.each([
    'https://venue-3.covia.ai',
    'did:web:venue-3.covia.ai',
    'https://example.com',
    '',
  ])('does not flag %s', (value) => {
    expect(isPrivateNetworkTarget(value)).toBe(false);
  });
});
