// Apps Script que grava as confirmações de presença do casamento numa planilha Google.
// Projeto independente (script.new) apontando para a planilha pelo ID.
// 1) Troque o TOKEN pelo código recebido e o ID_PLANILHA pelo ID da planilha
//    (o trecho entre /d/ e /edit no endereço dela).
// 2) Rode configurar() uma vez e autorize.
// 3) Implantar → Nova implantação → App da Web (executar como: eu; acesso: qualquer pessoa).

const TOKEN = 'COLE_AQUI_O_TOKEN';
const ID_PLANILHA = 'COLE_AQUI_O_ID_DA_PLANILHA';
const ABA_CONFIRMACOES = 'Confirmações';
const ABA_RESUMO = 'Resumo';
const CABECALHO = ['Data/hora', 'Nome', 'Vai?', 'Confirmado por'];

function configurar() {
  const planilha = SpreadsheetApp.openById(ID_PLANILHA);
  const aba = abaConfirmacoes(planilha);
  aba.setFrozenRows(1);

  const resumo = planilha.getSheetByName(ABA_RESUMO) || planilha.insertSheet(ABA_RESUMO);
  resumo.getRange('A1:A3').setValues([['Vão'], ['Não vão'], ['Confirmações recebidas']]);
  const ref = `'${ABA_CONFIRMACOES}'`;
  const s = separadorDeArgumentos(planilha);
  resumo.getRange('B1').setFormula(`=COUNTIF(${ref}!C:C${s}"Sim")`);
  resumo.getRange('B2').setFormula(`=COUNTIF(${ref}!C:C${s}"Não")`);
  resumo.getRange('B3').setFormula(
    `=IFERROR(ROWS(UNIQUE(FILTER(${ref}!A2:A&${ref}!D2:D${s}${ref}!A2:A<>"")))${s}0)`
  );
}

// Planilhas com vírgula decimal (ex.: pt_BR) separam os argumentos das fórmulas com ";"
function separadorDeArgumentos(planilha) {
  const idioma = String(planilha.getSpreadsheetLocale() || 'en_US').replace('_', '-');
  let virgulaDecimal = /^pt/i.test(idioma);
  try {
    virgulaDecimal = virgulaDecimal || (1.5).toLocaleString(idioma).indexOf(',') !== -1;
  } catch (erro) {
    // idioma desconhecido: fica com a regra acima
  }
  return virgulaDecimal ? ';' : ',';
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
    const aba = abaConfirmacoes(SpreadsheetApp.openById(ID_PLANILHA));
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
