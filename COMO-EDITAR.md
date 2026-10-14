# Como editar o site da TMG

Tudo o que muda com frequência fica em **um único arquivo**: `src/data/site.json`.
Você não precisa mexer em mais nada para trocar textos, telefone ou fotos.

## Editando pelo GitHub (sem instalar nada)

1. Abra o repositório no GitHub e entre em `src/data/site.json`.
2. Clique no lápis (Edit this file).
3. Troque **só o texto entre aspas do lado direito**. Exemplo:
   `"contato": "Rodrigo"` → `"contato": "Rodrigo Cleim"`
4. Role até o fim e clique em **Commit changes**. Deixe marcado "Commit directly to the main branch".
5. Em 1 a 2 minutos o site atualiza sozinho na Vercel.

Cuidados:
- Não apague aspas, vírgulas, chaves `{ }` ou colchetes `[ ]`.
- Não use travessão (—) nos textos.
- Se o site não atualizar, provavelmente faltou uma vírgula ou aspas. Desfaça a última mudança.

## O que dá para mudar

| Quero mudar | Onde no `site.json` |
|---|---|
| Número do WhatsApp | `empresa.whatsapp` (só números, com 55 e DDD) e `empresa.whatsappExibicao` |
| Nome do contato | `empresa.contato` e os textos que citam "Rodrigo" |
| CNPJ e endereço no rodapé | `empresa.cnpj` e `empresa.endereco` (vazio = não aparece) |
| Mensagem que chega no WhatsApp | `mensagens.padrao` e `mensagem` de cada segmento |
| Textos do topo | `hero` |
| Respostas das perguntas frequentes | `faq.perguntas[].resposta` (vazio = mostra a resposta padrão) |
| Esconder a seção do poço artesiano | `origem.mostrar` → `false` |
| Mostrar depoimentos | preencher `provaSocial.depoimentos` e mudar `provaSocial.mostrar` → `true` |
| Mostrar números (anos, clientes) | preencher `porQue.numeros.itens` e mudar `porQue.numeros.mostrar` → `true` |
| Google Analytics e Meta Pixel | `rastreamento.ga4` e `rastreamento.metaPixel` |

## Fotos

- As fotos ficam em `src/assets/fotos/`.
- Para trocar uma foto: envie o arquivo novo para essa pasta (botão **Add file → Upload files** no GitHub) e coloque o nome do arquivo no `site.json`, no campo `arquivo` ou `foto` correspondente.
- O site gera sozinho as versões leves para celular (AVIF e WebP).

## Logo

- Envie o arquivo do logo para `src/assets/marca/` e coloque o nome dele em `empresa.logo`.
- Enquanto `empresa.logo` estiver vazio, o site mostra o logo em texto.

## Rastreamento

- Os códigos do GA4 e do Pixel só carregam **depois** que o visitante aceita o aviso de cookies (LGPD).
- Eventos enviados: `click_whatsapp` (com a origem: header, hero, segmento-bar, como-funciona, faq, cta-final, flutuante, rodape) e `click_instagram`. No Pixel, o clique no WhatsApp também conta como `Contact`.
- Links com `?utm_source=instagram&utm_campaign=nome` fazem a mensagem do WhatsApp chegar com a linha `Origem: instagram / nome`.
