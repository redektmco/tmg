import type { ImageMetadata } from 'astro';
import dados from '../data/site.json';

export const site = dados;

/** Link do WhatsApp com a mensagem já escrita (versão sem JavaScript). */
export function linkWhatsApp(mensagem: string = site.mensagens.padrao): string {
  const texto = `${mensagem}\n\n${site.mensagens.assinatura}`;
  return `https://wa.me/${site.empresa.whatsapp}?text=${encodeURIComponent(texto)}`;
}

export const linkInstagram = `https://www.instagram.com/${site.empresa.instagram}/`;

const fotos = import.meta.glob<{ default: ImageMetadata }>('../assets/fotos/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
});

/** Busca uma foto de src/assets/fotos pelo nome do arquivo usado no site.json. */
export function foto(arquivo: string): ImageMetadata {
  const chave = Object.keys(fotos).find((caminho) => caminho.endsWith(`/${arquivo}`));
  if (!chave) {
    throw new Error(`Foto "${arquivo}" não encontrada em src/assets/fotos. Confira o nome no site.json.`);
  }
  return fotos[chave].default;
}

const marcas = import.meta.glob<{ default: ImageMetadata }>('../assets/marca/*.{jpg,jpeg,png,webp,avif,svg}', {
  eager: true,
});

/** Logo da TMG, se houver arquivo configurado no site.json. */
export function logo(): ImageMetadata | undefined {
  const arquivo = site.empresa.logo;
  if (!arquivo) return undefined;
  const chave = Object.keys(marcas).find((caminho) => caminho.endsWith(`/${arquivo}`));
  return chave ? marcas[chave].default : undefined;
}

const nomesInteiros = ['Coca-Cola', 'Premium Lindoia', 'São Paulo'];

/** Escapa o texto e impede que nomes como "Coca-Cola" quebrem no meio da linha. */
export function semQuebra(texto: string): string {
  const escapado = texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return nomesInteiros.reduce(
    (resultado, nome) => resultado.split(nome).join(`<span class="nowrap">${nome}</span>`),
    escapado,
  );
}
