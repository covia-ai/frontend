import { normalizeVenueInput } from '@/lib/utils';

describe('normalizeVenueInput', () => {
  it('passes did:* ids through untouched', () => {
    expect(normalizeVenueInput('did:web:venue-1.covia.ai')).toEqual(['did:web:venue-1.covia.ai']);
    expect(normalizeVenueInput('did:key:z6Mki...')).toEqual(['did:key:z6Mki...']);
  });

  it('honours an explicit scheme and strips trailing slashes', () => {
    expect(normalizeVenueInput('https://venue-1.covia.ai')).toEqual(['https://venue-1.covia.ai']);
    expect(normalizeVenueInput('https://venue-1.covia.ai/')).toEqual(['https://venue-1.covia.ai']);
    expect(normalizeVenueInput('http://example.com:9000')).toEqual(['http://example.com:9000']);
  });

  it('lower-cases an uppercase scheme', () => {
    expect(normalizeVenueInput('HTTPS://venue-1.covia.ai')).toEqual(['https://venue-1.covia.ai']);
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeVenueInput('  https://venue-1.covia.ai  ')).toEqual(['https://venue-1.covia.ai']);
    expect(normalizeVenueInput('   ')).toEqual([]);
    expect(normalizeVenueInput('')).toEqual([]);
  });

  it('uses https only for a bare public host', () => {
    expect(normalizeVenueInput('venue-1.covia.ai')).toEqual(['https://venue-1.covia.ai']);
  });

  it('tries http then https for local hosts (scheme unspecified)', () => {
    expect(normalizeVenueInput('localhost:8080')).toEqual(['http://localhost:8080', 'https://localhost:8080']);
    expect(normalizeVenueInput('127.0.0.1:8080')).toEqual(['http://127.0.0.1:8080', 'https://127.0.0.1:8080']);
    expect(normalizeVenueInput('192.168.1.5:8080')).toEqual(['http://192.168.1.5:8080', 'https://192.168.1.5:8080']);
    expect(normalizeVenueInput('10.0.0.3')).toEqual(['http://10.0.0.3', 'https://10.0.0.3']);
    expect(normalizeVenueInput('172.16.4.2:8080')).toEqual(['http://172.16.4.2:8080', 'https://172.16.4.2:8080']);
    expect(normalizeVenueInput('my-box.local:8080')).toEqual(['http://my-box.local:8080', 'https://my-box.local:8080']);
  });

  it('treats a public IP as https only', () => {
    expect(normalizeVenueInput('20.204.126.163:8080')).toEqual(['https://20.204.126.163:8080']);
  });

  it('does not fall back when an explicit scheme is given (local included)', () => {
    expect(normalizeVenueInput('https://localhost:8080')).toEqual(['https://localhost:8080']);
    expect(normalizeVenueInput('http://localhost:8080')).toEqual(['http://localhost:8080']);
  });
});
