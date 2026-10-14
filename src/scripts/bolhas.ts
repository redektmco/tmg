/**
 * Bolhas subindo em canvas 2D.
 * Leve para celular: desenha sprites prontos, pausa fora da tela e com a aba oculta.
 */

interface Opcoes {
  quantidade: number;
  /** Multiplicador da velocidade de subida. */
  velocidade?: number;
}

interface Bolha {
  x: number;
  y: number;
  raio: number;
  subida: number;
  fase: number;
  amplitude: number;
  frequencia: number;
  alfa: number;
  suave: boolean;
}

function criarSprite(suave: boolean): HTMLCanvasElement {
  const tamanho = 64;
  const centro = tamanho / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = tamanho;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (suave) {
    const brilho = ctx.createRadialGradient(centro, centro, 0, centro, centro, centro);
    brilho.addColorStop(0, 'rgba(255,255,255,0.32)');
    brilho.addColorStop(0.55, 'rgba(190,240,250,0.12)');
    brilho.addColorStop(1, 'rgba(190,240,250,0)');
    ctx.fillStyle = brilho;
    ctx.fillRect(0, 0, tamanho, tamanho);
    return canvas;
  }

  const borda = ctx.createRadialGradient(centro, centro, centro * 0.5, centro, centro, centro * 0.97);
  borda.addColorStop(0, 'rgba(255,255,255,0.03)');
  borda.addColorStop(0.75, 'rgba(210,245,255,0.22)');
  borda.addColorStop(1, 'rgba(255,255,255,0.75)');
  ctx.fillStyle = borda;
  ctx.beginPath();
  ctx.arc(centro, centro, centro * 0.97, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(centro * 0.64, centro * 0.56, centro * 0.2, centro * 0.11, -0.7, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

const aleatorio = (min: number, max: number) => min + Math.random() * (max - min);

export class Bolhas {
  /** Impulso extra de subida (px/s), por exemplo vindo da velocidade do scroll. */
  impulso = 0;

  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly sprite = criarSprite(false);
  private readonly spriteSuave = criarSprite(true);
  private readonly bolhas: Bolha[] = [];
  private readonly dpr: number;
  private largura = 0;
  private altura = 0;
  private visivel = false;
  private quadro = 0;
  private ultimoTempo = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly opcoes: Opcoes,
  ) {
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, opcoes.quantidade > 60 ? 2 : 1.5);
    if (!this.ctx) return;

    this.medir();
    for (let i = 0; i < opcoes.quantidade; i++) this.bolhas.push(this.nova(true));

    new ResizeObserver(() => this.medir()).observe(canvas);
    new IntersectionObserver(([entrada]) => {
      this.visivel = entrada.isIntersecting;
      this.atualizarEstado();
    }).observe(canvas);
    document.addEventListener('visibilitychange', () => this.atualizarEstado());
  }

  private medir() {
    const caixa = this.canvas.getBoundingClientRect();
    if (caixa.width === 0 || caixa.height === 0) return;
    const larguraAnterior = this.largura;
    this.largura = caixa.width;
    this.altura = caixa.height;
    this.canvas.width = Math.round(caixa.width * this.dpr);
    this.canvas.height = Math.round(caixa.height * this.dpr);
    if (larguraAnterior > 0 && larguraAnterior !== this.largura) {
      const escala = this.largura / larguraAnterior;
      this.bolhas.forEach((b) => (b.x *= escala));
    }
  }

  private nova(espalhar: boolean): Bolha {
    const sorteio = Math.random();
    const suave = sorteio > 0.96;
    const raio = suave ? aleatorio(18, 42) : sorteio > 0.84 ? aleatorio(6, 13) : aleatorio(1.5, 6);
    return {
      x: aleatorio(0, this.largura || window.innerWidth),
      y: espalhar ? aleatorio(0, this.altura || window.innerHeight) : (this.altura || window.innerHeight) + raio * 2,
      raio,
      subida: (suave ? aleatorio(14, 26) : aleatorio(22, 40) + raio * 4) * (this.opcoes.velocidade ?? 1),
      fase: aleatorio(0, Math.PI * 2),
      amplitude: aleatorio(4, 16),
      frequencia: aleatorio(0.6, 1.6),
      alfa: suave ? aleatorio(0.5, 0.9) : aleatorio(0.35, 0.95),
      suave,
    };
  }

  private atualizarEstado() {
    const deveRodar = this.visivel && document.visibilityState === 'visible';
    if (deveRodar && !this.quadro) {
      this.ultimoTempo = performance.now();
      this.quadro = requestAnimationFrame(this.desenhar);
    } else if (!deveRodar && this.quadro) {
      cancelAnimationFrame(this.quadro);
      this.quadro = 0;
    }
  }

  private desenhar = (agora: number) => {
    const ctx = this.ctx;
    if (!ctx) return;
    const dt = Math.min((agora - this.ultimoTempo) / 1000, 0.05);
    this.ultimoTempo = agora;
    this.impulso *= 0.92;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.largura, this.altura);

    for (let i = 0; i < this.bolhas.length; i++) {
      const b = this.bolhas[i];
      b.y -= (b.subida + this.impulso * (0.4 + b.raio / 12)) * dt;
      b.fase += b.frequencia * dt;
      if (b.y < -b.raio * 2) {
        this.bolhas[i] = this.nova(false);
        continue;
      }
      const x = b.x + Math.sin(b.fase) * b.amplitude;
      const tamanho = b.raio * 2;
      ctx.globalAlpha = b.alfa;
      ctx.drawImage(b.suave ? this.spriteSuave : this.sprite, x - b.raio, b.y - b.raio, tamanho, tamanho);
    }
    ctx.globalAlpha = 1;
    this.quadro = requestAnimationFrame(this.desenhar);
  };
}
