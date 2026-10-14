// ===== CONTAGEM REGRESSIVA =====
function atualizarContagem() {
    const casamento = new Date('2027-01-08T17:00:00');
    const agora = new Date();
    const diff = casamento - agora;

    if (diff <= 0) {
        document.getElementById('cd-dias').textContent = '00';
        document.getElementById('cd-horas').textContent = '00';
        document.getElementById('cd-min').textContent = '00';
        document.getElementById('cd-seg').textContent = '00';
        return;
    }

    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('cd-dias').textContent = String(dias).padStart(2, '0');
    document.getElementById('cd-horas').textContent = String(horas).padStart(2, '0');
    document.getElementById('cd-min').textContent = String(minutos).padStart(2, '0');
    document.getElementById('cd-seg').textContent = String(segundos).padStart(2, '0');
}

atualizarContagem();
setInterval(atualizarContagem, 1000);

// ===== LISTA DE PRESENTES =====
// Para adicionar/remover presentes, edite só este array (imagens em img/presentes/)
// Opcional: enquadramento: 'inteira' (mostra a foto toda) ou uma posição CSS, ex. 'center top'
const PRESENTES = [
    { img: '01.jpg', nome: 'Só para dizer que não dei nada', preco: 152.00 },
    { img: '02.jpg', nome: 'Primeiro jantar dos noivos', preco: 323.40 },
    { img: '03.jpg', nome: 'Rolo de macarrão da noiva', preco: 172.20, enquadramento: 'inteira' },
    { img: '04.jpg', nome: 'Capacete contra rolo de macarrão da noiva', preco: 172.20 },
    { img: '05.jpg', nome: 'Tampão de ouvido para a noiva não escutar o noivo roncar', preco: 423.43 },
    { img: '06.jpg', nome: 'Aumente 30% da sua chance de pegar o buquê', preco: 450.00 },
    { img: '07.jpg', nome: 'Cobertor para a noiva que está sempre coberta de razão', preco: 182.66 },
    { img: '08.jpg', nome: 'Jogo de cozinha moderno', preco: 1000.00 },
    { img: '09.jpg', nome: 'Curso de culinária para a noiva', preco: 230.00 },
    { img: '10.jpg', nome: 'Spa day para relaxar após 1 ano organizando o casamento', preco: 400.00 },
    { img: '11.jpg', nome: 'Ajudinha para a lua de mel', preco: 1500.00 },
    { img: '12.jpg', nome: 'Prioridade na fila do buffet', preco: 560.00, enquadramento: 'center 20%' },
    { img: '13.jpg', nome: 'Diária em hotel 5 estrelas', preco: 700.00 },
    { img: '14.jpg', nome: 'Passagens para a lua de mel', preco: 3000.00 },
    { img: '15.jpg', nome: 'Raspar o cabelo do noivo', preco: 15000.00 },
    { img: '16.jpg', nome: 'Diária do pedreiro para a reforma do apartamento', preco: 170.00 },
    { img: '17.jpg', nome: 'Cueca sexy para a noite de núpcias', preco: 316.00 },
    { img: '18.jpg', nome: 'Taxa para a noiva não jogar o buquê para a sua namorada', preco: 700.00 },
    { img: '19.jpg', nome: 'Vaquinha para o Luan Santana cantar no casamento', preco: 650.00 },
    { img: '20.jpg', nome: 'Ajuda para pagar os boletos do casamento', preco: 550.00, enquadramento: 'center bottom' },
    { img: '21.jpg', nome: 'Dei o melhor presente', preco: 1100.00 },
];

const formatarBRL = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function renderPresentes() {
    const grid = document.getElementById('giftGrid');
    if (!grid) return;
    grid.innerHTML = PRESENTES.map((p, i) => {
        const estilo = p.enquadramento === 'inteira' ? 'object-fit: contain; background: #fff'
            : p.enquadramento ? `object-position: ${p.enquadramento}` : '';
        return `
        <div class="gift-card">
            <img class="gift-img" src="img/presentes/${p.img}" alt="${p.nome}" loading="lazy" style="${estilo}">
            <h3>${p.nome}</h3>
            <p class="price">${formatarBRL(p.preco)}</p>
            <button class="btn" onclick="adicionarCarrinho(${i})">Presentear</button>
        </div>`;
    }).join('');
}

renderPresentes();

// ===== CARRINHO =====
let carrinho = [];

function adicionarCarrinho(indice) {
    const presente = PRESENTES[indice];
    carrinho.push({ id: Date.now(), nome: presente.nome, preco: presente.preco });
    atualizarContador();
    atualizarCarrinho();
    const botao = event.target;
    const textoOriginal = botao.textContent;
    botao.textContent = '✓ Adicionado!';
    botao.disabled = true;
    setTimeout(() => { botao.textContent = textoOriginal; botao.disabled = false; }, 1500);
}

function atualizarContador() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = carrinho.length;
}

function atualizarCarrinho() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartTotalDiv = document.getElementById('cartTotal');
    if (!cartItemsDiv || !cartTotalDiv) return;

    if (carrinho.length === 0) {
        cartItemsDiv.innerHTML = '<p class="empty-cart">Carrinho vazio</p>';
        cartTotalDiv.textContent = 'R$ 0,00';
        return;
    }

    let total = 0;
    let html = '';
    for (let item of carrinho) {
        total += item.preco;
        html += `<div class="cart-item">
            <div class="cart-item-info">
                <h4>${item.nome}</h4>
                <div class="cart-item-price">${formatarBRL(item.preco)}</div>
            </div>
            <button class="cart-item-remove" onclick="removerDoCarrinho(${item.id})">✕</button>
        </div>`;
    }
    cartItemsDiv.innerHTML = html;
    cartTotalDiv.textContent = formatarBRL(total);
}

function removerDoCarrinho(id) {
    carrinho = carrinho.filter(item => item.id !== id);
    atualizarContador();
    atualizarCarrinho();
}

function abrirCarrinho() { document.getElementById('cartModal')?.classList.add('active'); }
function fecharCarrinho() { document.getElementById('cartModal')?.classList.remove('active'); }
function abrirQRCode() { document.getElementById('qrModal')?.classList.add('active'); }
function fecharQRCode() { document.getElementById('qrModal')?.classList.remove('active'); }
function abrirFormulario() {
    fecharCarrinho();
    document.getElementById('formularioModal')?.classList.add('active');
}
function fecharFormulario() {
    document.getElementById('formularioModal')?.classList.remove('active');
    // volta sempre para a etapa de dados ao reabrir
    voltarDados();
}

// Etapa 1 -> 2: valida os dados e mostra a escolha da forma de pagamento
function escolherPagamento(event) {
    event.preventDefault();
    const nome = document.getElementById('nomePresente').value;
    const telefone = document.getElementById('telefonPresente').value;
    if (!nome || !telefone || carrinho.length === 0) return;
    document.getElementById('etapaDados').style.display = 'none';
    document.getElementById('etapaPagamento').style.display = 'block';
}

function voltarDados() {
    const dados = document.getElementById('etapaDados');
    const pag = document.getElementById('etapaPagamento');
    if (dados) dados.style.display = 'block';
    if (pag) pag.style.display = 'none';
}

// Cartão/boleto -> Mercado Pago
async function pagarComMercadoPago() {
    const nome = document.getElementById('nomePresente').value;
    const telefone = document.getElementById('telefonPresente').value;
    const botao = document.querySelector('#etapaPagamento .btn-mp');
    const textoOriginal = botao ? botao.textContent : '';
    if (botao) { botao.textContent = 'Gerando pagamento...'; botao.disabled = true; }
    await criarPagamento(nome, telefone);
    if (botao) { botao.textContent = textoOriginal; botao.disabled = false; }
}

// PIX direto -> gera QR Code + copia e cola, sem login e sem backend
function pagarComPix() {
    const total = carrinho.reduce((s, i) => s + i.preco, 0);
    const codigo = montarPayloadPix(total);
    document.getElementById('pixValor').textContent = formatarBRL(total);
    document.getElementById('pixCodigo').textContent = codigo;
    renderizarQr('pixQrCode', codigo);
    fecharFormulario();
    abrirQRCode();
}

async function copiarPix() {
    const codigo = document.getElementById('pixCodigo').textContent;
    try {
        await navigator.clipboard.writeText(codigo);
    } catch (e) {
        const range = document.createRange();
        range.selectNode(document.getElementById('pixCodigo'));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
    }
    const btn = document.getElementById('btnCopiarPix');
    const t = btn.textContent;
    btn.textContent = '✓ Copiado!';
    setTimeout(() => { btn.textContent = t; }, 1500);
}

// ===== PIX (BR Code / "Pix Copia e Cola" — padrão do Banco Central) =====
// ⚠️ PREENCHER com os dados do noivo (chave PIX que vai receber os presentes):
const PIX_CONFIG = {
    chave: '330a8614-1118-4b42-8bcd-cbe05a1b318b',  // chave aleatória do noivo (Bradesco)
    nome: 'ALEXANDRE AUGUSTO VIANTE',                 // nome do recebedor — máx. 25 caracteres
    cidade: 'GUARAPUAVA',                             // cidade do recebedor — máx. 15 caracteres
};

function montarPayloadPix(valor) {
    const campo = (id, v) => id + String(v.length).padStart(2, '0') + v;
    const conta = campo('00', 'BR.GOV.BCB.PIX') + campo('01', PIX_CONFIG.chave);
    let p = '';
    p += campo('00', '01');                                   // Payload Format Indicator
    p += campo('26', conta);                                  // Merchant Account Info (chave PIX)
    p += campo('52', '0000');                                 // Merchant Category Code
    p += campo('53', '986');                                  // Moeda: BRL
    if (valor > 0) p += campo('54', valor.toFixed(2));        // Valor da transação
    p += campo('58', 'BR');                                   // País
    p += campo('59', PIX_CONFIG.nome.substring(0, 25));       // Nome do recebedor
    p += campo('60', PIX_CONFIG.cidade.substring(0, 15));     // Cidade
    p += campo('62', campo('05', '***'));                     // Additional Data (txid livre)
    p += '6304';                                              // CRC16 (id + tamanho)
    return p + crc16(p);
}

function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function renderizarQr(elId, texto) {
    const el = document.getElementById(elId);
    if (!el || typeof qrcode === 'undefined') return;
    el.innerHTML = '';
    const qr = qrcode(0, 'M');
    qr.addData(texto);
    qr.make();
    el.innerHTML = qr.createImgTag(5, 0);
}

// Cria a cobrança no backend (Mercado Pago) e redireciona para o checkout do MP.
// Enquanto a integração não estiver configurada (sem MP_ACCESS_TOKEN), avisa o convidado.
async function criarPagamento(nome, telefone) {
    const itens = carrinho.map(i => ({ nome: i.nome, preco: i.preco }));
    try {
        const r = await fetch('/api/criar-pagamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itens, nome, telefone }),
        });
        if (!r.ok) throw new Error('backend indisponível');
        const dados = await r.json();
        if (!dados.url) throw new Error('resposta sem url');
        window.location.href = dados.url;
    } catch (e) {
        // Integração de pagamento ainda não configurada
        alert('Os pagamentos serão habilitados em breve. Obrigado pelo carinho! ♥');
    }
}

document.addEventListener('click', function (event) {
    if (event.target === document.getElementById('cartModal')) fecharCarrinho();
    if (event.target === document.getElementById('qrModal')) fecharQRCode();
    if (event.target === document.getElementById('formularioModal')) fecharFormulario();
});

// Header scroll
window.addEventListener('scroll', function () {
    const header = document.querySelector('.header');
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 20);
    // Ajusta cor do botão carrinho quando header fica branco
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        if (window.scrollY > 20) {
            cartBtn.style.background = '#8b6f5e';
            cartBtn.style.borderColor = '#8b6f5e';
            cartBtn.style.color = '#fff';
        } else {
            cartBtn.style.background = 'rgba(255,255,255,0.15)';
            cartBtn.style.borderColor = 'rgba(255,255,255,0.5)';
            cartBtn.style.color = '#fff';
        }
    }
});

window.addEventListener('load', function () {
    atualizarContador();
});
