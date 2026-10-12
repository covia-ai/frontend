import {
  describeToolTurn,
  groupTranscript,
  messageContentSections,
  messageContentToString,
  toolCallArgumentsById,
} from '@/lib/agent-turns';

describe('messageContentSections', () => {
  it('renders a flat all-string envelope as labelled sections, task first, nothing dropped', () => {
    // Stored key order puts expected_output first — the task still leads.
    expect(
      messageContentSections({
        expected_output: 'A per-poem critique with /10 scores',
        task: 'Review the poems',
      }),
    ).toEqual([
      { label: 'Task', text: 'Review the poems' },
      { label: 'Expected output', text: 'A per-poem critique with /10 scores' },
    ]);
  });

  it('declines strings, single-key envelopes, and anything nested or non-string', () => {
    expect(messageContentSections('plain')).toBeNull();
    expect(messageContentSections({ task: 'solo' })).toBeNull(); // unwraps elsewhere
    expect(messageContentSections({ task: 'x', config: { a: 1 } })).toBeNull();
    expect(messageContentSections({ task: 'x', count: 3 })).toBeNull();
    expect(messageContentSections({ task: 'x', note: '  ' })).toBeNull();
    expect(messageContentSections(['a', 'b'])).toBeNull();
    expect(messageContentSections(null)).toBeNull();
  });

  it('humanises snake_case and camelCase keys', () => {
    expect(
      messageContentSections({ maxTokens: 'many', out_dir: 'w/results' }),
    ).toEqual([
      { label: 'Max tokens', text: 'many' },
      { label: 'Out dir', text: 'w/results' },
    ]);
  });
});

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

describe('tool-call credentials', () => {
  const conversation = [
    { role: 'user', content: 'Who am I on GitHub?' },
    {
      role: 'assistant',
      content: '',
      toolCalls: [
        { id: 'call_1', name: 'http_get', arguments: { url: 'https://api.github.com/user', bearerSecret: 's/GITHUB_TOKEN' } },
        // Some providers send arguments as a JSON string.
        { id: 'call_2', name: 'http_get', arguments: '{"url":"https://slack.com/api/auth.test","bearerSecret":"s/SLACK_TOKEN"}' },
        { id: 'call_3', name: 'covia_list', arguments: { path: 'w/' } },
      ],
    },
    { role: 'tool', id: 'call_1', name: 'http_get', structuredContent: { status: 200 } },
    { role: 'tool', id: 'call_2', name: 'http_get', structuredContent: { status: 200 } },
    { role: 'tool', id: 'call_3', name: 'covia_list', structuredContent: { items: [] } },
  ];

  it('maps each call id to its arguments, parsing string arguments', () => {
    const byId = toolCallArgumentsById(conversation);
    expect(byId.get('call_1')).toEqual({ url: 'https://api.github.com/user', bearerSecret: 's/GITHUB_TOKEN' });
    expect(byId.get('call_2')).toEqual({ url: 'https://slack.com/api/auth.test', bearerSecret: 's/SLACK_TOKEN' });
  });

  it('names the connection a tool result used, from its call arguments', () => {
    const byId = toolCallArgumentsById(conversation);
    expect(describeToolTurn(conversation[2], byId).credentials?.map((c) => c.label)).toEqual(['GitHub']);
    expect(describeToolTurn(conversation[3], byId).credentials?.map((c) => c.label)).toEqual(['Slack']);
  });

  it('adds nothing for calls without credentials, unmatched ids, or no lookup', () => {
    const byId = toolCallArgumentsById(conversation);
    expect(describeToolTurn(conversation[4], byId).credentials).toBeUndefined();
    expect(describeToolTurn({ ...conversation[2], id: 'call_missing' }, byId).credentials).toBeUndefined();
    expect(describeToolTurn(conversation[2]).credentials).toBeUndefined();
  });

  it('ignores unparseable string arguments', () => {
    const byId = toolCallArgumentsById([{ role: 'assistant', toolCalls: [{ id: 'x', arguments: '{not json' }] }]);
    expect(byId.get('x')).toBeUndefined();
  });
});
