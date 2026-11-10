import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const base = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg' };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(base, `.${pathname}`);
    if (/^\/(?:private|backups|audit)\//.test(pathname)) throw new Error();
    if (!path.startsWith(base + sep) || /(?:^|\/)\.(?:git|env)(?:\/|$)/.test(pathname)) throw new Error();
    const file = (await stat(path)).isDirectory() ? `${path}/index.html` : path;
    if (!['.html','.js','.mjs','.css','.json','.svg','.png','.jpg'].includes(extname(file))) throw new Error();
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'text/plain', 'Cache-Control': 'no-store' });
    let content = await readFile(file);
    if (pathname === '/options.html' && new URL(req.url, 'http://localhost').searchParams.get('fixture') === '1') content = Buffer.from(content.toString().replace('<script type="module" src="src/ui/options.js">', '<script src="/tests/browser/chrome-shim.js"></script><script type="module" src="src/ui/options.js">'));
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.CC_FIXTURE_PORT||4178), '127.0.0.1', () => console.log('Synthetic browser tests: http://127.0.0.1:4178/tests/browser/'));
