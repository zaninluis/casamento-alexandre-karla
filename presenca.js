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
