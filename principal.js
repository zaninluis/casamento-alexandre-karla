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

// ===== CARROUSSEL =====
let currentSlideIndex = 0;
const totalCards = 8;

function renderDots(pages) {
    const dotsContainer = document.querySelector('.carousel-dots');
    if (!dotsContainer) return;
    if (dotsContainer.children.length === pages) return;
    dotsContainer.innerHTML = '';
    for (let i = 0; i < pages; i++) {
        const span = document.createElement('span');
        span.className = 'dot';
        span.setAttribute('onclick', `currentSlide(${i})`);
        dotsContainer.appendChild(span);
    }
}

function nextSlide() {
    const track = document.querySelector('.carousel-track');
    const firstCard = document.querySelector('.gift-card');
    if (!track || !firstCard) return;
    const gap = 20;
    const cardWidth = firstCard.offsetWidth;
    const cardsPerViewLocal = Math.max(1, Math.floor(track.clientWidth / (cardWidth + gap)));
    const maxSlides = Math.ceil(totalCards / cardsPerViewLocal) - 1;
    currentSlideIndex = currentSlideIndex < maxSlides ? currentSlideIndex + 1 : 0;
    updateCarousel();
}

function prevSlide() {
    const track = document.querySelector('.carousel-track');
    const firstCard = document.querySelector('.gift-card');
    if (!track || !firstCard) return;
    const gap = 20;
    const cardWidth = firstCard.offsetWidth;
    const cardsPerViewLocal = Math.max(1, Math.floor(track.clientWidth / (cardWidth + gap)));
    const maxSlides = Math.ceil(totalCards / cardsPerViewLocal) - 1;
    currentSlideIndex = currentSlideIndex > 0 ? currentSlideIndex - 1 : maxSlides;
    updateCarousel();
}

function currentSlide(index) {
    currentSlideIndex = index;
    updateCarousel();
}

function updateCarousel() {
    const track = document.querySelector('.carousel-track');
    const firstCard = document.querySelector('.gift-card');
    if (!firstCard) return;
    const cardWidth = firstCard.offsetWidth;
    const gap = 20;
    const cardsPerViewLocal = Math.max(1, Math.floor(track.clientWidth / (cardWidth + gap)));
    const step = cardsPerViewLocal * (cardWidth + gap);
    // 1 card por view (mobile): centraliza o card ativo no carrossel
    let offset = 0;
    if (cardsPerViewLocal === 1) {
        const carouselWidth = track.parentElement.clientWidth;
        const padL = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        offset = (carouselWidth - cardWidth) / 2 - padL;
    }
    track.style.transform = `translateX(${offset - currentSlideIndex * step}px)`;
    const pages = Math.ceil(totalCards / cardsPerViewLocal);
    renderDots(pages);
    const dots = document.querySelectorAll('.dot');
    dots.forEach(d => d.classList.remove('active'));
    const dotIndex = Math.min(currentSlideIndex, dots.length - 1);
    if (dots[dotIndex]) dots[dotIndex].classList.add('active');
}

let resizeTimeout;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const track = document.querySelector('.carousel-track');
        const firstCard = document.querySelector('.gift-card');
        if (!track || !firstCard) return;
        const gap = 20;
        const cardWidth = firstCard.getBoundingClientRect().width;
        const cardsPerViewLocal = Math.max(1, Math.floor(track.clientWidth / (cardWidth + gap)));
        const maxSlides = Math.max(0, Math.ceil(totalCards / cardsPerViewLocal) - 1);
        if (currentSlideIndex > maxSlides) currentSlideIndex = maxSlides;
        updateCarousel();
    }, 120);
});

// ===== CARRINHO =====
let carrinho = [];

function adicionarCarrinho(nome, preco) {
    carrinho.push({ id: Date.now(), nome, preco: parseFloat(preco) });
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
                <div class="cart-item-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</div>
            </div>
            <button class="cart-item-remove" onclick="removerDoCarrinho(${item.id})">✕</button>
        </div>`;
    }
    cartItemsDiv.innerHTML = html;
    cartTotalDiv.textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
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
    document.getElementById('pixValor').textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
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

// Swipe por toque no carrossel (mobile) — usa a mesma paginação das setas
function initCarouselSwipe() {
    const track = document.querySelector('.carousel-track');
    if (!track) return;
    let startX = 0, startY = 0, swiping = false;
    track.addEventListener('touchstart', function (e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        swiping = true;
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
        if (!swiping) return;
        swiping = false;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        // só conta como swipe horizontal se o movimento lateral for claro
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) nextSlide(); else prevSlide();
        }
    }, { passive: true });
}

window.addEventListener('load', function () {
    updateCarousel();
    atualizarContador();
    initCarouselSwipe();
});
