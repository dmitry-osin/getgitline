import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const config = JSON.parse(await readFile(new URL('../site-config.json', import.meta.url), 'utf8'));
const portIndex = process.argv.indexOf('--port');
const port = portIndex < 0 ? 4173 : Number(process.argv[portIndex + 1]);
const noJS = process.argv.includes('--no-js');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8' };
const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') { res.writeHead(302,{Location:config.siteBase});res.end();return; }
    if (!url.pathname.startsWith(config.siteBase)) { res.writeHead(404);res.end('Not found');return; }
    const relative = decodeURIComponent(url.pathname.slice(config.siteBase.length));
    let file = path.resolve(root, relative);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403);res.end();return; }
    if ((await stat(file)).isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(301,{Location:url.pathname+'/'});res.end();return; }
      file = path.join(file, 'index.html');
    }
    const body = await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff',...(noJS ? {'Content-Security-Policy': "script-src 'none'"} : {})});
    res.end(body);
  } catch { res.writeHead(404);res.end('Not found'); }
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}${config.siteBase}${noJS ? ' (scripts disabled by CSP)' : ''}`));
