// dev-server.js — Local development server mirroring nginx.conf
// Serves /web as static files on port 8080
// Proxies /api/* → http://localhost:8181/*
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const API_HOST = 'localhost';
const API_PORT = 8181;
const WEB_ROOT = path.join(__dirname, 'web');

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.webp': 'image/webp', '.mp4': 'video/mp4',
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname;

  // Proxy /api/* → localhost:8181/*
  if (pathname.startsWith('/api/')) {
    const apiPath = pathname.replace(/^\/api/, '') + (parsed.search || '');
    const proxyReq = http.request({
      hostname: API_HOST, port: API_PORT,
      path: apiPath, method: req.method,
      headers: { ...req.headers, host: `${API_HOST}:${API_PORT}` },
    }, proxyRes => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('API proxy error — is the API running on port 8181?');
    });
    req.pipe(proxyReq);
    return;
  }

  // Static file serving from /web
  let filePath = path.join(WEB_ROOT, pathname === '/' ? 'index.html' : pathname);
  // Strip query string from file path
  filePath = filePath.split('?')[0];

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA fallback
      filePath = path.join(WEB_ROOT, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    // No cache for dev
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        res.writeHead(404); res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n  🔭 StarGazer dev server running at http://localhost:${PORT}\n  📡 API proxy → http://localhost:${API_PORT}\n`);
});
