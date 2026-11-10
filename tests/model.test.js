import test from 'node:test';
import assert from 'node:assert/strict';
import { SCOPE, ORIGIN, configuration, defaultRecord, imageUrl, singleCssImage, backgroundLayers, assetId, isDashboard, visual } from '../src/background/model.js';

test('configuration has one supported scope, validated modes and no unrelated fields', () => {
  assert.deepEqual(configuration({ scope: SCOPE, mode: 'off', source: { kind: 'url', url: 'https://example.com/a' }, unrelated: true }), { scope: SCOPE, mode: 'off', visual: visual(), appearance:{pages:'dashboard',surface:'original'} });
  assert.throws(() => configuration({ scope: 'another-site', mode: 'custom' }));
  assert.throws(() => configuration({ scope: SCOPE, mode: 'unknown' }));
  assert.equal(defaultRecord().revision, 0);
});
test('rejects temporary, executable, insecure, credential-bearing and incomplete sources', () => {
  for (const url of ['javascript:alert(1)', 'data:image/png;base64,x', 'blob:https://example.com/a', 'http://example.com/a', 'https://user:password@example.com/a', '/relative.jpg', '']) assert.throws(() => imageUrl(url));
});
test('preserves URL query signatures and safely encodes CSS-special URL characters', () => {
  const url = 'https://example.com/my(image).png?signature=a%2Fb&expires=123#x';
  assert.equal(imageUrl(url), url);
  assert.equal(singleCssImage(`url("${url}")`), url);
});
test('detects one inherited image without confusing gradient commas with layer separators', () => {
  const parts = backgroundLayers('linear-gradient(135deg, rgba(0, 0, 0, .4), rgba(0, 0, 0, .2)), url("https://example.com/a,b(1).png")');
  assert.equal(parts.url, 'https://example.com/a,b(1).png');
  assert.equal(parts.overlay, 'linear-gradient(135deg, rgba(0, 0, 0, .4), rgba(0, 0, 0, .2))');
});
test('does not guess when inherited CSS is malformed or contains multiple images', () => {
  for (const value of ['url("https://example.com/a"), url("https://example.com/b")', 'linear-gradient(red, blue', 'var(--unknown)', 'url(javascript:alert(1))', 'url("https://example.com/unclosed)']) assert.equal(backgroundLayers(value), null);
  assert.equal(singleCssImage('url(https://example.com/a),url(https://example.com/b)'), null);
});
test('numeric ranges and colors are bounded before persistence', () => {
  for (const value of [{ blur: -1 }, { opacity: 101 }, { scale: 500 }, { x: NaN }, { brightness: Infinity }, { overlay: 'url(x)' }, { fit: 'stretch' }]) assert.throws(() => visual(value));
  assert.equal(visual({ fallback: '#AABBCC' }).fallback, '#aabbcc');
});
test('coursework, quiz and calendar pages are outside the dashboard customization scope', () => {
  assert.ok(isDashboard({ origin: ORIGIN, pathname: '/' }));
  assert.ok(isDashboard({ origin: ORIGIN, pathname: '/dashboard' }));
  for (const pathname of ['/courses/1', '/courses/1/assignments/2', '/calendar', '/dashboard/else']) assert.equal(isDashboard({ origin: ORIGIN, pathname }), false);
  assert.equal(isDashboard({ origin: 'https://unrelated.example', pathname: '/' }), false);
});
test('identical uploaded bytes have stable identity; changed bytes get a new identity', async () => {
  const a = new Blob(['synthetic-a'], { type: 'image/png' });
  const b = new Blob(['synthetic-b'], { type: 'image/png' });
  assert.equal(await assetId(a), await assetId(new Blob(['synthetic-a'], { type: 'image/png' })));
  assert.notEqual(await assetId(a), await assetId(b));
  await assert.rejects(assetId(new Blob(['x'], { type: 'image/svg+xml' })));
  await assert.rejects(assetId(new Blob([], { type: 'image/png' })));
});

test('all-page coverage reuses the canonical scope and rejects unsupported appearance options',async()=>{const {backgroundApplies}=await import('../src/background/model.js');const c=configuration({scope:SCOPE,mode:'custom',source:{kind:'url',url:'https://example.org/image.png'},appearance:{pages:'all',surface:'transparent'}});assert.equal(c.scope,SCOPE);assert.ok(backgroundApplies({origin:'https://vinuni.instructure.com',pathname:'/courses/42'},c));assert.ok(!backgroundApplies({origin:'https://other.invalid',pathname:'/'},c));assert.throws(()=>configuration({scope:SCOPE,mode:'off',appearance:{pages:'anywhere'}}));});
