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

  test('a content descriptor with no operation/agent-template fields is an artifact', () => {
    expect(getAssetKind({ content: { inline: 'body' } })).toBe('artifact');
    expect(getAssetKind({ content: { sha256: 'abc' } })).toBe('artifact');
  });

  test('skill.tools marks a skill, even though it also carries content', () => {
    expect(getAssetKind({
      content: { inline: '## Models' },
      skill: { tools: ['v/ops/langchain/models'] },
    })).toBe('skill');
  });

  test('an empty skill.tools list does not count as a skill', () => {
    expect(getAssetKind({ content: { inline: 'body' }, skill: { tools: [] } })).toBe('artifact');
  });

  test('nothing but name/description is a reference', () => {
    expect(getAssetKind({ name: 'x', description: 'y' })).toBe('reference');
    expect(getAssetKind({})).toBe('reference');
  });
});
