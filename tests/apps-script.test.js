import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const CODIGO = readFileSync(new URL('../google-apps-script/confirmacao.gs', import.meta.url), 'utf8');
const CABECALHO = ['Data/hora', 'Nome', 'Vai?', 'Confirmado por'];

// Arrays criados dentro do vm têm outro Array.prototype; copia para comparar com deepEqual
const copiar = (valor) => JSON.parse(JSON.stringify(valor));

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
  assert.deepEqual(copiar(amb.abas['Confirmações'].linhas), [
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
  assert.deepEqual(copiar(amb.abas['Confirmações'].linhas), [CABECALHO]);
  const f = amb.abas['Resumo'].formulas;
  assert.match(f.B1, /COUNTIF\('Confirmações'!C:C,"Sim"\)/);
  assert.match(f.B2, /COUNTIF\('Confirmações'!C:C,"Não"\)/);
  assert.match(f.B3, /COUNTUNIQUE/);
});
