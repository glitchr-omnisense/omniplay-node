// The heartbeat, sent to a server of this process: its request read back as omniplay's Heartbeats reads it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fromEnv, heartbeatToken, sendHeartbeat, startHeartbeat, verify } from '../src/index.js';

const vectors = JSON.parse(readFileSync(new URL('./vectors.json', import.meta.url), 'utf8'));
const SECRET = 'not-a-real-secret';

async function application(answer = { status: 200, reason: 'Heard.' }) {
  const received = [];
  const server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => {
      received.push({ method: request.method, url: request.url, authorization: request.headers.authorization, body: JSON.parse(body) });
      response.writeHead(answer.status, { 'Content-Type': 'application/json' }).end(JSON.stringify(answer));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}/omniplay/heartbeat`, received, close: () => new Promise((resolve) => server.close(resolve)) };
}

test('a heartbeat token is the vector omniplay signed', () => {
  const vector = vectors.sign.find((v) => v.payload.room === 'heartbeat:eu-1-a3f9');
  assert.equal(heartbeatToken('eu-1-a3f9', vector.secret, { ttl: 60, at: 4102444800 - 60 }), vector.ticket);
});

test('a heartbeat posts the server\'s state with a token for its heartbeat room only', async () => {
  const app = await application();
  try {
    const answer = await sendHeartbeat({ url: app.url, secret: SECRET, server: 'eu-1', service: 'game', players: 5, address: '203.0.113.7:7777', tags: ['ranked'] });
    assert.deepEqual(answer, { status: 200, body: { status: 200, reason: 'Heard.' } });
    const [request] = app.received;
    assert.equal(request.method, 'POST');
    assert.equal(request.url, '/omniplay/heartbeat');
    assert.deepEqual(request.body, { server: 'eu-1', service: 'game', players: 5, health: 'healthy', address: '203.0.113.7:7777', tags: ['ranked'] });
    const token = request.authorization.replace(/^Bearer /, '');
    assert.notEqual(verify(token, SECRET, 'heartbeat:eu-1'), null);
    assert.equal(verify(token, SECRET, 'eu-1'), null, 'not a player\'s ticket');
  } finally {
    await app.close();
  }
});

test('the beat goes on every interval with the state of the moment, and a refusal is answered', async () => {
  const app = await application({ status: 401, reason: 'The heartbeat\'s token does not hold for this server.' });
  let players = 0;
  const answers = [];
  const beating = startHeartbeat({ url: app.url, secret: SECRET, server: 'eu-1', service: 'game', every: 30, state: () => ({ players: players++ }), onAnswer: (a) => answers.push(a.status) });
  await new Promise((resolve) => setTimeout(resolve, 100));
  beating.stop();
  await app.close();
  assert.ok(app.received.length >= 3, `${app.received.length} heartbeats in 100 ms at one every 30 ms`);
  assert.deepEqual(app.received.slice(0, 3).map((r) => r.body.players), [0, 1, 2]);
  assert.ok(answers.every((status) => status === 401));
});

test('what a provider hands a server is read from its environment', () => {
  assert.deepEqual(fromEnv({ OMNIPLAY_TICKET_SECRET: 's', OMNIPLAY_SERVER_ID: 'omniplay-game-1', OMNIPLAY_ROOM: 'omniplay-game-1', OMNIPLAY_SERVICE: 'game', OMNIPLAY_CAPACITY: '8', OMNIPLAY_PORT: '7777', OMNIPLAY_HEARTBEAT_URL: 'https://www.example.org/omniplay/heartbeat' }), {
    secret: 's', server: 'omniplay-game-1', room: 'omniplay-game-1', service: 'game', capacity: 8, port: 7777, engine: undefined, heartbeatUrl: 'https://www.example.org/omniplay/heartbeat',
  });
});
