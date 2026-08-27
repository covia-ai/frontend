import { keyNameSuggestions, recentKeyNames, rememberKeyName } from '@/lib/recent-keys';

beforeEach(() => localStorage.clear());

describe('recentKeyNames / rememberKeyName', () => {
  it('remembers newest-first, de-duplicated, capped', () => {
    ['A', 'B', 'A', 'C', 'D', 'E', 'F', 'G'].forEach(rememberKeyName);
    const r = recentKeyNames();
    expect(r[0]).toBe('G');        // newest first
    expect(r).toHaveLength(6);     // capped
    expect(new Set(r).size).toBe(r.length); // de-duplicated
  });

  it('ignores blanks and survives absent storage', () => {
    rememberKeyName('   ');
    expect(recentKeyNames()).toEqual([]);
  });
});

describe('keyNameSuggestions', () => {
  it('groups recent → your keys → common and never repeats a name', () => {
    const groups = keyNameSuggestions({
      recent: ['ANTHROPIC_API_KEY', 'MY_CUSTOM'],
      existing: ['ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY'],
      common: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'],
    });

    const byLabel = Object.fromEntries(groups.map((g) => [g.label, g.names]));
    // ANTHROPIC appears once, in the first group that lists it (Recent).
    expect(byLabel['Recent']).toEqual(['ANTHROPIC_API_KEY', 'MY_CUSTOM']);
    expect(byLabel['Your keys']).toEqual(['DEEPSEEK_API_KEY']);        // ANTHROPIC already taken
    expect(byLabel['Common']).toEqual(['OPENAI_API_KEY']);             // ANTHROPIC already taken
  });

  it('drops empty groups', () => {
    const groups = keyNameSuggestions({ recent: [], existing: [], common: ['OPENAI_API_KEY'] });
    expect(groups.map((g) => g.label)).toEqual(['Common']);
  });
});
