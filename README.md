# omniplay/node

[omnisense/omniplay](https://github.com/glitchr-omnisense/omniplay) inside a Node.js game server
(npm `@omniplay/node`): verify the ticket a player presents at connection, mint tickets, and send the
server's heartbeats to the application. No dependency: `node:crypto` and `fetch` (Node 20 or
later). It calls omniplay; omniplay never calls it.

## Install and a first call

```sh
npm install @omniplay/node
```

No account, no key, no network: a ticket is checked with the secret the server shares with the
application. This one was signed by omniplay's PHP `Tickets` (a recorded exchange, from omniplay's
vectors); `node examples/first-call.mjs` runs it from a checkout.

```js
import { mint, verify } from '@omniplay/node';

// A ticket the PHP application signed (omnisense/omniplay's Tickets, recorded in its vectors):
const fromPhp = 'eyJzdWIiOiJwbGF5ZXItNDIiLCJuYW1lIjoiQWRhIiwicm9vbSI6ImV1LTEtYTNmOSIsImV4cCI6NDEwMjQ0NDgwMH0.0bb9f63e3f6c9d7237c18855738470bae0f54410d4d1177ee87cc65c4608a57c';
const secret = 's3cr3t-shared-with-the-servers';   // OMNIPLAY_TICKET_SECRET on a real server
console.log(verify(fromPhp, secret, 'eu-1-a3f9')?.sub);   // "player-42": the server eu-1-a3f9 lets the player in
console.log(verify(fromPhp, secret, 'eu-1-b7c2'));        // null: another server refuses it

const ticket = mint({ secret, room: 'eu-1-a3f9', ttl: 60, claims: { sub: 'player-7' } });
console.log(verify(ticket.token, secret, 'eu-1-a3f9')?.sub);   // "player-7"
```

## Inside a game server

A server that omniplay/docker (or any omniplay hosting provider) starts finds its secret, id, room,
service and heartbeat URL in its environment:

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

On 2026-11-13, Node 22.23: 37 tests green - the README's first call (examples/first-call.mjs, run
and compared with the README), the 5 sign vectors (the JSON as PHP writes it, the ticket from the
payload and from the JSON), the 22 verify vectors (the payload or null, as each says), the expiry's
edge, minting, JSON byte for byte as PHP 8.4 writes a value with slashes, accents, an emoji,
controls and numbers, and the heartbeat posted to an HTTP server of the test's own process (its
body, a token that holds for `heartbeat:<server>` and not for the server's room, the heartbeat
vector, the beat repeated with the state of the moment, a 401 answered). The tarball (`npm pack
--dry-run`): 8 files, 6.6 kB - src/, README, CHANGELOG, LICENSE, package.json.

Not verified: a heartbeat answered by an application running omniplay's `Heartbeats` (the
vectors prove the token is the one PHP makes).

## Releasing

A pushed tag `vX.Y.Z` equal to `package.json`'s version runs `.github/workflows/release.yml`: the CI
on the tag, the changelog's section checked, the GitHub release with the tarball, then
`npm publish --provenance` when the repository holds the secret `NPM_TOKEN`. Without the secret,
publish by hand from the tagged commit: `npm publish --access public`.

## Licence

MIT.
