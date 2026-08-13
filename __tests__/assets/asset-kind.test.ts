import { getAssetKind } from '@/lib/asset-kind';

describe('getAssetKind', () => {
  test('an operation with a schema field is "operation"', () => {
    expect(getAssetKind({ operation: { adapter: 'http:image' } })).toBe('operation');
    expect(getAssetKind({ operation: { input: { properties: { a: {} } } } })).toBe('operation');
    expect(getAssetKind({ operation: { output: { properties: { a: {} } } } })).toBe('operation');
    expect(getAssetKind({ operation: { steps: ['a'] } })).toBe('operation');
  });

  test('an operation object with none of adapter/input/output/steps is not "operation"', () => {
    expect(getAssetKind({ operation: {} })).toBe('reference');
  });

  test('an agent template\'s bare transition-op string does not read as an operation', () => {
    expect(getAssetKind({ operation: 'goaltree', skills: ['v/skills'] })).toBe('agent-template');
  });

  test('llmOperation or skills marks an agent template', () => {
    expect(getAssetKind({ llmOperation: 'v/ops/langchain/openai' })).toBe('agent-template');
    expect(getAssetKind({ skills: [] })).toBe('agent-template');
  });

  test('a canonical agent config facet marks an agent template', () => {
    expect(getAssetKind({
      name: 'Reader',
      agent: { config: { tools: ['v/ops/covia/read'] } },
    })).toBe('agent-template');
    expect(getAssetKind({
      name: 'Layered',
      agent: { config: ['v/agents/templates/reader', { model: 'custom' }] },
    })).toBe('agent-template');
  });

  test('a content descriptor with no operation/agent-template fields is an artifact', () => {
    expect(getAssetKind({ content: { inline: 'body' } })).toBe('artifact');
    expect(getAssetKind({ content: { sha256: 'abc' } })).toBe('artifact');
  });

  test('nothing but name/description is a reference', () => {
    expect(getAssetKind({ name: 'x', description: 'y' })).toBe('reference');
    expect(getAssetKind({})).toBe('reference');
  });
});
