/**
 * Comportamentos básicos do site (funcionam em qualquer celular):
 * links do WhatsApp com origem da visita, header, botão flutuante,
 * carrosséis, cookies e rastreamento. Os efeitos ficam em efeitos.ts.
 */

interface Config {
  whatsapp: string;
  mensagemPadrao: string;
  assinatura: string;
  ga4: string;
  metaPixel: string;
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
    _fbq?: unknown;
  }
}

const config: Config = JSON.parse(document.getElementById('config-site')?.textContent || '{}');
const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

function guardar(chave: string, valor: string, armazenamento: 'local' | 'session' = 'session') {
  try {
    (armazenamento === 'local' ? localStorage : sessionStorage).setItem(chave, valor);
  } catch {
    /* navegação anônima ou armazenamento bloqueado */
  }
}

function ler(chave: string, armazenamento: 'local' | 'session' = 'session'): string {
  try {
    return (armazenamento === 'local' ? localStorage : sessionStorage).getItem(chave) || '';
  } catch {
    return '';
  }
}

/* ---------- Origem da visita (UTM) ---------- */

function descobrirOrigem(): string {
  const parametros = new URLSearchParams(location.search);
  const campanha = parametros.get('utm_campaign') || '';
  let fonte = parametros.get('utm_source') || '';

  if (!fonte && parametros.get('gclid')) fonte = 'google ads';
  if (!fonte && parametros.get('fbclid')) fonte = 'instagram/facebook';
  if (!fonte && document.referrer) {
    const ref = document.referrer.toLowerCase();
    if (ref.includes('instagram.')) fonte = 'instagram';
    else if (ref.includes('facebook.')) fonte = 'facebook';
    else if (ref.includes('google.')) fonte = 'google';
  }

  if (fonte) {
    const texto = campanha ? `${fonte} / ${campanha}` : fonte;
    guardar('tmg-origem', texto);
    return texto;
  }
  return ler('tmg-origem');
}

const origemVisita = descobrirOrigem();

/* ---------- Rastreamento (só depois do aceite de cookies) ---------- */

function rastrear(evento: string, parametros: Record<string, unknown> = {}) {
  window.gtag?.('event', evento, parametros);
  if (window.fbq) {
    if (evento === 'click_whatsapp') window.fbq('track', 'Contact', parametros);
    window.fbq('trackCustom', evento, parametros);
  }
}

function carregarRastreamento() {
  if (config.ga4) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.ga4)}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', config.ga4);
  }

  if (config.metaPixel && !window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) (fbq.callMethod as (...a: unknown[]) => void)(...args);
      else fbq.queue.push(args);
    } as unknown as NonNullable<Window['fbq']> & { queue: unknown[] };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
    fbq('init', config.metaPixel);
    fbq('track', 'PageView');
  }
}

function iniciarCookies() {
  if (!config.ga4 && !config.metaPixel) return;
  const escolha = ler('tmg-cookies', 'local');
  if (escolha === 'aceito') {
    carregarRastreamento();
    return;
  }
  if (escolha === 'recusado') return;

  const aviso = document.querySelector<HTMLElement>('[data-cookies]');
  if (!aviso) return;
  aviso.hidden = false;
  aviso.querySelector('[data-cookies-aceitar]')?.addEventListener('click', () => {
    guardar('tmg-cookies', 'aceito', 'local');
    aviso.hidden = true;
    carregarRastreamento();
  });
  aviso.querySelector('[data-cookies-recusar]')?.addEventListener('click', () => {
    guardar('tmg-cookies', 'recusado', 'local');
    aviso.hidden = true;
  });
}

/* ---------- WhatsApp ---------- */

function linkWhatsApp(mensagem: string): string {
  const linhas = [mensagem, '', config.assinatura];
  if (origemVisita) linhas.push(`Origem: ${origemVisita}`);
  return `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(linhas.join('\n'))}`;
}

function iniciarWhatsApp() {
  document.querySelectorAll<HTMLAnchorElement>('a[data-wa]').forEach((link) => {
    link.href = linkWhatsApp(link.dataset.waMsg || config.mensagemPadrao);
  });

  document.addEventListener('click', (evento) => {
    const alvo = evento.target as Element | null;
    const whatsapp = alvo?.closest<HTMLAnchorElement>('a[data-wa]');
    if (whatsapp) {
      whatsapp.href = linkWhatsApp(whatsapp.dataset.waMsg || config.mensagemPadrao);
      rastrear('click_whatsapp', { origem: whatsapp.dataset.wa });
      return;
    }
    const instagram = alvo?.closest<HTMLAnchorElement>('a[data-instagram]');
    if (instagram) rastrear('click_instagram', { origem: instagram.dataset.instagram });
  });
}

/* ---------- Header e botão flutuante ---------- */

function iniciarRolagem() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  const flutuante = document.querySelector<HTMLElement>('[data-flutuante]');
  let ultimoY = window.scrollY;
  let agendado = false;

  const atualizar = () => {
    agendado = false;
    const y = window.scrollY;
    header?.classList.toggle('header--rolado', y > 24);
    if (Math.abs(y - ultimoY) > 8) {
      const descendo = y > ultimoY;
      const focado = header?.matches(':focus-within');
      header?.classList.toggle('header--escondido', descendo && y > 200 && !focado);
      ultimoY = y;
    }
    flutuante?.classList.toggle('flutuante--oculto', y < window.innerHeight * 0.55);
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!agendado) {
        agendado = true;
        requestAnimationFrame(atualizar);
      }
    },
    { passive: true },
  );
  atualizar();
}

/* ---------- Carrossel de segmentos (pontinhos) ---------- */

function iniciarCarrossel() {
  const lista = document.querySelector<HTMLElement>('[data-carrossel]');
  const pontos = Array.from(document.querySelectorAll<HTMLElement>('[data-carrossel-pontos] span'));
  if (!lista || pontos.length === 0) return;
  const cards = Array.from(lista.children) as HTMLElement[];
  let agendado = false;

  lista.addEventListener(
    'scroll',
    () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        const fim = lista.scrollLeft + lista.clientWidth >= lista.scrollWidth - 4;
        let indice = fim ? cards.length - 1 : 0;
        if (!fim) {
          let menor = Infinity;
          cards.forEach((card, i) => {
            const distancia = Math.abs(card.offsetLeft - lista.offsetLeft - lista.scrollLeft - 20);
            if (distancia < menor) {
              menor = distancia;
              indice = i;
            }
          });
        }
        pontos.forEach((p, i) => p.classList.toggle('ativo', i === indice));
      });
    },
    { passive: true },
  );
}

/* ---------- Galeria: setas e arrastar com o mouse ---------- */

function iniciarGaleria() {
  const trilho = document.querySelector<HTMLElement>('[data-galeria]');
  if (!trilho) return;

  document.querySelectorAll<HTMLButtonElement>('[data-galeria-seta]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const item = trilho.querySelector('li');
      const passo = item ? item.getBoundingClientRect().width + 16 : 320;
      trilho.scrollBy({ left: Number(botao.dataset.galeriaSeta) * passo, behavior: reduzMovimento ? 'auto' : 'smooth' });
    });
  });

  let arrastando = false;
  let inicioX = 0;
  let inicioScroll = 0;

  trilho.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    arrastando = true;
    inicioX = e.clientX;
    inicioScroll = trilho.scrollLeft;
    trilho.setPointerCapture(e.pointerId);
    trilho.classList.add('arrastando');
  });
  trilho.addEventListener('pointermove', (e) => {
    if (!arrastando) return;
    trilho.scrollLeft = inicioScroll - (e.clientX - inicioX);
  });
  const soltar = () => {
    if (!arrastando) return;
    arrastando = false;
    trilho.classList.remove('arrastando');
  };
  trilho.addEventListener('pointerup', soltar);
  trilho.addEventListener('pointercancel', soltar);
}

/* ---------- Ondulação ao tocar nos botões ---------- */

function iniciarRipple() {
  if (reduzMovimento) return;
  document.addEventListener('pointerdown', (e) => {
    const botao = (e.target as Element | null)?.closest<HTMLElement>('.botao');
    if (!botao) return;
    const caixa = botao.getBoundingClientRect();
    const tamanho = Math.max(caixa.width, caixa.height) * 2.2;
    const onda = document.createElement('span');
    onda.className = 'ripple';
    onda.style.width = onda.style.height = `${tamanho}px`;
    onda.style.left = `${e.clientX - caixa.left}px`;
    onda.style.top = `${e.clientY - caixa.top}px`;
    botao.appendChild(onda);
    onda.addEventListener('animationend', () => onda.remove());
  });
}

/* ---------- Pausar animações CSS fora da tela ---------- */

function pausarForaDaTela() {
  const elementos = document.querySelectorAll<HTMLElement>('[data-anima]');
  if (!('IntersectionObserver' in window) || elementos.length === 0) return;
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => entrada.target.classList.toggle('pausado', !entrada.isIntersecting));
  });
  elementos.forEach((el) => observador.observe(el));
}

iniciarWhatsApp();
iniciarRolagem();
iniciarCarrossel();
iniciarGaleria();
iniciarRipple();
pausarForaDaTela();
iniciarCookies();

if (!reduzMovimento) {
  import('./efeitos')
    .then((efeitos) => efeitos.iniciar())
    .catch(() => {
      document.documentElement.classList.remove('fx');
    });
}
