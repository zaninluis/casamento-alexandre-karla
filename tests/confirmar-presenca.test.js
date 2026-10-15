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
