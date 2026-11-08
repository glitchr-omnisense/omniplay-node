// A server's heartbeat to the application (omnisense/omniplay's docs/heartbeat.md): POST the
// server's state with a token signed as a ticket is, for the room "heartbeat:<server id>".
import { now, sign } from './ticket.js';

export const HEARTBEAT_PREFIX = 'heartbeat:';

/** The token of a server's heartbeat. */
export function heartbeatToken(server, secret, { ttl = 60, at = now() } = {}) {
  return sign({ room: HEARTBEAT_PREFIX + server, exp: at + ttl }, secret);
}

/**
 * What a server started by a provider finds in its environment (omniplay/docker sets them).
 * @returns {{ secret?: string, server?: string, room?: string, service?: string, capacity?: number, port?: number, engine?: string, heartbeatUrl?: string }}
 */
export function fromEnv(env = process.env, { secretVariable = 'OMNIPLAY_TICKET_SECRET' } = {}) {
  const number = (v) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : undefined);
  return {
    secret: env[secretVariable] || undefined,
    server: env.OMNIPLAY_SERVER_ID || undefined,
    room: env.OMNIPLAY_ROOM || env.OMNIPLAY_SERVER_ID || undefined,
    service: env.OMNIPLAY_SERVICE || undefined,
    capacity: number(env.OMNIPLAY_CAPACITY),
    port: number(env.OMNIPLAY_PORT),
    engine: env.OMNIPLAY_ENGINE || undefined,
    heartbeatUrl: env.OMNIPLAY_HEARTBEAT_URL || undefined,
  };
}

/**
 * One heartbeat. players and health are the server's now; address (with capacity, region, tags,
 * engine) registers a server the fleet does not know. Answers the status and the decoded body.
 * @returns {Promise<{ status: number, body: any }>}
 */
export async function sendHeartbeat({ url, secret, server, service, players = 0, health = 'healthy', address, capacity, region, tags, engine, fetch = globalThis.fetch, at = now() }) {
  if (!url || !server || !service) throw new TypeError('A heartbeat names its url, its server and its service.');
  const body = { server, service, players, health };
  for (const [key, value] of Object.entries({ address, capacity, region, tags, engine })) {
    if (value !== undefined && value !== null) body[key] = value;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + heartbeatToken(server, secret, { at }) },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let decoded = null;
  try {
    decoded = text ? JSON.parse(text) : null;
  } catch {
    decoded = text;
  }
  return { status: response.status, body: decoded };
}

/**
 * A heartbeat every `every` milliseconds (10 s: under the fleet's 30 s), the first at once.
 * state() gives { players, health } each time; onError gets what failed (the beat goes on).
 * @returns {{ stop(): void, beat(): Promise<{ status: number, body: any } | null> }}
 */
export function startHeartbeat({ every = 10000, state = () => ({}), onAnswer = () => {}, onError = () => {}, ...options }) {
  const beat = async () => {
    try {
      const answer = await sendHeartbeat({ ...options, ...state() });
      onAnswer(answer);
      return answer;
    } catch (error) {
      onError(error);
      return null;
    }
  };
  const timer = setInterval(beat, every);
  timer.unref?.();
  beat();
  return { stop: () => clearInterval(timer), beat };
}
