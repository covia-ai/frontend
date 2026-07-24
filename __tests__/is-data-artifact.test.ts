import { isDataArtifact } from '@/lib/asset-metadata';

// The content-addressed store holds every asset kind together; the browse
// pages want only data artifacts. Skills named `models`/`grid`/`workspace`
// were rendering as stray directories, drowning the handful of real artifacts.
describe('isDataArtifact', () => {
  it('keeps genuine data artifacts', () => {
    expect(isDataArtifact({ name: 'Iris Dataset', content: { contentType: 'text/csv' } })).toBe(true);
    // A data asset that stores its bytes out of line still counts — the filter
    // excludes non-artifacts rather than requiring inline content.
    expect(isDataArtifact({ name: 'Hamlet' })).toBe(true);
  });

  it('drops operations — they live on the operations page', () => {
    expect(isDataArtifact({ name: 'Validate Value', operation: { adapter: 'schema:validate' } })).toBe(false);
  });

  it('drops skills — the "models" directories the user saw', () => {
    expect(isDataArtifact({
      name: 'models',
      description: 'Discover which LLM providers are ready…',
      content: { contentType: 'text/markdown' },
      skill: { tools: ['v/ops/langchain/models'] },
    })).toBe(false);
  });

  it('drops agent-config templates', () => {
    expect(isDataArtifact({
      name: 'Reader Agent Template', systemPrompt: 'You read.', llmOperation: 'v/ops/langchain/anthropic',
    })).toBe(false);
    // Either agent-config field is enough to recognise one.
    expect(isDataArtifact({ name: 'x', llmOperation: 'v/ops/langchain/openai' })).toBe(false);
    expect(isDataArtifact({ name: 'x', systemPrompt: 'do a thing' })).toBe(false);
  });

  it('requires a name, and tolerates absent metadata', () => {
    expect(isDataArtifact({ content: {} })).toBe(false);
    expect(isDataArtifact(null)).toBe(false);
    expect(isDataArtifact(undefined)).toBe(false);
  });
});
