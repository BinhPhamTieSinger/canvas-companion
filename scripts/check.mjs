import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
async function files(directory) {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${item.name}`;
    if (item.isDirectory()) result.push(...await files(path)); else result.push(path);
  }
  return result;
}
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ['storage']);
assert.deepEqual(manifest.host_permissions, ['https://vinuni.instructure.com/*']);
for (const path of [manifest.background.service_worker, manifest.action.default_popup, ...manifest.content_scripts.flatMap(script => script.js), ...Object.values(manifest.icons), ...manifest.web_accessible_resources.flatMap(item => item.resources)]) await readFile(path);
const paths = [...await files('src'), ...await files('scripts'), ...await files('tests')];
for (const path of paths.filter(path => /\.(?:js|mjs)$/.test(path))) execFileSync(process.execPath, ['--check', path]);
for (const path of paths.filter(path => path.startsWith('src/'))) {
  const source = await readFile(path, 'utf8');
  assert.ok(!/document\.cookie|localStorage|chrome\.storage\.sync|eval\s*\(/.test(source), `Unexpected credential, host-page, sync, or evaluation API: ${path}`);
  if (!path.endsWith('/canvas.js')) assert.ok(!/fetch\s*\(/.test(source), `Only the read-only Canvas adapter may make requests: ${path}`);
}
console.log(`Manifest, restricted permissions, packaging inputs and ${paths.filter(path => /\.(?:js|mjs)$/.test(path)).length} JavaScript files checked.`);

const adapter = await readFile('src/academic/canvas.js','utf8');
assert.ok(adapter.includes("method:'GET'") && adapter.includes("credentials:'same-origin'"));
assert.ok(!/method:\s*['\"](?:POST|PUT|PATCH|DELETE)/i.test(adapter));
