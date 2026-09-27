import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const ORIGIN = 'https://medhyx.com';
const env = { ANTHROPIC_API_KEY: 'test-key' };
let captured;
let pending;

function sse(events) {
  const body = events.map(e => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream', 'request-id': 'req_test' } });
}

const okStream = () => sse([
  { type: 'message_start', message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-haiku-4-5', content: [], stop_reason: null, usage: { input_tokens: 10, output_tokens: 0 } } },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Medhyx offers ' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '**lakehouse** engineering.' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 6 } },
  { type: 'message_stop' },
]);

beforeEach(() => {
  captured = [];
  pending = [];
  globalThis.fetch = async (url, init) => {
    captured.push({ url: String(url), init, body: JSON.parse(init.body) });
    return okStream();
  };
});

const ctx = { waitUntil: p => pending.push(p) };

function chat(messages, { origin = ORIGIN, method = 'POST', envOverride = env } = {}) {
  const req = new Request('https://medhyx-ai.example.workers.dev/', {
    method,
    headers: { 'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': '1.2.3.4' },
    body: method === 'POST' ? JSON.stringify({ messages }) : undefined,
  });
  return worker.fetch(req, envOverride, ctx);
}

async function readEvents(res) {
  const text = await res.text();
  await Promise.all(pending);
  return text.split('\n\n').filter(Boolean).map(chunk => chunk.replace(/^data: /, '')).map(d => (d === '[DONE]' ? d : JSON.parse(d)));
}

test('streams Claude text as {text} events, ending with [DONE]', async () => {
  const res = await chat([{ role: 'user', content: 'What do you do?' }]);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  const events = await readEvents(res);
  assert.deepEqual(events, [{ text: 'Medhyx offers ' }, { text: '**lakehouse** engineering.' }, '[DONE]']);
});

test('sends the site knowledge as a cached system block to claude-haiku-4-5', async () => {
  await readEvents(await chat([{ role: 'user', content: 'hi' }]));
  const { url, init, body } = captured[0];
  assert.equal(url, 'https://api.anthropic.com/v1/messages');
  assert.equal(new Headers(init.headers).get('x-api-key'), 'test-key');
  assert.equal(body.model, 'claude-haiku-4-5');
  assert.equal(body.stream, true);
  const last = body.system.at(-1);
  assert.deepEqual(last.cache_control, { type: 'ephemeral' });
  assert.match(last.text, /<site_content>[\s\S]*Senior Azure Data Engineer[\s\S]*<\/site_content>/);
});

test('rejects requests from other origins', async () => {
  assert.equal((await chat([{ role: 'user', content: 'hi' }], { origin: 'https://evil.example' })).status, 403);
  assert.equal((await chat([{ role: 'user', content: 'hi' }], { origin: 'http://localhost:8080' })).status, 403);
  assert.equal(captured.length, 0);
});

test('allows localhost only when ALLOW_LOCALHOST is set', async () => {
  const res = await chat([{ role: 'user', content: 'hi' }], { origin: 'http://localhost:8080', envOverride: { ...env, ALLOW_LOCALHOST: 'true' } });
  assert.equal(res.status, 200);
  await readEvents(res);
});

test('answers CORS preflight', async () => {
  const res = await chat(null, { method: 'OPTIONS' });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
});

test('rejects malformed conversations without calling Claude', async () => {
  for (const messages of [[], [{ role: 'assistant', content: 'x' }], [{ role: 'user', content: '   ' }], [{ role: 'user', content: 'a' }, { role: 'user', content: 'b' }], [{ role: 'system', content: 'x' }], 'nope']) {
    assert.equal((await chat(messages)).status, 400, JSON.stringify(messages));
  }
  assert.equal(captured.length, 0);
});

test('trims long history to recent turns starting with a user message, and caps message length', async () => {
  const history = [];
  for (let i = 0; i < 30; i++) history.push({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` });
  history.push({ role: 'user', content: 'x'.repeat(5000) });
  await readEvents(await chat(history));
  const sent = captured[0].body.messages;
  assert.ok(sent.length <= 16);
  assert.equal(sent[0].role, 'user');
  assert.equal(sent.at(-1).content.length, 2000);
});

test('applies the per-IP rate limiter', async () => {
  const keys = [];
  const RATE_LIMITER = { limit: async ({ key }) => { keys.push(key); return { success: false }; } };
  const res = await chat([{ role: 'user', content: 'hi' }], { envOverride: { ...env, RATE_LIMITER } });
  assert.equal(res.status, 429);
  assert.deepEqual(keys, ['1.2.3.4']);
  assert.equal(captured.length, 0);
});

test('reports a missing API key', async () => {
  assert.equal((await chat([{ role: 'user', content: 'hi' }], { envOverride: {} })).status, 500);
});

test('turns Claude API failures into a friendly error event', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'bad' } }), { status: 400, headers: { 'content-type': 'application/json' } });
  const events = await readEvents(await chat([{ role: 'user', content: 'hi' }]));
  assert.equal(events.length, 2);
  assert.match(events[0].error, /error/i);
  assert.equal(events[1], '[DONE]');
});
