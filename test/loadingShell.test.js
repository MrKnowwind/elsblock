import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('the loading shell is visible before the game module and can recover from a slow network', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const shellIndex = html.indexOf('id="loading-screen"');
  const gameModuleIndex = html.indexOf('src="/src/main.js"');

  assert.ok(shellIndex >= 0, 'missing the native loading shell');
  assert.ok(shellIndex < gameModuleIndex, 'the loading shell must exist before the game module starts');
  assert.match(html, /role="progressbar"/);
  assert.match(html, /重新加载/);
  assert.match(html, /location\.reload\(\)/);
});
