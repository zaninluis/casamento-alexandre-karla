# Confirmação de presença (RSVP): design

Data: 2026-10-15
Status: aprovado pelo usuário em conversa

## Objetivo

Qualquer pessoa com o link do site confirma se vai (ou não) ao casamento e lista os nomes de quem vem junto. Os noivos acompanham tudo numa planilha Google, sem cadastrar convidados antes.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Quem confirma | Lista aberta: qualquer pessoa com o link |
| Onde os noivos consultam | Planilha Google |
| Dados pedidos | "Vai ou não vai" + nomes (1 a 10 por envio). Sem telefone, sem adulto/criança |
| Integração | Formulário no site → função na Vercel → Apps Script → planilha (opção A) |
| Prazo | "Confirme até 20 de dezembro de 2026". Depois do prazo o formulário continua aceitando |
| Envios repetidos | Aceitos; a planilha mostra data/hora para os noivos verem o mais recente |

## Experiência do convidado

- Nova seção **"Confirme sua presença"** entre "Onde vai ser" e a lista de presentes, com o texto do prazo.
- Botão **"Confirmar presença"** na capa, abaixo da contagem regressiva, rolando até a seção.
- Formulário em card no estilo do site:
  1. Escolha obrigatória: **"Vou, com certeza! 🎉"** ou **"Infelizmente não poderei ir"**.
  2. Campo "Seu nome completo" + botão **"+ adicionar pessoa"** (cada campo extra tem ✕ para remover). Máximo de 10 nomes.
  3. Botão **"Enviar confirmação"**, desabilitado durante o envio.
- Sucesso: o formulário dá lugar a uma mensagem ("Oba, Maria! Presença confirmada pra 3 pessoas 💛" ou "Que pena! Obrigado por avisar, Maria").
- Erro: mensagem pedindo para tentar de novo; o que foi digitado é mantido.

## Planilha

Aba **"Confirmações"**, uma linha por pessoa:

| Data/hora | Nome | Vai? | Confirmado por |
|---|---|---|---|

- "Data/hora" no fuso America/Sao_Paulo.
- "Confirmado por" = nome completo da primeira pessoa listada naquele envio.

Aba **"Resumo"** com fórmulas: total que vai, total que não vai e número de envios.

## Fluxo de dados e segurança

```
index.html (formulário) --POST JSON--> /api/confirmar-presenca (Vercel)
    --POST JSON + token--> Apps Script (doPost) --> planilha
```

**Função `api/confirmar-presenca.js`** (Node, mesmo padrão de `api/criar-pagamento.js`):
- Aceita só POST. Corpo: `{ vai: boolean, nomes: string[], site: string }`.
- `site` é campo isca (honeypot): se vier preenchido, responde sucesso falso sem gravar.
- Valida: `vai` booleano; 1 a 10 nomes; cada nome com 2 a 80 caracteres após `trim`, sem caracteres de controle.
- Sem `APPS_SCRIPT_URL` ou `RSVP_TOKEN` no ambiente: responde 503 (o front mostra "confirmação indisponível no momento").
- Repassa ao Apps Script com o token; responde 502 se o Apps Script falhar.
- A validação fica numa função pura exportada, testável com `node --test`.

**Apps Script** (colado na planilha pelo usuário):
- `doPost`: confere o token; usa `LockService` para enfileirar escritas simultâneas; grava uma linha por nome.
- Neutraliza injeção de fórmula: valores começando com `=`, `+`, `-` ou `@` recebem um apóstrofo na frente.
- `configurar()`: rodada uma vez; cria cabeçalho, aba "Resumo" com fórmulas e dispara a autorização do Google.

**Variáveis de ambiente (Vercel e `.env` local):** `APPS_SCRIPT_URL`, `RSVP_TOKEN` (gerado aleatoriamente, colado também no script).

## Configuração manual (uma vez)

1. Criar planilha na conta Google dos noivos (ou do usuário, compartilhando com eles).
2. Extensões → Apps Script → colar o script → preencher o token → rodar `configurar()` e autorizar.
3. Implantar como app da Web: executar como "eu", acesso "qualquer pessoa".
4. Enviar a URL gerada; ela vai para `APPS_SCRIPT_URL` na Vercel, junto com o `RSVP_TOKEN`.

## Fora do escopo

- Painel de convidados no site, cadastro prévio, bloqueio de envios repetidos, notificação por WhatsApp/e-mail.

## Testes

- `node --test` para a validação (casos válidos, limites, honeypot, tipos errados).
- Teste ponta a ponta local com `dev-server.mjs` apontando para uma planilha de teste.
- Conferência visual no navegador (desktop e celular) antes do deploy.

## Observação

A pasta `docs/` entra no `.vercelignore` para não ser publicada junto com o site.
