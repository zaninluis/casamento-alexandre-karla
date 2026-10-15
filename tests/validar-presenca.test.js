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
