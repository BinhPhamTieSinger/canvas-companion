import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const { version } = JSON.parse(await readFile('manifest.json', 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid package version.');
const directory = `dist/canvas-companion-${version}`;
await rm(directory, { recursive: true, force: true });
await rm(`dist/canvas-companion-${version}.zip`, { force: true });
await mkdir(directory, { recursive: true });
for (const file of ['manifest.json', 'options.html', 'popup.html', 'demo.html', 'src']) await cp(file, `${directory}/${file}`, { recursive: true });
await cp('docs/INSTALL.md', `${directory}/INSTALL.md`);
// Web Store requires manifest.json at the archive root.
execFileSync('zip',['-qr',`../canvas-companion-${version}.zip`,'.'],{cwd:directory});
const archive = await readFile(`dist/canvas-companion-${version}.zip`);
await writeFile(`dist/canvas-companion-${version}.sha256`, `${createHash('sha256').update(archive).digest('hex')}  canvas-companion-${version}.zip\n`);
console.log(`Unpacked extension: ${directory}\nArchive: dist/canvas-companion-${version}.zip`);
