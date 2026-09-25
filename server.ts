/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE — servidor de DESENVOLVIMENTO LOCAL.
 *
 * Em produção (Vercel) este arquivo NÃO é usado: cada arquivo em /api é uma
 * Vercel Function e o frontend é servido estaticamente a partir de /dist.
 *
 * Localmente, este adaptador monta exatamente os mesmos handlers de /api
 * (assinatura Web Request -> Response) e o Vite em modo middleware, para que
 * `npm run dev` reproduza a arquitetura de produção em uma única porta.
 */

import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.join(rootDir, 'api');
const PORT = Number(process.env.PORT) || 3000;
const isPreview = process.argv.includes('--preview');

type WebHandler = (request: Request) => Promise<Response>;
type ApiModule = Partial<Record<'GET' | 'POST' | 'PUT' | 'DELETE', WebHandler>>;

/** Descobre as Functions em /api exatamente como a Vercel (arquivo = rota). */
function discoverRoutes(dir: string, prefix = '/api'): Map<string, string> {
  const routes = new Map<string, string>();
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      for (const [route, file] of discoverRoutes(full, `${prefix}/${entry}`)) routes.set(route, file);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      routes.set(`${prefix}/${entry.replace(/\.ts$/, '')}`, full);
    }
  }
  return routes;
}

async function toWebRequest(req: http.IncomingMessage): Promise<Request> {
  const url = `http://${req.headers.host ?? `localhost:${PORT}`}${req.url ?? '/'}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (value !== undefined) headers.set(key, value);
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const chunks: Buffer[] = [];
  if (hasBody) for await (const chunk of req) chunks.push(chunk as Buffer);
  return new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined });
}

async function sendWebResponse(res: http.ServerResponse, response: Response): Promise<void> {
  const setCookies = response.headers.getSetCookie();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') res.setHeader(key, value);
  });
  if (setCookies.length) res.setHeader('Set-Cookie', setCookies);
  res.statusCode = response.status;
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function main(): Promise<void> {
  const routes = discoverRoutes(apiDir);

  let viteMiddlewares: ((req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void) | null = null;
  if (!isPreview) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    viteMiddlewares = vite.middlewares;
  }

  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://local').pathname.replace(/\/$/, '');

    if (pathname.startsWith('/api/') || pathname === '/api') {
      const file = routes.get(pathname);
      if (!file) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'Rota de API inexistente.' } }));
        return;
      }
      const mod = (await import(pathToFileURL(file).href)) as ApiModule;
      const handler = mod[(req.method ?? 'GET') as keyof ApiModule];
      if (!handler) {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Método não permitido.' } }));
        return;
      }
      await sendWebResponse(res, await handler(await toWebRequest(req)));
      return;
    }

    if (viteMiddlewares) {
      viteMiddlewares(req, res, () => {
        res.statusCode = 404;
        res.end();
      });
      return;
    }

    // --preview: serve o build estático de /dist com fallback SPA (igual à Vercel).
    const distPath = path.join(rootDir, 'dist');
    const candidate = path.join(distPath, path.normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
    const file = candidate.startsWith(distPath) && existsSync(candidate) && statSync(candidate).isFile() ? candidate : path.join(distPath, 'index.html');
    const types: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[social-intelligence] ${isPreview ? 'preview' : 'dev'} em http://localhost:${PORT} — ${routes.size} rotas de API`);
  });
}

void main();
