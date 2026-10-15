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
