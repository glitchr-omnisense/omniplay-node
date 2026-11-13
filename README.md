# omniplay/node

[omnisense/omniplay](https://github.com/glitchr-omnisense/omniplay) inside a Node.js game server
(npm `@omniplay/node`): verify the ticket a player presents at connection, mint tickets, and send the
server's heartbeats to the application. No dependency: `node:crypto` and `fetch` (Node 18 or
later). It calls omniplay; omniplay never calls it.

```sh
npm install @omniplay/node
```

```js
import { verify, fromEnv, startHeartbeat } from '@omniplay/node';

const omniplay = fromEnv();   // what omniplay/docker hands a server: secret, id, room, service, heartbeat URL
wss.on('connection', (socket, request) => {
  const ticket = new URL(request.url, 'http://x').searchParams.get('ticket');
  const claims = verify(ticket, omniplay.secret, omniplay.room);   // the payload, or null
  if (!claims) return socket.close(4401, 'ticket refused');
  socket.player = claims.sub;
});

startHeartbeat({ url: omniplay.heartbeatUrl, secret: omniplay.secret, server: omniplay.server, service: omniplay.service, state: () => ({ players: wss.clients.size }) });
```

- `verify(token, secret, room, { at })`: the payload when the signature holds (the last dot,
  lower-case hex, constant time), `room` is the string served and `exp` (a number, its integer
  part) is not before now; null otherwise.
- `sign(payload, secret)`, `signJson(json, secret)`, `mint({ secret, room, ttl, claims })`,
  `encodeJson(value)`: JSON written as PHP's `json_encode()` writes it (slashes and characters past
  ASCII escaped), so a ticket signed here is byte for byte the one PHP signs.
- `heartbeatToken(server, secret)`, `sendHeartbeat({ url, secret, server, service, players,
  health, address, capacity, region, tags, engine })`, `startHeartbeat({ every: 10000, state,
  onAnswer, onError, ... })`, `fromEnv(env)`: the protocol of omniplay's `docs/heartbeat.md`.

The format is omniplay's `docs/tickets.md`; `test/vectors.json` is a copy of omniplay's
`Tests/vectors.json`.

## Tests

```sh
node --test
```

On 2026-11-08, Node 26.12: 35 tests green - the 5 sign vectors (the JSON as PHP writes it, the
ticket from the payload and from the JSON), the 22 verify vectors (the payload or null, as each
says), the expiry's edge, minting, JSON byte for byte as PHP 8.4 writes a value with slashes, accents, an emoji, controls and numbers, and the heartbeat posted to an HTTP server of the test's own
process (its body, a token that holds for `heartbeat:<server>` and not for the server's room, the
heartbeat vector, the beat repeated with the state of the moment, a 401 answered).

Not verified: a heartbeat answered by an application running omniplay's `Heartbeats` (the
vectors prove the token is the one PHP makes).

## Licence

MIT.
