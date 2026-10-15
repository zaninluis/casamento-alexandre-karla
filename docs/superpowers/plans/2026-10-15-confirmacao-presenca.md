# Confirmação de presença Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formulário aberto no site para o convidado dizer se vai e listar os nomes de quem vem, gravando uma linha por pessoa numa planilha Google dos noivos.

**Architecture:** O front (`presenca.js`) envia JSON para a função serverless `api/confirmar-presenca.js` na Vercel, que valida com `lib/validar-presenca.js` e repassa ao Apps Script publicado na planilha (`google-apps-script/confirmacao.gs`), autenticando com um token compartilhado. O Apps Script grava as linhas e mantém uma aba de resumo com fórmulas.

**Tech Stack:** HTML/CSS/JS puros, Node.js 25 (ESM, `node --test`), funções serverless da Vercel, Google Apps Script (V8).

**Spec:** `docs/superpowers/specs/2026-10-15-confirmacao-presenca-design.md`

## Global Constraints

- Interface em português, sem frameworks nem bibliotecas novas.
- Textos exatos: seção "Confirme sua presença"; prazo "Confirme até 20 de dezembro de 2026"; opções "Vou, com certeza! 🎉" e "Infelizmente não poderei ir"; botões "+ adicionar pessoa" e "Enviar confirmação"; sucesso "Oba, {primeiro nome}! Presença confirmada pra {N} pessoas 💛" (ou "1 pessoa") e "Que pena! Obrigado por avisar, {primeiro nome}".
- 1 a 10 nomes por envio; cada nome com 2 a 80 caracteres após `trim`.
- Depois do prazo o formulário continua aceitando.
- Variáveis de ambiente: `APPS_SCRIPT_URL` e `RSVP_TOKEN`. Sem elas, a API responde 503.
- Planilha: aba "Confirmações" com colunas `Data/hora | Nome | Vai? | Confirmado por`; aba "Resumo" com total que vai, total que não vai e envios. Fuso `America/Sao_Paulo`.
- Valores começando com `=`, `+`, `-` ou `@` recebem apóstrofo antes de gravar.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Deploy na Vercel só com o ok explícito do usuário.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `lib/validar-presenca.js` (novo) | Função pura `validarPresenca(corpo)` |
| `tests/validar-presenca.test.js` (novo) | Testes da validação |
| `api/confirmar-presenca.js` (novo) | Função serverless: valida, checa env, repassa ao Apps Script |
| `tests/confirmar-presenca.test.js` (novo) | Testes da função com `fetch` simulado |
| `dev-server.mjs` (alterar) | Roteia as duas funções de `api/` |
| `google-apps-script/confirmacao.gs` (novo) | Script colado na planilha: `configurar()`, `doPost()` |
| `tests/apps-script.test.js` (novo) | Roda o `.gs` em `node:vm` com Google simulado |
| `presenca.js` (novo) | Comportamento do formulário no navegador |
| `index.html`, `principal.css` (alterar) | Seção, botão na capa e estilos |
| `package.json`, `.vercelignore` (alterar) | Script `test`; tirar `tests` e `google-apps-script` do deploy |

---

### Task 1: Validação dos dados

**Files:**
- Create: `lib/validar-presenca.js`
- Create: `tests/validar-presenca.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `validarPresenca(corpo: unknown)` → `{ ok: true, isca: true }` | `{ ok: true, dados: { vai: boolean, nomes: string[] } }` | `{ ok: false, erro: string }`. Constantes exportadas `MAX_NOMES = 10`, `MIN_CARACTERES = 2`, `MAX_CARACTERES = 80`.

- [ ] **Step 1: Adicionar o script de teste em `package.json`**

Trocar o arquivo inteiro por:

```json
{
  "name": "casamento-ak",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Site de casamento Alexandre & Karla — lista de presentes com pagamento via Mercado Pago",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Escrever os testes que falham** em `tests/validar-presenca.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarPresenca, MAX_NOMES } from '../lib/validar-presenca.js';

test('aceita confirmação válida e normaliza espaços', () => {
  const r = validarPresenca({ vai: true, nomes: ['  Maria   Silva ', 'João'], site: '' });
  assert.deepEqual(r, { ok: true, dados: { vai: true, nomes: ['Maria Silva', 'João'] } });
});

test('aceita quem não vai', () => {
  const r = validarPresenca({ vai: false, nomes: ['Carlos Souza'] });
  assert.deepEqual(r, { ok: true, dados: { vai: false, nomes: ['Carlos Souza'] } });
});

test('campo isca preenchido é tratado como robô', () => {
  assert.deepEqual(validarPresenca({ vai: true, nomes: ['Bot'], site: 'http://spam' }), { ok: true, isca: true });
});

test('rejeita corpo ausente', () => {
  assert.equal(validarPresenca(null).ok, false);
  assert.equal(validarPresenca('texto').ok, false);
});

test('rejeita "vai" que não é booleano', () => {
  assert.equal(validarPresenca({ vai: 'sim', nomes: ['Maria'] }).ok, false);
});

test('rejeita lista de nomes vazia ou ausente', () => {
  assert.equal(validarPresenca({ vai: true, nomes: [] }).ok, false);
  assert.equal(validarPresenca({ vai: true }).ok, false);
});

test('aceita exatamente 10 nomes e rejeita 11', () => {
  const dez = Array.from({ length: MAX_NOMES }, (_, i) => `Pessoa ${i + 1}`);
  assert.equal(validarPresenca({ vai: true, nomes: dez }).ok, true);
  assert.equal(validarPresenca({ vai: true, nomes: [...dez, 'Pessoa 11'] }).ok, false);
});

test('rejeita nome curto demais e aceita 2 caracteres', () => {
  assert.equal(validarPresenca({ vai: true, nomes: ['A'] }).ok, false);
  assert.equal(validarPresenca({ vai: true, nomes: ['Lu'] }).ok, true);
});

test('aceita 80 caracteres e rejeita 81', () => {
  assert.equal(validarPresenca({ vai: true, nomes: ['a'.repeat(80)] }).ok, true);
  assert.equal(validarPresenca({ vai: true, nomes: ['a'.repeat(81)] }).ok, false);
});

test('rejeita nome que não é texto', () => {
  assert.equal(validarPresenca({ vai: true, nomes: [42] }).ok, false);
});

test('rejeita caractere de controle no nome', () => {
  assert.equal(validarPresenca({ vai: true, nomes: ['Ma\u0007ria'] }).ok, false);
});

test('mensagens de erro são legíveis', () => {
  const r = validarPresenca({ vai: true, nomes: ['A'] });
  assert.equal(r.erro, 'Cada nome precisa ter entre 2 e 80 caracteres');
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL com `Cannot find module '.../lib/validar-presenca.js'`

- [ ] **Step 4: Implementar** `lib/validar-presenca.js`

```js
// Validação pura do corpo enviado pelo formulário de confirmação de presença.
// Usada pela função api/confirmar-presenca.js e pelos testes (npm test).

export const MAX_NOMES = 10;
export const MIN_CARACTERES = 2;
export const MAX_CARACTERES = 80;

const CONTROLE = /[\u0000-\u001F\u007F]/;

export function validarPresenca(corpo) {
  if (!corpo || typeof corpo !== 'object') return { ok: false, erro: 'Dados inválidos' };

  // Campo isca: invisível para pessoas, robôs costumam preencher
  if (typeof corpo.site === 'string' && corpo.site.trim() !== '') return { ok: true, isca: true };

  if (typeof corpo.vai !== 'boolean') return { ok: false, erro: 'Informe se você vai ou não' };
  if (!Array.isArray(corpo.nomes) || corpo.nomes.length === 0) {
    return { ok: false, erro: 'Informe pelo menos um nome' };
  }
  if (corpo.nomes.length > MAX_NOMES) {
    return { ok: false, erro: `Máximo de ${MAX_NOMES} pessoas por confirmação` };
  }

  const nomes = [];
  for (const nome of corpo.nomes) {
    if (typeof nome !== 'string') return { ok: false, erro: 'Nome inválido' };
    const limpo = nome.trim().replace(/\s+/g, ' ');
    if (CONTROLE.test(limpo)) return { ok: false, erro: 'Nome inválido' };
    if (limpo.length < MIN_CARACTERES || limpo.length > MAX_CARACTERES) {
      return { ok: false, erro: `Cada nome precisa ter entre ${MIN_CARACTERES} e ${MAX_CARACTERES} caracteres` };
    }
    nomes.push(limpo);
  }
  return { ok: true, dados: { vai: corpo.vai, nomes } };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: PASS, 12 testes

- [ ] **Step 6: Commit**

```bash
git add package.json lib/validar-presenca.js tests/validar-presenca.test.js
git commit -m "Adiciona validação dos dados de confirmação de presença

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Função serverless `api/confirmar-presenca.js`

**Files:**
- Create: `api/confirmar-presenca.js`
- Create: `tests/confirmar-presenca.test.js`
- Modify: `dev-server.mjs:17` e `dev-server.mjs:31-48`

**Interfaces:**
- Consumes: `validarPresenca` de `lib/validar-presenca.js` (Task 1).
- Produces: `POST /api/confirmar-presenca` com corpo `{ vai, nomes, site }`. Respostas: `200 { ok: true }`, `400 { erro }`, `405`, `503 { erro: 'Confirmação indisponível no momento' }`, `502 { erro: 'Não foi possível registrar agora' }`. Repassa ao Apps Script o JSON `{ token, vai, nomes }`; espera de volta `{ ok: true }`.

- [ ] **Step 1: Escrever os testes que falham** em `tests/confirmar-presenca.test.js`

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/confirmar-presenca.js';

function respostaFalsa() {
  const res = { statusCode: 0, corpo: undefined };
  res.status = (codigo) => { res.statusCode = codigo; return res; };
  res.json = (obj) => { res.corpo = obj; return res; };
  return res;
}
const pedido = (body, method = 'POST') => ({ method, body });

const fetchOriginal = globalThis.fetch;
let chamadas;

beforeEach(() => {
  chamadas = [];
  process.env.APPS_SCRIPT_URL = 'https://script.exemplo/exec';
  process.env.RSVP_TOKEN = 'token-teste';
  globalThis.fetch = async (url, opcoes) => {
    chamadas.push({ url, opcoes });
    return { ok: true, json: async () => ({ ok: true }) };
  };
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  delete process.env.APPS_SCRIPT_URL;
  delete process.env.RSVP_TOKEN;
});

test('recusa métodos que não são POST', async () => {
  const res = respostaFalsa();
  await handler(pedido(undefined, 'GET'), res);
  assert.equal(res.statusCode, 405);
});

test('repassa confirmação válida ao Apps Script com o token', async () => {
  const res = respostaFalsa();
  await handler(pedido({ vai: true, nomes: ['Maria Silva', 'João Silva'], site: '' }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.corpo, { ok: true });
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, 'https://script.exemplo/exec');
  assert.equal(chamadas[0].opcoes.method, 'POST');
  assert.deepEqual(JSON.parse(chamadas[0].opcoes.body), {
    token: 'token-teste', vai: true, nomes: ['Maria Silva', 'João Silva'],
  });
});

test('aceita corpo em texto, como chega no dev-server', async () => {
  const res = respostaFalsa();
  await handler(pedido(JSON.stringify({ vai: false, nomes: ['Carlos'] })), res);
  assert.equal(res.statusCode, 200);
});

test('responde 400 para dados inválidos sem chamar o Apps Script', async () => {
  const res = respostaFalsa();
  await handler(pedido({ vai: true, nomes: [] }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.corpo.erro, 'Informe pelo menos um nome');
  assert.equal(chamadas.length, 0);
});

test('responde 400 para JSON malformado', async () => {
  const res = respostaFalsa();
  await handler(pedido('{quebrado'), res);
  assert.equal(res.statusCode, 400);
});

test('isca preenchida finge sucesso e não grava', async () => {
  const res = respostaFalsa();
  await handler(pedido({ vai: true, nomes: ['Robô'], site: 'spam' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(chamadas.length, 0);
});

test('sem variáveis de ambiente responde 503', async () => {
  delete process.env.APPS_SCRIPT_URL;
  const res = respostaFalsa();
  await handler(pedido({ vai: true, nomes: ['Maria'] }), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.corpo.erro, 'Confirmação indisponível no momento');
});

test('recusa do Apps Script vira 502', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: false, erro: 'token' }) });
  const res = respostaFalsa();
  await handler(pedido({ vai: true, nomes: ['Maria'] }), res);
  assert.equal(res.statusCode, 502);
});

test('erro de rede vira 502', async () => {
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  const res = respostaFalsa();
  await handler(pedido({ vai: true, nomes: ['Maria'] }), res);
  assert.equal(res.statusCode, 502);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL com `Cannot find module '.../api/confirmar-presenca.js'`

- [ ] **Step 3: Implementar** `api/confirmar-presenca.js`

```js
// ===== Função serverless: registra confirmação de presença na planilha Google =====
// Valida o formulário e repassa ao Apps Script publicado na planilha dos noivos.
// Sem APPS_SCRIPT_URL / RSVP_TOKEN no ambiente, responde 503 (confirmação indisponível).

import { validarPresenca } from '../lib/validar-presenca.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }

  let corpo;
  try {
    corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    res.status(400).json({ erro: 'Dados inválidos' });
    return;
  }

  const resultado = validarPresenca(corpo);
  if (!resultado.ok) {
    res.status(400).json({ erro: resultado.erro });
    return;
  }
  // Robô caiu na isca: finge sucesso sem gravar nada
  if (resultado.isca) {
    res.status(200).json({ ok: true });
    return;
  }

  const url = process.env.APPS_SCRIPT_URL;
  const token = process.env.RSVP_TOKEN;
  if (!url || !token) {
    res.status(503).json({ erro: 'Confirmação indisponível no momento' });
    return;
  }

  try {
    // O Apps Script responde com um redirect; o fetch do Node segue sozinho
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...resultado.dados }),
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok || dados.ok !== true) {
      res.status(502).json({ erro: 'Não foi possível registrar agora' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch {
    res.status(502).json({ erro: 'Não foi possível registrar agora' });
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS, 21 testes (12 da Task 1 + 9)

- [ ] **Step 5: Rotear a nova função no `dev-server.mjs`**

Trocar a linha 17:

```js
const { default: criarPagamento } = await import('./api/criar-pagamento.js');
```

por:

```js
// Funções de api/ que rodariam sozinhas na Vercel
const ROTAS_API = {
  '/api/criar-pagamento': (await import('./api/criar-pagamento.js')).default,
  '/api/confirmar-presenca': (await import('./api/confirmar-presenca.js')).default,
};
```

E trocar o bloco das linhas 31-48 (de `// ---- Rota da API` até o `return; }` correspondente) por:

```js
  // ---- Rotas da API (executam as funções serverless) ----
  const funcaoApi = ROTAS_API[url.pathname];
  if (funcaoApi) {
    let body = '';
    for await (const chunk of req) body += chunk;
    req.body = body;
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(obj));
    };
    try {
      await funcaoApi(req, res);
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ erro: 'Falha na função', detalhe: String(e) }));
    }
    return;
  }
```

- [ ] **Step 6: Conferir o dev-server à mão**

Run (em background): `PORT=3002 node dev-server.mjs`
Run: `curl -s -X POST http://localhost:3002/api/confirmar-presenca -H "Content-Type: application/json" -d '{"vai":true,"nomes":["Maria Silva"]}'`
Expected: `{"erro":"Confirmação indisponível no momento"}` (ainda sem `APPS_SCRIPT_URL` no `.env`)
Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/`
Expected: `200` (site continua servindo)

- [ ] **Step 7: Commit**

```bash
git add api/confirmar-presenca.js tests/confirmar-presenca.test.js dev-server.mjs
git commit -m "Adiciona função que repassa confirmações ao Apps Script

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Apps Script da planilha

**Files:**
- Create: `google-apps-script/confirmacao.gs`
- Create: `tests/apps-script.test.js`
- Modify: `.vercelignore`

**Interfaces:**
- Consumes: JSON `{ token, vai, nomes }` enviado pela Task 2.
- Produces: `doPost(e)` responde JSON `{ ok: true }` ou `{ ok: false, erro: 'json' | 'token' | 'dados' }`; `configurar()` cria as abas. Placeholder de token no arquivo: `'COLE_AQUI_O_TOKEN'` (trocado pelo usuário na planilha, nunca commitado com o valor real).

- [ ] **Step 1: Escrever os testes que falham** em `tests/apps-script.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const CODIGO = readFileSync(new URL('../google-apps-script/confirmacao.gs', import.meta.url), 'utf8');
const CABECALHO = ['Data/hora', 'Nome', 'Vai?', 'Confirmado por'];

// Simula o pedaço do Google que o script usa e roda o .gs num contexto isolado
function criarAmbiente() {
  const abas = {};
  const novaAba = () => {
    const linhas = [];
    const formulas = {};
    return {
      linhas, formulas,
      getLastRow: () => linhas.length,
      appendRow: (linha) => { linhas.push(linha); },
      setFrozenRows: () => {},
      getRange: (a) => (typeof a === 'string'
        ? { setValues: () => {}, setFormula: (f) => { formulas[a] = f; } }
        : { setValues: (valores) => { valores.forEach((v, i) => { linhas[a - 1 + i] = v; }); } }),
    };
  };
  const planilha = {
    getSheetByName: (nome) => abas[nome] || null,
    insertSheet: (nome) => (abas[nome] = novaAba()),
  };
  let travas = 0;
  const contexto = {
    SpreadsheetApp: { getActiveSpreadsheet: () => planilha },
    LockService: { getScriptLock: () => ({ waitLock: () => { travas++; }, releaseLock: () => { travas--; } }) },
    Utilities: { formatDate: () => '14/11/2026 19:02' },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (texto) => ({ texto, setMimeType() { return this; } }),
    },
  };
  vm.createContext(contexto);
  vm.runInContext(CODIGO.replace("'COLE_AQUI_O_TOKEN'", "'segredo'"), contexto);
  const post = (conteudo) => JSON.parse(contexto.doPost({ postData: { contents: conteudo } }).texto);
  return { contexto, abas, post, travas: () => travas };
}

test('grava uma linha por pessoa, com cabeçalho', () => {
  const amb = criarAmbiente();
  const r = amb.post(JSON.stringify({ token: 'segredo', vai: true, nomes: ['Maria Silva', 'João Silva'] }));
  assert.deepEqual(r, { ok: true });
  assert.deepEqual(amb.abas['Confirmações'].linhas, [
    CABECALHO,
    ['14/11/2026 19:02', 'Maria Silva', 'Sim', 'Maria Silva'],
    ['14/11/2026 19:02', 'João Silva', 'Sim', 'Maria Silva'],
  ]);
});

test('marca "Não" para quem não vai', () => {
  const amb = criarAmbiente();
  amb.post(JSON.stringify({ token: 'segredo', vai: false, nomes: ['Carlos Souza'] }));
  assert.equal(amb.abas['Confirmações'].linhas[1][2], 'Não');
});

test('recusa token errado e não grava nada', () => {
  const amb = criarAmbiente();
  const r = amb.post(JSON.stringify({ token: 'errado', vai: true, nomes: ['Maria'] }));
  assert.deepEqual(r, { ok: false, erro: 'token' });
  assert.equal(amb.abas['Confirmações'], undefined);
});

test('recusa JSON malformado e dados incompletos', () => {
  const amb = criarAmbiente();
  assert.deepEqual(amb.post('{quebrado'), { ok: false, erro: 'json' });
  assert.deepEqual(amb.post(JSON.stringify({ token: 'segredo', vai: true, nomes: [] })), { ok: false, erro: 'dados' });
});

test('neutraliza valores que virariam fórmula', () => {
  const amb = criarAmbiente();
  amb.post(JSON.stringify({ token: 'segredo', vai: true, nomes: ['=HYPERLINK("x")', '+55', '-1', '@x', 'Ana'] }));
  const nomes = amb.abas['Confirmações'].linhas.slice(1).map((l) => l[1]);
  assert.deepEqual(nomes, ["'=HYPERLINK(\"x\")", "'+55", "'-1", "'@x", 'Ana']);
});

test('sempre libera a trava depois de gravar', () => {
  const amb = criarAmbiente();
  amb.post(JSON.stringify({ token: 'segredo', vai: true, nomes: ['Maria'] }));
  assert.equal(amb.travas(), 0);
});

test('configurar cria as abas e as fórmulas do resumo', () => {
  const amb = criarAmbiente();
  amb.contexto.configurar();
  assert.deepEqual(amb.abas['Confirmações'].linhas, [CABECALHO]);
  const f = amb.abas['Resumo'].formulas;
  assert.match(f.B1, /COUNTIF\('Confirmações'!C:C,"Sim"\)/);
  assert.match(f.B2, /COUNTIF\('Confirmações'!C:C,"Não"\)/);
  assert.match(f.B3, /COUNTUNIQUE/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL com `ENOENT ... google-apps-script/confirmacao.gs`

- [ ] **Step 3: Implementar** `google-apps-script/confirmacao.gs`

```js
// Apps Script da planilha de confirmações de presença do casamento.
// Cole este código em Extensões → Apps Script, na planilha dos noivos.
// 1) Troque o TOKEN pelo código recebido.
// 2) Rode configurar() uma vez e autorize.
// 3) Implantar → Nova implantação → App da Web (executar como: eu; acesso: qualquer pessoa).

const TOKEN = 'COLE_AQUI_O_TOKEN';
const ABA_CONFIRMACOES = 'Confirmações';
const ABA_RESUMO = 'Resumo';
const CABECALHO = ['Data/hora', 'Nome', 'Vai?', 'Confirmado por'];

function configurar() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const aba = abaConfirmacoes(planilha);
  aba.setFrozenRows(1);

  const resumo = planilha.getSheetByName(ABA_RESUMO) || planilha.insertSheet(ABA_RESUMO);
  resumo.getRange('A1:A3').setValues([['Vão'], ['Não vão'], ['Confirmações recebidas']]);
  const ref = `'${ABA_CONFIRMACOES}'`;
  resumo.getRange('B1').setFormula(`=COUNTIF(${ref}!C:C,"Sim")`);
  resumo.getRange('B2').setFormula(`=COUNTIF(${ref}!C:C,"Não")`);
  resumo.getRange('B3').setFormula(
    `=IFERROR(COUNTUNIQUE(FILTER(${ref}!A2:A&${ref}!D2:D,${ref}!A2:A<>"")),0)`
  );
}

function doPost(e) {
  let dados;
  try {
    dados = JSON.parse(e.postData.contents);
  } catch (erro) {
    return responder({ ok: false, erro: 'json' });
  }
  if (dados.token !== TOKEN) return responder({ ok: false, erro: 'token' });
  if (typeof dados.vai !== 'boolean' || !Array.isArray(dados.nomes) || dados.nomes.length === 0) {
    return responder({ ok: false, erro: 'dados' });
  }

  // Fila: duas confirmações ao mesmo tempo não sobrescrevem a mesma linha
  const trava = LockService.getScriptLock();
  trava.waitLock(10000);
  try {
    const aba = abaConfirmacoes(SpreadsheetApp.getActiveSpreadsheet());
    const quando = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
    const nomes = dados.nomes.map(neutralizar);
    const vai = dados.vai ? 'Sim' : 'Não';
    const linhas = nomes.map((nome) => [quando, nome, vai, nomes[0]]);
    aba.getRange(aba.getLastRow() + 1, 1, linhas.length, CABECALHO.length).setValues(linhas);
  } finally {
    trava.releaseLock();
  }
  return responder({ ok: true });
}

function abaConfirmacoes(planilha) {
  const aba = planilha.getSheetByName(ABA_CONFIRMACOES) || planilha.insertSheet(ABA_CONFIRMACOES);
  if (aba.getLastRow() === 0) aba.appendRow(CABECALHO);
  return aba;
}

// Impede que um nome como "=IMPORTXML(...)" seja executado como fórmula na planilha
function neutralizar(valor) {
  const texto = String(valor);
  return /^[=+\-@]/.test(texto) ? "'" + texto : texto;
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS, 28 testes

- [ ] **Step 5: Tirar testes e script do deploy** — acrescentar ao fim de `.vercelignore`:

```
tests
google-apps-script
```

- [ ] **Step 6: Commit**

```bash
git add google-apps-script/confirmacao.gs tests/apps-script.test.js .vercelignore
git commit -m "Adiciona Apps Script que grava as confirmações na planilha

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Formulário no site

**Files:**
- Create: `presenca.js`
- Modify: `index.html` (capa, nova seção, script)
- Modify: `principal.css` (títulos compartilhados, estilos novos, celular)

**Interfaces:**
- Consumes: `POST /api/confirmar-presenca` (Task 2). Mensagens de erro do servidor vêm em `{ erro }`.
- Produces: seção `#confirmar-presenca` com o formulário `#formPresenca`.

- [ ] **Step 1: Botão na capa** — em `index.html`, logo depois do `</div>` que fecha `<div class="countdown">` (antes do `</div>` que fecha `.hero-content`), inserir:

```html
            <a href="#confirmar-presenca" class="hero-cta">Confirmar presença</a>
```

- [ ] **Step 2: Seção** — em `index.html`, imediatamente antes de `    <!-- Seção de Presentes em grade -->`, inserir:

```html
    <!-- Confirmação de presença (grava na planilha Google dos noivos) -->
    <section class="presenca" id="confirmar-presenca">
        <div class="container">
            <p class="section-eyebrow">lista de presença</p>
            <h2>Confirme sua<br><em>presença</em></h2>
            <p class="presenca-prazo">Confirme até 20 de dezembro de 2026</p>

            <div class="presenca-card">
                <form id="formPresenca" novalidate>
                    <p class="presenca-pergunta">Você vai?</p>
                    <div class="presenca-opcoes">
                        <button type="button" class="presenca-opcao" data-vai="true" aria-pressed="false">Vou, com certeza! 🎉</button>
                        <button type="button" class="presenca-opcao" data-vai="false" aria-pressed="false">Infelizmente não poderei ir</button>
                    </div>

                    <p class="presenca-pergunta">Nome de cada pessoa</p>
                    <div id="presencaNomes" class="presenca-nomes"></div>
                    <button type="button" id="presencaAdicionar" class="presenca-adicionar">+ adicionar pessoa</button>

                    <!-- Campo isca: invisível para pessoas, robôs costumam preencher -->
                    <input type="text" id="presencaSite" class="presenca-isca" tabindex="-1" autocomplete="off" aria-hidden="true">

                    <p id="presencaErro" class="presenca-erro" role="alert" hidden></p>
                    <button type="submit" id="presencaEnviar" class="btn-form">Enviar confirmação</button>
                </form>

                <p id="presencaSucesso" class="presenca-sucesso" role="status" hidden></p>
            </div>
        </div>
    </section>

```

- [ ] **Step 3: Script** — em `index.html`, depois de `<script src="principal.js"></script>`, inserir:

```html
    <script src="presenca.js"></script>
```

- [ ] **Step 4: Comportamento** — criar `presenca.js`:

```js
// ===== CONFIRMAÇÃO DE PRESENÇA =====
// Formulário aberto: escolhe "vou / não vou", lista os nomes e envia para
// /api/confirmar-presenca, que grava na planilha Google dos noivos.
(function () {
    const MAX_NOMES = 10;
    const form = document.getElementById('formPresenca');
    if (!form) return;

    const listaNomes = document.getElementById('presencaNomes');
    const botaoAdicionar = document.getElementById('presencaAdicionar');
    const botaoEnviar = document.getElementById('presencaEnviar');
    const erro = document.getElementById('presencaErro');
    const sucesso = document.getElementById('presencaSucesso');
    const opcoes = form.querySelectorAll('.presenca-opcao');
    let vai = null;

    function adicionarCampo(focar) {
        const total = listaNomes.children.length;
        if (total >= MAX_NOMES) return;
        const linha = document.createElement('div');
        linha.className = 'presenca-nome';

        const campo = document.createElement('input');
        campo.type = 'text';
        campo.maxLength = 80;
        campo.autocomplete = total === 0 ? 'name' : 'off';
        campo.placeholder = total === 0 ? 'Seu nome completo' : 'Nome completo';
        campo.setAttribute('aria-label', total === 0 ? 'Seu nome completo' : `Nome da pessoa ${total + 1}`);
        linha.appendChild(campo);

        if (total > 0) {
            const remover = document.createElement('button');
            remover.type = 'button';
            remover.className = 'presenca-remover';
            remover.setAttribute('aria-label', 'Remover pessoa');
            remover.textContent = '✕';
            remover.addEventListener('click', () => { linha.remove(); atualizarAdicionar(); });
            linha.appendChild(remover);
        }

        listaNomes.appendChild(linha);
        atualizarAdicionar();
        if (focar) campo.focus();
    }

    function atualizarAdicionar() {
        botaoAdicionar.hidden = listaNomes.children.length >= MAX_NOMES;
    }

    function mostrarErro(texto) {
        erro.textContent = texto;
        erro.hidden = !texto;
    }

    function mostrarSucesso(nomes) {
        const primeiro = nomes[0].split(' ')[0];
        sucesso.textContent = vai
            ? `Oba, ${primeiro}! Presença confirmada pra ${nomes.length} ${nomes.length === 1 ? 'pessoa' : 'pessoas'} 💛`
            : `Que pena! Obrigado por avisar, ${primeiro}`;
        form.hidden = true;
        sucesso.hidden = false;
    }

    opcoes.forEach((opcao) => {
        opcao.addEventListener('click', () => {
            vai = opcao.dataset.vai === 'true';
            opcoes.forEach((o) => o.setAttribute('aria-pressed', String(o === opcao)));
            mostrarErro('');
        });
    });

    botaoAdicionar.addEventListener('click', () => adicionarCampo(true));

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const nomes = [...listaNomes.querySelectorAll('input')]
            .map((c) => c.value.trim().replace(/\s+/g, ' '))
            .filter(Boolean);

        if (vai === null) return mostrarErro('Escolha se você vai ou não.');
        if (nomes.length === 0) return mostrarErro('Escreva pelo menos o seu nome.');
        if (nomes.some((n) => n.length < 2)) return mostrarErro('Escreva o nome completo de cada pessoa.');

        mostrarErro('');
        const textoOriginal = botaoEnviar.textContent;
        botaoEnviar.disabled = true;
        botaoEnviar.textContent = 'Enviando...';
        try {
            const resposta = await fetch('/api/confirmar-presenca', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vai, nomes, site: document.getElementById('presencaSite').value }),
            });
            if (resposta.status === 503) throw new Error('Confirmação indisponível no momento. Tente mais tarde.');
            if (!resposta.ok) {
                const dados = await resposta.json().catch(() => ({}));
                throw new Error(dados.erro || 'Não foi possível enviar. Tente de novo.');
            }
            mostrarSucesso(nomes);
        } catch (e) {
            mostrarErro(e instanceof TypeError ? 'Sem conexão. Confira sua internet e tente de novo.' : e.message);
        } finally {
            botaoEnviar.disabled = false;
            botaoEnviar.textContent = textoOriginal;
        }
    });

    adicionarCampo(false);
})();
```

- [ ] **Step 5: Títulos compartilhados** — rodar no diretório do projeto:

```bash
python3 -I - <<'PY'
p = "principal.css"
s = open(p, encoding="utf-8").read()
s = s.replace(".locais h2 em", ".locais h2 em, .presenca h2 em")
s = s.replace(".locais h2 {", ".locais h2, .presenca h2 {")
open(p, "w", encoding="utf-8").write(s)
PY
grep -n "presenca h2" principal.css
```

Expected: 6 linhas (regra base de `h2` e de `h2 em`, mais as duas media queries de cada).

- [ ] **Step 6: Estilos** — em `principal.css`, imediatamente antes de `/* ===== FOOTER ===== */`, inserir:

```css
/* ===== CONFIRMAÇÃO DE PRESENÇA ===== */
html { scroll-behavior: smooth; }

.hero-cta {
    display: inline-block;
    margin-top: 32px;
    padding: 14px 32px;
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 30px;
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    text-decoration: none;
    font-family: 'Montserrat', sans-serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 2px;
    text-transform: uppercase;
    transition: all 0.25s;
}

.hero-cta:hover { background: #fff; color: #5a3e35; }

.presenca {
    padding: 100px 20px 80px;
    background: #f7f1ea;
    scroll-margin-top: 70px;
}

.presenca h2 { margin-bottom: 16px; }

.presenca-prazo {
    font-family: 'Montserrat', sans-serif;
    font-size: 13px;
    letter-spacing: 1px;
    color: #8b6f5e;
    text-align: center;
    margin-bottom: 40px;
}

.presenca-card {
    max-width: 520px;
    margin: 0 auto;
    padding: 32px 28px;
    border: 1px solid #ede8e3;
    border-radius: 12px;
    background: #fff;
}

/* garante que [hidden] vença os display definidos nas classes */
.presenca-card [hidden] { display: none !important; }

.presenca-pergunta {
    font-family: 'Montserrat', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #8b6f5e;
    margin-bottom: 12px;
}

.presenca-opcoes {
    display: flex;
    gap: 10px;
    margin-bottom: 28px;
}

.presenca-opcao {
    flex: 1;
    padding: 14px 12px;
    border: 1.5px solid #e2d6c8;
    border-radius: 10px;
    background: #fff;
    color: #5a3e35;
    font-family: 'Montserrat', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.presenca-opcao:hover { border-color: #c9a882; }

.presenca-opcao[aria-pressed="true"] {
    background: #8b6f5e;
    border-color: #8b6f5e;
    color: #fff;
}

.presenca-nomes {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 8px;
}

.presenca-nome { display: flex; gap: 8px; }

.presenca-nome input {
    flex: 1;
    min-width: 0;
    padding: 12px 14px;
    border: 1px solid #e2d6c8;
    border-radius: 8px;
    background: #fff;
    color: #2c2c2c;
    font-family: 'Montserrat', sans-serif;
    font-size: 15px;
}

.presenca-nome input:focus {
    outline: none;
    border-color: #c9a882;
    box-shadow: 0 0 0 3px rgba(201, 168, 130, 0.18);
}

.presenca-remover {
    width: 44px;
    border: 1px solid #e2d6c8;
    border-radius: 8px;
    background: #fff;
    color: #8b6f5e;
    font-size: 14px;
    cursor: pointer;
}

.presenca-remover:hover { color: #c9836a; border-color: #c9836a; }

.presenca-adicionar {
    display: inline-block;
    padding: 6px 0;
    margin-bottom: 20px;
    border: none;
    background: none;
    color: #c9836a;
    font-family: 'Montserrat', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
}

.presenca-isca {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    opacity: 0;
}

.presenca-erro {
    color: #b3261e;
    font-family: 'Montserrat', sans-serif;
    font-size: 13px;
    margin-bottom: 12px;
}

.presenca-sucesso {
    padding: 24px 0;
    text-align: center;
    font-family: 'Cormorant Garamond', serif;
    font-size: 24px;
    line-height: 1.4;
    color: #5a3e35;
}

```

- [ ] **Step 7: Celular** — dentro de `@media (max-width: 480px) {`, logo depois da linha `    .local-mapa { height: 200px; }`, inserir:

```css
    .presenca { padding: 72px 16px 56px; }
    .presenca-card { padding: 24px 18px; }
    .presenca-opcoes { flex-direction: column; }
    .hero-cta { margin-top: 24px; padding: 12px 26px; }
```

- [ ] **Step 8: Rodar os testes de novo** (garante que nada quebrou)

Run: `npm test`
Expected: PASS, 28 testes

- [ ] **Step 9: Conferir no navegador** com o dev-server (`PORT=3002 node dev-server.mjs`) e um Apps Script falso:

Subir um servidor falso que finge ser o Google (em background), num arquivo temporário fora do repositório:

```bash
node -e "require('http').createServer((q,r)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{console.log(b);r.setHeader('Content-Type','application/json');r.end('{\"ok\":true}')})}).listen(3003)"
```

Reiniciar o dev-server com `APPS_SCRIPT_URL=http://localhost:3003 RSVP_TOKEN=teste PORT=3002 node dev-server.mjs`. No navegador, em `http://localhost:3002`, conferir:
1. Botão "Confirmar presença" na capa rola até a seção.
2. Enviar sem escolher → "Escolha se você vai ou não."
3. Escolher "Vou", preencher 1 nome, adicionar mais 2 → enviar → "Oba, Maria! Presença confirmada pra 3 pessoas 💛"; o servidor falso imprime `{"token":"teste","vai":true,"nomes":[...]}`.
4. "+ adicionar pessoa" some ao chegar em 10 campos; ✕ remove.
5. Parar o servidor falso e enviar → "Não foi possível registrar agora"; os nomes continuam preenchidos.
6. Sem as variáveis (dev-server normal) → "Confirmação indisponível no momento. Tente mais tarde."
7. Celular (375px): opções empilhadas, sem rolagem lateral.

- [ ] **Step 10: Commit**

```bash
git add presenca.js index.html principal.css
git commit -m "Adiciona formulário de confirmação de presença ao site

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Configuração no Google, Vercel e deploy

Depende do usuário: ele cria a planilha e publica o script. Nada aqui vai ao ar sem o ok dele.

**Files:**
- Modify: `.env` (local, ignorado pelo git)

**Interfaces:**
- Consumes: `google-apps-script/confirmacao.gs` (Task 3), `api/confirmar-presenca.js` (Task 2).

- [ ] **Step 1: Gerar o token**

Run: `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`
Guardar o valor; ele vai no script do Google e na Vercel. Nunca commitar.

- [ ] **Step 2: Guiar o usuário no Google** (em conversa, passo a passo):
1. Criar uma planilha em sheets.new (conta dos noivos ou do usuário) com o nome "Confirmações - Casamento A&K".
2. Extensões → Apps Script → apagar o conteúdo → colar `google-apps-script/confirmacao.gs` com o token no lugar de `COLE_AQUI_O_TOKEN` → salvar.
3. Escolher a função `configurar` → Executar → autorizar a conta (o Google avisa "app não verificado": Avançado → Acessar).
4. Implantar → Nova implantação → tipo "App da Web" → executar como "Eu" → acesso "Qualquer pessoa" → Implantar → copiar a URL que termina em `/exec`.

- [ ] **Step 3: Teste ponta a ponta local** — acrescentar ao `.env`:

```
APPS_SCRIPT_URL=<url /exec recebida>
RSVP_TOKEN=<token do Step 1>
```

Reiniciar o dev-server e rodar:

Run: `curl -s -X POST http://localhost:3002/api/confirmar-presenca -H "Content-Type: application/json" -d '{"vai":true,"nomes":["Teste Claude"],"site":""}'`
Expected: `{"ok":true}` e uma linha "Teste Claude" na planilha. Pedir ao usuário para apagar essa linha de teste.

- [ ] **Step 4: Variáveis na Vercel**

```bash
printf '%s' "<url /exec>" | vercel env add APPS_SCRIPT_URL production
printf '%s' "<token>" | vercel env add RSVP_TOKEN production
vercel env ls
```

Expected: as duas variáveis listadas em Production.

- [ ] **Step 5: Push e deploy (com ok do usuário)**

```bash
git push
vercel --prod --yes
```

- [ ] **Step 6: Verificar em produção**

Run: `curl -s -X POST https://casamento-alexandre-karla.vercel.app/api/confirmar-presenca -H "Content-Type: application/json" -d '{"vai":true,"nomes":[]}'`
Expected: `{"erro":"Informe pelo menos um nome"}` (função no ar, sem gravar)
Conferir no navegador que a seção aparece e que `presenca.js` responde 200. Fazer uma confirmação real de teste com o usuário e apagar a linha depois.
