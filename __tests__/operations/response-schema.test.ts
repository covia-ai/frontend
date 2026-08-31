import { classifyResponseShape, getTableColumns } from '@/lib/response-schema';

describe('classifyResponseShape', () => {
  it('classifies an array-of-objects schema as "table"', () => {
    const schema = { type: 'array', items: { type: 'object', properties: { a: { type: 'string' } } } };
    expect(classifyResponseShape(schema)).toBe('table');
  });

  it('classifies a flat object schema as "card"', () => {
    const schema = { type: 'object', properties: { a: { type: 'string' } } };
    expect(classifyResponseShape(schema)).toBe('card');
  });

  it('classifies an array of primitives as "unknown"', () => {
    const schema = { type: 'array', items: { type: 'string' } };
    expect(classifyResponseShape(schema)).toBe('unknown');
  });

  it('classifies an object schema with no properties as "unknown"', () => {
    expect(classifyResponseShape({ type: 'object' })).toBe('unknown');
  });

  it('classifies null/non-object/undefined schemas as "unknown"', () => {
    expect(classifyResponseShape(null)).toBe('unknown');
    expect(classifyResponseShape(undefined)).toBe('unknown');
    expect(classifyResponseShape('not a schema')).toBe('unknown');
  });
});

describe('getTableColumns', () => {
  it('prefers the schema-declared property keys, in order', () => {
    const schema = {
      type: 'array',
      items: { type: 'object', properties: { b: { type: 'string' }, a: { type: 'number' } } },
    };
    expect(getTableColumns(schema, [{ a: 1, b: 'x' }])).toEqual(['b', 'a']);
  });

  it('falls back to the union of keys found in the data when the schema has no properties', () => {
    const schema = { type: 'array', items: { type: 'object' } };
    const rows = [{ a: 1 }, { a: 2, b: 3 }];
    expect(getTableColumns(schema, rows)).toEqual(['a', 'b']);
  });

  it('returns no columns for an empty data set with no schema properties', () => {
    expect(getTableColumns({ type: 'array', items: { type: 'object' } }, [])).toEqual([]);
  });
});
