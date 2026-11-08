// The tickets against test/vectors.json, the copy of omnisense/omniplay's Tests/vectors.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeJson, mint, sign, signJson, verify } from '../src/index.js';

const vectors = JSON.parse(readFileSync(new URL('./vectors.json', import.meta.url), 'utf8'));

test('there are 5 sign vectors and 22 verify vectors, 5 of them valid', () => {
  assert.equal(vectors.sign.length, 5);
  assert.equal(vectors.verify.length, 22);
  assert.equal(vectors.verify.filter((v) => v.valid).length, 5);
});

for (const v of vectors.sign) {
  test('sign: ' + v.name, () => {
    assert.equal(encodeJson(v.payload), v.json, 'JSON as PHP writes it');
    assert.equal(sign(v.payload, v.secret), v.ticket);
    assert.equal(signJson(v.json, v.secret), v.ticket);
  });
}

for (const v of vectors.verify) {
  test('verify: ' + v.name, () => {
    assert.deepEqual(verify(v.ticket, v.secret, v.room), v.valid ? v.payload : null);
  });
}

test('an expiry equal to now still holds, a second later it does not', () => {
  const ticket = sign({ room: 'lobby', exp: 1800000000 }, 'secret');
  assert.notEqual(verify(ticket, 'secret', 'lobby', { at: 1800000000 }), null);
  assert.equal(verify(ticket, 'secret', 'lobby', { at: 1800000001 }), null);
});

test('a minted ticket lives its ttl, room and exp are not claims', () => {
  const ticket = mint({ secret: 's', room: 'eu-1', ttl: 60, claims: { sub: 'p-1' }, at: 1800000000 });
  assert.equal(ticket.expires, 1800000060);
  assert.deepEqual(verify(ticket.token, 's', 'eu-1', { at: 1800000000 }), { sub: 'p-1', room: 'eu-1', exp: 1800000060 });
  assert.throws(() => mint({ secret: 's', room: 'r', claims: { exp: 1 } }), /not claims/);
  assert.throws(() => sign({ room: 'r', exp: '1' }, 's'), /expiry/);
  assert.throws(() => sign({ room: 'r', exp: 1 }, ''), /secret/);
});

test('JSON is written as PHP writes it', () => {
  // php -r 'echo json_encode(["a" => "x/y\u{e9}\u{1F3AE}\"\\\n\x01\x7f", "b" => [1, 1.5, 2.0, true, null]]);' on PHP 8.4.27, byte for byte.
  assert.equal(encodeJson({ a: 'x/y\u00e9\u{1F3AE}"\\\n\u0001\u007f', b: [1, 1.5, 2.0, true, null] }), '{"a":"x\\/y\\u00e9\\ud83c\\udfae\\"\\\\\\n\\u0001\u007f","b":[1,1.5,2,true,null]}');
});
