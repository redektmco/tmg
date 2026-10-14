/**
 * Efeitos de movimento (nível 2 do briefing).
 * Só é carregado quando o visitante não pediu "reduzir movimento".
 * Animamos apenas transform e opacity, e pausamos o que sai da tela.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Bolhas } from './bolhas';

gsap.registerPlugin(ScrollTrigger, SplitText);

const html = document.documentElement;
const ehDesktop = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)').matches;
const ehMobile = !ehDesktop;
const bolhas = new Map<string, Bolhas>();

/** Segundos que faltam para o preloader começar a sumir (0 se já sumiu ou não apareceu). */
function tempoAtePreloaderSair(): number | null {
  if (html.classList.contains('sem-preloader')) return null;
  const pintura = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? performance.now();
  return 0.85 - (performance.now() - pintura) / 1000;
}

/* ---------- Rolagem suave (só desktop, no toque fica a nativa) ---------- */

async function iniciarLenis() {
  const { default: Lenis } = await import('lenis');
  const lenis = new Lenis({ autoRaf: false, anchors: { offset: -72 }, lerp: 0.11 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((tempo) => lenis.raf(tempo * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- Bolhas ---------- */

function iniciarBolhas() {
  const quantidades: Record<string, [number, number]> = {
    hero: [32, 110],
    origem: [28, 90],
    cta: [16, 45],
  };
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-bolhas]').forEach((canvas) => {
    const nome = canvas.dataset.bolhas || '';
    const [mobile, desktop] = quantidades[nome] ?? [20, 60];
    bolhas.set(nome, new Bolhas(canvas, { quantidade: ehDesktop ? desktop : mobile }));
  });

  // Bolhas do topo sobem mais rápido quando a pessoa rola a página.
  ScrollTrigger.create({
    trigger: '[data-hero]',
    start: 'top top',
    end: 'bottom top',
    onUpdate: (self) => {
      const hero = bolhas.get('hero');
      if (hero) hero.impulso = Math.min(Math.abs(self.getVelocity()) * 0.12, 260);
    },
  });
}

/* ---------- Topo: entrada do título e parallax ---------- */

function introHero() {
  const titulo = document.querySelector<HTMLElement>('[data-hero-titulo]');
  const itens = gsap.utils.toArray<HTMLElement>('[data-hero-item]');
  if (!titulo) return;

  const espera = tempoAtePreloaderSair();
  // Se o preloader já sumiu há tempo (script chegou tarde) ou é visita repetida,
  // o título já está visível: não escondemos de novo para não piscar.
  if (espera === null || espera < -0.25) return;

  const etiqueta = itens[0];
  const resto = itens.slice(1);
  const split = SplitText.create(titulo, { type: 'words', aria: 'auto' });

  const tl = gsap.timeline({ delay: Math.max(espera, 0) });
  if (etiqueta) tl.from(etiqueta, { y: 16, opacity: 0, duration: 0.6, ease: 'expo.out' });
  tl.from(
    split.words,
    {
      yPercent: 70,
      opacity: 0,
      ...(ehDesktop ? { filter: 'blur(12px)' } : {}),
      duration: ehDesktop ? 1 : 0.75,
      ease: 'expo.out',
      stagger: ehDesktop ? 0.06 : 0.04,
      clearProps: 'filter',
    },
    0.1,
  ).from(resto, { y: 24, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.1 }, '-=0.55');
}

function parallaxHero() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const gatilho = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };

  gsap.to('[data-hero-conteudo]', { yPercent: ehDesktop ? 22 : 12, opacity: 0.15, ease: 'none', scrollTrigger: gatilho });
  gsap.to('[data-hero-fundo]', { yPercent: ehDesktop ? 14 : 8, ease: 'none', scrollTrigger: gatilho });
  if (ehDesktop) gsap.to('[data-hero-vidros]', { yPercent: -35, ease: 'none', scrollTrigger: gatilho });

  if (!ehDesktop) return;
  const raios = hero.querySelector('.hero__raios');
  const canvas = hero.querySelector('canvas');
  const vidros = hero.querySelector('[data-hero-vidros]');
  const raiosX = gsap.quickTo(raios, 'x', { duration: 1.2, ease: 'power3' });
  const vidrosX = gsap.quickTo(vidros, 'x', { duration: 1.6, ease: 'power3' });
  const vidrosY = gsap.quickTo(vidros, 'y', { duration: 1.6, ease: 'power3' });
  const canvasX = gsap.quickTo(canvas, 'x', { duration: 1.4, ease: 'power3' });
  const canvasY = gsap.quickTo(canvas, 'y', { duration: 1.4, ease: 'power3' });
  hero.addEventListener('pointermove', (e) => {
    const px = e.clientX / window.innerWidth - 0.5;
    const py = e.clientY / window.innerHeight - 0.5;
    raiosX(px * -40);
    vidrosX(px * -50);
    vidrosY(py * -36);
    canvasX(px * 24);
    canvasY(py * 16);
  });
}

/* ---------- Títulos e blocos aparecendo ao rolar ---------- */

/*
 * Usamos IntersectionObserver (e não ScrollTrigger) para as revelações simples:
 * o navegador calcula sozinho, sem travar o celular na hora de carregar.
 */

function revelarTitulos() {
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        const el = entrada.target as HTMLElement;
        observador.unobserve(el);
        SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          aria: 'auto',
          autoSplit: true,
          onSplit: (self) => {
            el.classList.add('dividido');
            return gsap.from(self.lines, {
              yPercent: 105,
              duration: ehDesktop ? 1 : 0.7,
              ease: 'expo.out',
              stagger: 0.08,
            });
          },
        });
      });
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  document.querySelectorAll('[data-split]').forEach((el) => observador.observe(el));
}

function revelarElementos() {
  const observador = new IntersectionObserver(
    (entradas) => {
      const visiveis = entradas.filter((e) => e.isIntersecting).map((e) => e.target);
      if (visiveis.length === 0) return;
      visiveis.forEach((el) => observador.unobserve(el));
      gsap.to(visiveis, {
        opacity: 1,
        y: 0,
        duration: ehDesktop ? 0.9 : 0.6,
        ease: 'expo.out',
        stagger: 0.08,
        overwrite: 'auto',
      });
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  document.querySelectorAll('[data-revela]').forEach((el) => observador.observe(el));
}

/* ---------- Faixa de segmentos que acelera com o scroll ---------- */

function faixaReativa() {
  const trilho = document.querySelector<HTMLElement>('[data-marquee]');
  const grupo = trilho?.querySelector<HTMLElement>('.faixa__grupo');
  if (!trilho || !grupo) return;

  let largura = grupo.offsetWidth;
  let posicao = 0;
  let impulso = 0;
  let visivel = true;
  const velocidadeBase = ehDesktop ? 70 : 50;
  const mover = gsap.quickSetter(trilho, 'x', 'px');

  new IntersectionObserver(([entrada]) => (visivel = entrada.isIntersecting)).observe(trilho);
  window.addEventListener('resize', () => (largura = grupo.offsetWidth));
  ScrollTrigger.create({
    onUpdate: (self) => {
      impulso = Math.min(Math.abs(self.getVelocity()) * 0.15, 420);
    },
  });

  gsap.ticker.add((_tempo, delta) => {
    impulso *= 0.93;
    if (!visivel || largura === 0) return;
    posicao -= ((velocidadeBase + impulso) * delta) / 1000;
    if (posicao <= -largura) posicao += largura;
    mover(posicao);
  });
}

/* ---------- Como funciona: filete de água descendo ---------- */

function fileteComoFunciona() {
  const lista = document.querySelector<HTMLElement>('[data-passos]');
  const filete = lista?.querySelector<HTMLElement>('[data-filete]');
  const gota = lista?.querySelector<HTMLElement>('[data-filete-gota]');
  const trilho = filete?.parentElement;
  if (!lista || !filete || !gota || !trilho) return;

  const numeros = gsap.utils.toArray<HTMLElement>('.passo__numero', lista);
  // O filete termina no número do último passo (não no fim da foto).
  const ajustarTrilho = () => {
    const ultimo = numeros[numeros.length - 1];
    if (!ultimo) return;
    const fim = ultimo.offsetTop + (ultimo.parentElement?.offsetTop ?? 0) + ultimo.offsetHeight / 2;
    trilho.style.bottom = 'auto';
    trilho.style.height = `${Math.max(fim - trilho.offsetTop, 0)}px`;
  };
  ScrollTrigger.addEventListener('refreshInit', ajustarTrilho);

  gsap.set(gota, { opacity: 1 });
  gsap
    .timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: lista, start: 'top 65%', end: 'bottom 75%', scrub: 0.6, invalidateOnRefresh: true },
    })
    .fromTo(filete, { scaleY: 0 }, { scaleY: 1 }, 0)
    .fromTo(gota, { y: 0 }, { y: () => trilho.offsetHeight }, 0);

  // Cada passo "acende" quando passa da linha de 68% da tela.
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        const abaixoDaLinha = entrada.boundingClientRect.top > (entrada.rootBounds?.bottom ?? window.innerHeight);
        if (entrada.isIntersecting) entrada.target.classList.add('passo--ativo');
        else if (abaixoDaLinha) entrada.target.classList.remove('passo--ativo');
      });
    },
    { rootMargin: '0px 0px -32% 0px' },
  );
  lista.querySelectorAll('[data-passo]').forEach((passo) => observador.observe(passo));
}

/* ---------- Fotos com parallax leve ---------- */

function parallaxFotos() {
  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
    const intensidade = Number(el.dataset.parallax) || 0;
    gsap.to(el, {
      yPercent: ehDesktop ? intensidade : intensidade / 2,
      ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

/* ---------- Origem: descendo o poço ---------- */

function descidaPoco() {
  const secao = document.querySelector<HTMLElement>('[data-origem]');
  if (!secao) return;
  const palco = secao.querySelector<HTMLElement>('[data-origem-palco]');
  const claro = secao.querySelector<HTMLElement>('[data-origem-claro]');
  const contador = secao.querySelector<HTMLElement>('[data-origem-contador]');
  const indicador = secao.querySelector<HTMLElement>('[data-origem-indicador]');
  const superficie = secao.querySelector<HTMLElement>('[data-origem-superficie]');
  const texto = secao.querySelector<HTMLElement>('[data-origem-texto]');
  const regua = indicador?.parentElement;
  if (!palco || !claro || !contador || !indicador || !superficie || !texto || !regua) return;

  const profundidade = Number(contador.textContent) || 150;
  const estado = { metros: 0 };
  contador.textContent = '0';
  superficie.style.display = 'block';
  gsap.set(claro, { opacity: 1 });
  gsap.set(indicador, { top: 0 });
  gsap.set(texto, { opacity: 0, y: 24 });

  const alturaDoPin = ehMobile ? 1.5 : 2.2;
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: secao,
      start: 'top top',
      end: () => `+=${window.innerHeight * alturaDoPin}`,
      pin: palco,
      scrub: 0.5,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const b = bolhas.get('origem');
        if (b) b.impulso = Math.min(Math.abs(self.getVelocity()) * 0.2, 380);
      },
    },
  });

  tl.to(claro, { opacity: 0, duration: 1 }, 0)
    .to(
      estado,
      {
        metros: profundidade,
        duration: 0.9,
        onUpdate: () => {
          contador.textContent = String(Math.round(estado.metros));
        },
      },
      0,
    )
    .fromTo(indicador, { y: 0 }, { y: () => regua.offsetHeight, duration: 0.9 }, 0)
    .to(superficie, { opacity: 0, y: -16, duration: 0.15 }, 0.05)
    .to(texto, { opacity: 1, y: 0, duration: 0.2 }, 0.72)
    .to({}, { duration: 0.1 });
}

/* ---------- Contadores (só aparecem com números reais) ---------- */

function contadores() {
  gsap.utils.toArray<HTMLElement>('[data-contador]').forEach((el) => {
    const alvo = Number(el.dataset.contador) || 0;
    const estado = { valor: 0 };
    el.textContent = '0';
    gsap.to(estado, {
      valor: alvo,
      duration: 1.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = String(Math.round(estado.valor))),
    });
  });
}

/* ---------- Só no desktop: tilt 3D, botões magnéticos e cursor gota ---------- */

function tilt() {
  gsap.utils.toArray<HTMLElement>('[data-tilt]').forEach((card) => {
    gsap.set(card, { transformPerspective: 900 });
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
    card.addEventListener('pointermove', (e) => {
      const caixa = card.getBoundingClientRect();
      const px = (e.clientX - caixa.left) / caixa.width - 0.5;
      const py = (e.clientY - caixa.top) / caixa.height - 0.5;
      ry(px * 10);
      rx(py * -10);
      card.style.setProperty('--brilho-x', `${(px + 0.5) * 100}%`);
      card.style.setProperty('--brilho-y', `${(py + 0.5) * 100}%`);
    });
    card.addEventListener('pointerleave', () => {
      rx(0);
      ry(0);
    });
  });
}

function magnetico() {
  gsap.utils.toArray<HTMLElement>('[data-magnetico]').forEach((el) => {
    el.style.transition = 'box-shadow .35s, background-color .25s, color .25s';
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
    el.addEventListener('pointermove', (e) => {
      const caixa = el.getBoundingClientRect();
      x((e.clientX - (caixa.left + caixa.width / 2)) * 0.22);
      y((e.clientY - (caixa.top + caixa.height / 2)) * 0.35);
    });
    el.addEventListener('pointerleave', () => {
      x(0);
      y(0);
    });
  });
}

function cursorGota() {
  const cursor = document.createElement('div');
  cursor.className = 'cursor-gota';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span></span>';
  document.body.appendChild(cursor);
  html.classList.add('com-cursor');

  const x = gsap.quickTo(cursor, 'x', { duration: 0.18, ease: 'power3' });
  const y = gsap.quickTo(cursor, 'y', { duration: 0.18, ease: 'power3' });
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      x(e.clientX);
      y(e.clientY);
      cursor.classList.add('cursor-gota--visivel');
    },
    { passive: true },
  );
  document.addEventListener('pointerover', (e) => {
    const alvo = (e.target as Element | null)?.closest('a, button, summary, [data-galeria]');
    cursor.classList.toggle('cursor-gota--link', Boolean(alvo));
  });
  document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('cursor-gota--visivel'));
  document.addEventListener('pointerdown', () => cursor.classList.add('cursor-gota--clique'));
  document.addEventListener('pointerup', () => cursor.classList.remove('cursor-gota--clique'));
}

/** Devolve o controle ao navegador entre as etapas, para não travar o celular. */
const ceder = () => new Promise<void>((resolver) => setTimeout(resolver, 0));

export async function iniciar() {
  html.classList.add('fx');
  ScrollTrigger.config({ ignoreMobileResize: true });

  introHero();
  revelarTitulos();
  revelarElementos();
  await ceder();
  iniciarBolhas();
  await ceder();
  parallaxHero();
  faixaReativa();
  await ceder();
  fileteComoFunciona();
  parallaxFotos();
  contadores();
  await ceder();
  descidaPoco();
  if (ehDesktop) {
    await ceder();
    void iniciarLenis();
    tilt();
    magnetico();
    cursorGota();
  }
}
