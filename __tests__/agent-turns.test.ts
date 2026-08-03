import { describeToolTurn, messageContentToString } from '@/lib/agent-turns';

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
