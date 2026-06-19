// Servidor de desenvolvimento local: serve os arquivos estáticos E executa a
// função serverless de api/ (que na Vercel rodaria sozinha). Lê o MP_ACCESS_TOKEN
// do .env para testar a integração real do Mercado Pago em ambiente de teste.
//
// Uso: node dev-server.mjs   (porta padrão 3002, ou defina PORT)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const raiz = dirname(fileURLToPath(import.meta.url));

// Carrega variáveis do .env (Node 20.6+)
try { process.loadEnvFile(join(raiz, '.env')); } catch { /* sem .env: roda mesmo assim */ }

const { default: criarPagamento } = await import('./api/criar-pagamento.js');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
};

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // ---- Rota da API (executa a função serverless) ----
  if (url.pathname === '/api/criar-pagamento') {
    let body = '';
    for await (const chunk of req) body += chunk;
    req.body = body;
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(obj));
    };
    try {
      await criarPagamento(req, res);
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ erro: 'Falha na função', detalhe: String(e) }));
    }
    return;
  }

  // ---- Arquivos estáticos (com cleanUrls: /principal -> principal.html) ----
  let caminho = url.pathname === '/' ? '/index.html' : url.pathname;
  let arquivo = join(raiz, decodeURIComponent(caminho));
  try {
    let data;
    try {
      data = await readFile(arquivo);
    } catch {
      arquivo += '.html';
      data = await readFile(arquivo);
    }
    res.setHeader('Content-Type', TIPOS[extname(arquivo)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Não encontrado');
  }
});

const porta = process.env.PORT || 3002;
servidor.listen(porta, () => {
  const modo = process.env.MP_ACCESS_TOKEN ? 'COM Mercado Pago (token carregado)' : 'SEM token';
  console.log(`dev-server rodando em http://localhost:${porta} — ${modo}`);
});
