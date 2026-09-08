import { groupSecretsByProvider } from '@/components/SecretList';

describe('groupSecretsByProvider (frontend#166)', () => {
  it('buckets secrets into Connections, LLM providers, and Other', () => {
    const groups = groupSecretsByProvider([
      'GITHUB_TOKEN',
      'ANTHROPIC_API_KEY',
      'MY_CUSTOM_KEY',
      'OPENAI_API_KEY',
    ]);

    expect(groups).toEqual([
      { label: 'Connections', names: ['GITHUB_TOKEN'] },
      { label: 'LLM providers', names: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'] },
      { label: 'Other', names: ['MY_CUSTOM_KEY'] },
    ]);
  });

  it('omits empty groups entirely', () => {
    expect(groupSecretsByProvider(['MY_CUSTOM_KEY'])).toEqual([
      { label: 'Other', names: ['MY_CUSTOM_KEY'] },
    ]);
  });

  it('returns no groups for an empty list', () => {
    expect(groupSecretsByProvider([])).toEqual([]);
  });
});
