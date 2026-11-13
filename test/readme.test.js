// The README's first call: examples/first-call.mjs, shown in the README as it is, runs and prints
// what its comments say.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const example = readFileSync(new URL('../examples/first-call.mjs', import.meta.url), 'utf8');

test('the README shows examples/first-call.mjs as it is', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.ok(readme.includes('```js\n' + example + '```'), 'README and examples/first-call.mjs differ');
});

test('the first call prints the player, a refusal, then the minted player', () => {
  // The package resolves itself by its name through package.json's "exports".
  const out = execFileSync(process.execPath, ['examples/first-call.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(out, 'player-42\nnull\nplayer-7\n');
});
