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
