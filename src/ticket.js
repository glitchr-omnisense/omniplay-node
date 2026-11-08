// The tickets' one format, as omnisense/omniplay's Ticket\TicketSigner writes it:
// base64url(json payload) "." hex(hmac_sha256(that base64url, secret)). The payload names its
// room ("room", a string) and its expiry ("exp", Unix seconds); the rest is the application's.
// The signature is over the base64url text as it stands: a verifier never encodes anything again.
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Unix seconds now. */
export const now = () => Math.floor(Date.now() / 1000);

/**
 * JSON as PHP's json_encode() writes it with its default flags: slashes as "\/", every character
 * past ASCII as \uXXXX (UTF-16 units, so surrogate pairs past U+FFFF). With integers, strings,
 * booleans, null, lists and objects the bytes are PHP's (2.0 is "2" in both); an empty object (PHP's
 * "[]" for an empty array) and a number past 15 digits (PHP's exponent form) may differ.
 */
export function encodeJson(value) {
  return JSON.stringify(value)
    .replace(/\//g, '\\/')
    .replace(/[\u0080-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

/** A ticket over this JSON text as it is. */
export function signJson(json, secret) {
  if (typeof secret !== 'string' || secret === '') {
    throw new TypeError('A ticket is signed with a non-empty secret.');
  }
  const body = Buffer.from(json, 'utf8').toString('base64url');
  return body + '.' + createHmac('sha256', secret).update(body).digest('hex');
}

/** A ticket for this payload: it names its room (a non-empty string) and its expiry (an integer). */
export function sign(payload, secret) {
  if (typeof payload?.room !== 'string' || payload.room === '') {
    throw new TypeError('A ticket names its room: "room", a non-empty string.');
  }
  if (!Number.isInteger(payload.exp)) {
    throw new TypeError('A ticket names its expiry: "exp", an integer (Unix seconds).');
  }
  return signJson(encodeJson(payload), secret);
}

/**
 * A ticket to this room living ttl seconds: the claims, then room, then exp.
 * @returns {{ token: string, room: string, expires: number, claims: object }}
 */
export function mint({ secret, room, ttl = 60, claims = {}, at = now() }) {
  if ('room' in claims || 'exp' in claims) {
    throw new TypeError('"room" and "exp" are the ticket\'s own: they are not claims.');
  }
  const expires = at + ttl;
  return { token: sign({ ...claims, room, exp: expires }, secret), room, expires, claims };
}

/**
 * The ticket's payload when its signature holds, it is for this room and it has not expired; null
 * otherwise. An empty secret verifies nothing; the signature is what follows the last dot, lower-case
 * hex compared in constant time; "room" must be a string equal to the room served; "exp" a number,
 * its integer part compared (an expiry equal to now still holds).
 */
export function verify(token, secret, room, { at = now() } = {}) {
  if (typeof token !== 'string' || typeof secret !== 'string' || secret === '') return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const expected = Buffer.from(createHmac('sha256', secret).update(body).digest('hex'));
  const given = Buffer.from(token.slice(dot + 1));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return null;
  if (typeof payload.room !== 'string' || payload.room !== room) return null;
  if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) || Math.trunc(payload.exp) < at) return null;
  return payload;
}
