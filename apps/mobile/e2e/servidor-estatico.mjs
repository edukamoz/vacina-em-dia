/* global URL */
// Serve a pasta `dist` (build web do app) na porta 4173, com o fallback de página única do
// Expo Router: endereços sem arquivo devolvem o `index.html`. Só para os testes de ponta a ponta.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../dist/', import.meta.url));
const porta = Number(process.env.PORTA_E2E ?? 4173);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

createServer((pedido, resposta) => {
  const caminho = decodeURIComponent(new URL(pedido.url ?? '/', 'http://x').pathname);
  const seguro = normalize(caminho).replace(/^(\.\.[/\\])+/, '');
  let arquivo = join(raiz, seguro);
  if (!arquivo.startsWith(raiz) || !existsSync(arquivo) || statSync(arquivo).isDirectory()) {
    arquivo = join(raiz, 'index.html');
  }
  resposta.writeHead(200, {
    'content-type': TIPOS[extname(arquivo)] ?? 'application/octet-stream',
  });
  createReadStream(arquivo).pipe(resposta);
}).listen(porta, () => console.log(`App web em http://localhost:${porta}`));
