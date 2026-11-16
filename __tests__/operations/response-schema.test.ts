import { classifyResponseShape, declaredResponseSchema, getTableColumns, requestResultValue, valueFitsShape } from '@/lib/response-schema';

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

describe('declaredResponseSchema', () => {
  const schema = { type: 'object', properties: { a: { type: 'string' } } };

  it('reads the contract from an agent request job input (covia#376)', () => {
    expect(declaredResponseSchema({ agentId: 'x', input: 'go', responseSchema: schema, strict: true }))
      .toEqual({ schema, strict: true });
  });

  it('treats a missing or non-true strict as advisory', () => {
    expect(declaredResponseSchema({ responseSchema: schema })).toEqual({ schema, strict: false });
    expect(declaredResponseSchema({ responseSchema: schema, strict: 'yes' })?.strict).toBe(false);
  });

  it('returns null for untyped or malformed inputs', () => {
    expect(declaredResponseSchema({ agentId: 'x', input: 'go' })).toBeNull();
    expect(declaredResponseSchema({ responseSchema: [schema] })).toBeNull();
    expect(declaredResponseSchema({ responseSchema: 'object' })).toBeNull();
    expect(declaredResponseSchema(undefined)).toBeNull();
    expect(declaredResponseSchema('text')).toBeNull();
  });
});

describe('valueFitsShape', () => {
  it('matches tables to arrays and cards to plain objects', () => {
    expect(valueFitsShape('table', [{ a: 1 }])).toBe(true);
    expect(valueFitsShape('table', { a: 1 })).toBe(false);
    expect(valueFitsShape('card', { a: 1 })).toBe(true);
    expect(valueFitsShape('card', [{ a: 1 }])).toBe(false);
    expect(valueFitsShape('card', null)).toBe(false);
  });

  it('never fits a plain-text reply or an unknown shape', () => {
    expect(valueFitsShape('card', 'Done!')).toBe(false);
    expect(valueFitsShape('unknown', { a: 1 })).toBe(false);
  });
});

describe('requestResultValue', () => {
  it('unwraps the value a request job settled with', () => {
    const rows = [{ name: 'Red' }];
    expect(requestResultValue({ id: '0x1', status: 'COMPLETE', output: rows, sessionId: '01' })).toBe(rows);
  });

  it('is undefined for a STARTED snapshot, a failure or a bare value', () => {
    expect(requestResultValue({ id: '0x1', status: 'STARTED', agentId: 'a' })).toBeUndefined();
    expect(requestResultValue({ id: '0x1', status: 'FAILED', error: 'boom' })).toBeUndefined();
    expect(requestResultValue([{ name: 'Red' }])).toBeUndefined();
    expect(requestResultValue('text')).toBeUndefined();
    expect(requestResultValue(undefined)).toBeUndefined();
  });
});

describe('getTableColumns column order', () => {
  it('leads with required columns in their written order, then the rest', () => {
    // As a venue returns it: properties alphabetised, required as written.
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: { description: {}, name: {}, score: {} },
        required: ['name', 'description'],
      },
    };
    expect(getTableColumns(schema, [])).toEqual(['name', 'description', 'score']);
  });

  it('ignores required entries that are not declared properties', () => {
    const schema = { type: 'array', items: { type: 'object', properties: { a: {} }, required: ['zzz', 'a', 7] } };
    expect(getTableColumns(schema, [])).toEqual(['a']);
  });
});
