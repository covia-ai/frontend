import { describeToolTurn, groupTranscript, messageContentToString } from '@/lib/agent-turns';

describe('messageContentToString', () => {
  it('passes a string through', () => {
    expect(messageContentToString('hello')).toBe('hello');
  });
  it('unwraps a single-string envelope', () => {
    expect(messageContentToString({ task: 'do the thing' })).toBe('do the thing');
    expect(messageContentToString({ message: 'hi' })).toBe('hi');
  });
  it('renders anything more structured as JSON, never dropping fields', () => {
    expect(messageContentToString({ a: 1, b: 'x' })).toBe(JSON.stringify({ a: 1, b: 'x' }, null, 2));
  });
  it('is empty for nullish', () => {
    expect(messageContentToString(null)).toBe('');
    expect(messageContentToString(undefined)).toBe('');
  });
});

describe('describeToolTurn', () => {
  it('renders a successful tool result from structuredContent', () => {
    // The bug: a success has no `content`, so the old renderer showed nothing.
    const turn = describeToolTurn({
      role: 'tool', name: 'auth_whoami',
      structuredContent: { authenticated: true, caller: 'did:key:zX' },
    });
    expect(turn.isError).toBe(false);
    expect(turn.name).toBe('auth_whoami');
    expect(turn.text).toContain('authenticated');
    expect(turn.text).not.toBe('');
  });

  it('flags a tool result that errored', () => {
    const turn = describeToolTurn({
      role: 'tool', name: 'grid_run',
      content: 'Error: covia.exception.JobFailedException: Capability denied',
    });
    expect(turn.isError).toBe(true);
    expect(turn.text).toContain('Capability denied');
  });

  it('treats a system turn as a failure', () => {
    const turn = describeToolTurn({ role: 'system', content: "Tool call 'grid_run' failed: ..." });
    expect(turn.isError).toBe(true);
  });

  it('does not flag a successful string result as an error', () => {
    const turn = describeToolTurn({ role: 'tool', name: 'covia_read', content: 'the value is 42' });
    expect(turn.isError).toBe(false);
    expect(turn.text).toBe('the value is 42');
  });
});

describe('groupTranscript', () => {
  it('collapses a run of consecutive tool turns into one group', () => {
    const conversation = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: '' },
      { role: 'tool', name: 'skill_load' },
      { role: 'tool', name: 'covia_list' },
      { role: 'tool', name: 'covia_list' },
      { role: 'assistant', content: 'done' },
    ];
    const items = groupTranscript(conversation);
    expect(items.map((i) => i.kind)).toEqual(['message', 'toolGroup', 'message']);
    const group = items[1];
    if (group.kind !== 'toolGroup') throw new Error('expected toolGroup');
    expect(group.messages).toHaveLength(3);
  });

  it('does not let an empty assistant "decide to call a tool" turn split a run of tool calls', () => {
    // A real agent loop turn interleaves an empty assistant turn before each
    // tool call: assistant(empty) -> tool -> assistant(empty) -> tool -> ...
    // That empty turn renders nothing, so it must not break the group.
    const conversation = [
      { role: 'assistant', content: '' },
      { role: 'tool', name: 'skill_load' },
      { role: 'assistant', content: '' },
      { role: 'tool', name: 'covia_write' },
      { role: 'assistant', content: 'Done.' },
    ];
    const items = groupTranscript(conversation);
    expect(items.map((i) => i.kind)).toEqual(['toolGroup', 'message']);
    const group = items[0];
    if (group.kind !== 'toolGroup') throw new Error('expected toolGroup');
    expect(group.messages).toHaveLength(2);
  });

  it('keeps a single tool turn as its own group, not merged with neighbors', () => {
    const conversation = [
      { role: 'tool', name: 'auth_whoami' },
      { role: 'assistant', content: 'ok' },
      { role: 'tool', name: 'grid_run' },
    ];
    const items = groupTranscript(conversation);
    expect(items).toHaveLength(3);
    expect(items[0].kind).toBe('toolGroup');
    expect(items[2].kind).toBe('toolGroup');
  });

  it('does not drop a user "task" turn even though it carries no text', () => {
    const conversation = [
      { role: 'user', content: '', source: 'request' },
      { role: 'tool', name: 'grid_run' },
    ];
    const items = groupTranscript(conversation);
    expect(items.map((i) => i.kind)).toEqual(['message', 'toolGroup']);
  });

  it('returns an empty list for an empty conversation', () => {
    expect(groupTranscript([])).toEqual([]);
  });
});
