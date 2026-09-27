import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const ORIGIN = 'https://medhyx.com';
let calls;
let pending;
let reply;
let failWith;

function aiStream(chunks) {
  const body = chunks.map(t => `data: ${JSON.stringify({ response: t })}\n\n`).join('') + 'data: [DONE]\n\n';
  return new Response(body).body;
}

const AI = {
  run: async (model, input) => {
    calls.push({ model, input });
    if (failWith) throw new Error(failWith);
    return aiStream(reply);
  },
};
const env = { AI };

beforeEach(() => {
  calls = [];
  pending = [];
  reply = ['Medhyx offers ', '**lakehouse** engineering.'];
  failWith = null;
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

test('streams model text as {text} events, ending with [DONE]', async () => {
  const res = await chat([{ role: 'user', content: 'What do you do?' }]);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  assert.deepEqual(await readEvents(res), [{ text: 'Medhyx offers ' }, { text: '**lakehouse** engineering.' }, '[DONE]']);
});

test('sends the site knowledge as the system message, streaming, with an output cap', async () => {
  await readEvents(await chat([{ role: 'user', content: 'hi' }]));
  const { model, input } = calls[0];
  assert.equal(model, '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  assert.equal(input.stream, true);
  assert.ok(input.max_tokens > 0);
  assert.equal(input.messages[0].role, 'system');
  assert.match(input.messages[0].content, /<site_content>[\s\S]*Senior Azure Data Engineer[\s\S]*<\/site_content>/);
  assert.doesNotMatch(input.messages[0].content, /\d{2}:\d{2}:\d{2}\.\d+ \[INFO\]/);
  assert.deepEqual(input.messages.slice(1), [{ role: 'user', content: 'hi' }]);
});

test('rejects requests from other origins', async () => {
  assert.equal((await chat([{ role: 'user', content: 'hi' }], { origin: 'https://evil.example' })).status, 403);
  assert.equal((await chat([{ role: 'user', content: 'hi' }], { origin: 'http://localhost:8080' })).status, 403);
  assert.equal(calls.length, 0);
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

test('rejects malformed conversations without calling the model', async () => {
  for (const messages of [[], [{ role: 'assistant', content: 'x' }], [{ role: 'user', content: '   ' }], [{ role: 'user', content: 'a' }, { role: 'user', content: 'b' }], [{ role: 'system', content: 'x' }], 'nope']) {
    assert.equal((await chat(messages)).status, 400, JSON.stringify(messages));
  }
  assert.equal(calls.length, 0);
});

test('trims long history to recent turns starting with a user message, and caps message length', async () => {
  const history = [];
  for (let i = 0; i < 30; i++) history.push({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` });
  history.push({ role: 'user', content: 'x'.repeat(5000) });
  await readEvents(await chat(history));
  const sent = calls[0].input.messages.slice(1);
  assert.ok(sent.length <= 10);
  assert.equal(sent[0].role, 'user');
  assert.equal(sent.at(-1).content.length, 2000);
});

test('applies the per-IP rate limiter', async () => {
  const keys = [];
  const RATE_LIMITER = { limit: async ({ key }) => { keys.push(key); return { success: false }; } };
  const res = await chat([{ role: 'user', content: 'hi' }], { envOverride: { ...env, RATE_LIMITER } });
  assert.equal(res.status, 429);
  assert.deepEqual(keys, ['1.2.3.4']);
  assert.equal(calls.length, 0);
});

test('turns model failures into a friendly error event', async () => {
  failWith = 'InferenceUpstreamError: something broke';
  const events = await readEvents(await chat([{ role: 'user', content: 'hi' }]));
  assert.equal(events.length, 2);
  assert.match(events[0].error, /error/i);
  assert.equal(events[1], '[DONE]');
});

test('explains when the daily free allowance is used up', async () => {
  failWith = '4006: you have used up your daily free allocation of 10,000 neurons';
  const [event] = await readEvents(await chat([{ role: 'user', content: 'hi' }]));
  assert.match(event.error, /limit for today[\s\S]*hello@medhyx\.com/);
});
