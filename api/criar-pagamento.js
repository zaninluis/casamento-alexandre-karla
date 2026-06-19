// ===== Função serverless: cria a cobrança no Mercado Pago =====
// Em produção (Vercel) cria uma "preferência" do Checkout Pro com PIX + cartão + boleto.
// Sem credenciais (MP_ACCESS_TOKEN ausente), cai automaticamente em modo MOCK:
// devolve a URL da tela de checkout simulada para testar o fluxo sem cobrar de verdade.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }

  // O body pode vir como string dependendo do runtime
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { itens = [], nome = '', telefone = '' } = body;

  if (!Array.isArray(itens) || itens.length === 0) {
    res.status(400).json({ erro: 'Carrinho vazio' });
    return;
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;

  // Sem credenciais configuradas: pagamento ainda não habilitado
  if (!accessToken) {
    res.status(503).json({ erro: 'Pagamento não configurado (MP_ACCESS_TOKEN ausente)' });
    return;
  }

  // ---- Mercado Pago Checkout Pro ----
  try {
    const origem = `https://${req.headers.host}`;
    const resposta = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: itens.map((i) => ({
          title: i.nome,
          quantity: 1,
          unit_price: Number(i.preco),
          currency_id: 'BRL',
        })),
        payer: { name: nome },
        metadata: { telefone },
        // Métodos aceitos: PIX, cartão e boleto vêm habilitados por padrão no Checkout Pro
        back_urls: {
          success: `${origem}/?pago=1`,
          pending: `${origem}/?pendente=1`,
          failure: `${origem}/?erro=1`,
        },
        auto_return: 'approved',
        statement_descriptor: 'Casamento A&K',
      }),
    });

    const dados = await resposta.json();
    if (!resposta.ok) {
      res.status(502).json({ erro: 'Falha ao criar pagamento', detalhe: dados });
      return;
    }

    // sandbox_init_point = ambiente de teste / init_point = produção
    res.status(200).json({
      mock: false,
      url: dados.init_point || dados.sandbox_init_point,
    });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno', detalhe: String(e) });
  }
}
