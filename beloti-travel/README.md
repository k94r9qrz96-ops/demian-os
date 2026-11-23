# Beloti Travel — landing page cinematográfica

**Conceito:** *The world is waiting* — “O mundo é grande. A sua próxima história começa aqui.”

Landing page em português do Brasil para a Beloti Travel (São Bernardo do Campo/SP): uma narrativa por capítulos, guiada pelo scroll, que leva da inspiração ao pedido de orçamento pelo WhatsApp.

- **Stack:** Next.js 16 (App Router, exportação estática) · React 19 · TypeScript · Tailwind CSS 4 · GSAP 3.13 (ScrollTrigger, SplitText, MotionPath) · d3-geo + world-atlas (globo em SVG, sem WebGL)
- **Saída:** HTML estático em `out/`, que roda na Vercel, Netlify, Cloudflare Pages ou em qualquer hospedagem de arquivos.
- **Sem backend, sem chaves e sem serviços de terceiros por padrão** (fontes auto-hospedadas; o GA4 é opcional e só carrega com consentimento).

## Capítulos

| # | Seção | O que acontece |
|---|---|---|
| — | Hero `#inicio` | Vídeo em loop com 5 cenas (mar turquesa, cruzeiro, Mediterrâneo, lago/montanhas, neve) e versões separadas para tela vertical e horizontal. Poster AVIF instantâneo. Título revelado por máscara e HUD “Cena 0X/05” sincronizado com o vídeo. Botão de pausa (WCAG 2.2.2). No desktop, ao rolar, a cena vira uma “janela” com cantos arredondados e entra “O mundo está esperando.” |
| — | Manifesto | Frase real do site com revelação palavra a palavra conforme o scroll, mais um marquee com todos os serviços. |
| II | Destinos `#destinos` | Seis cenas em tela cheia, empilhadas (*sticky*): Praias, Europa, Dubai, África, Ásia e Ecoturismo. Cada nova cena se abre como uma janela (clip-path) com parallax, enquanto a anterior recua em profundidade. Nomes gigantes revelados letra a letra. Filtros funcionais (Aventura, Relax, Cultura, Família), navegação de cenas acessível e CTA de WhatsApp contextual em cada destino. |
| III | Cruzeiros `#cruzeiros` | Sequência de 93 quadros desenhada em `<canvas>` e controlada pelo scroll. Uma câmera virtual se aproxima e se afasta enquanto o navio navega, chega o pôr do sol e a cena termina na vista aérea do porto. Inclui vinheta, textos sincronizados (3 tempos), linha náutica com navio e onda. A versão vertical usa quadros recortados para o iPhone. |
| IV | Serviços `#servicos` | Cada serviço tem um tratamento próprio: o avião percorre a rota sobre as nuvens (MotionPath); a hospedagem se revela atrás de uma cortina; o seguro aparece com uma mala animada em SVG; o transfer traça a rota aeroporto → hotel; os passeios abrem um leque de polaroids. Fecha com um índice completo dos 11 serviços e prévia de imagem que segue o cursor. |
| — | Corporativo `#corporativo` | Gestão de viagens, transfer executivo, eventos/feiras/convenções e política de viagens. Botão “Solicitar uma proposta corporativa” (WhatsApp) e e-mail pré-preenchido. |
| V | Nossa história `#historia` | Colagem editorial com as fotos reais da família, reveladas por máscaras em direções alternadas com parallax diferencial. Inclui missão, visão e valores (texto real do site). |
| VI | Planejador `#planejar` | Assistente em 7 passos com cards visuais, validação, barra de progresso, transições, progresso salvo na sessão e tela de resumo editável. O botão envia ao WhatsApp uma mensagem completa e codificada para **+55 11 91671-5882**. |
| VII | Explorador `#explorar` | Globo ortográfico em SVG: arrastar para girar, abas por região (teclado: ←/→), rotação animada até a região escolhida, arco ilustrativo a partir de São Paulo, painel com imagem, inspirações e CTA. O mapa (56 KB) só carrega quando a seção se aproxima. |
| VIII | Fechamento `#contato` | Pôr do sol em vídeo, CTA “Começar minha próxima viagem”, FAQ acessível e rodapé com todos os contatos. |

Também inclui: menu móvel em tela cheia (Esc fecha, foco gerenciado), botão flutuante de WhatsApp que se esconde no planejador, nos cruzeiros e no fechamento, *skip link*, foco visível, suporte a `prefers-reduced-motion` (versão estática do cruzeiro, vídeos sem autoplay, animações desligadas) e respeito ao `saveData`.

## Comandos

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # gera out/
npm start          # serve out/ localmente
npm run lint       # ESLint (config do Next)
npm run typecheck  # tsc --noEmit
npm test           # testes do planejador e dos links wa.me (node:test)
```

Pipeline de mídia (só é necessário para trocar vídeos/imagens):

```bash
npm run media -- <pasta-com-os-originais>   # ffmpeg: hero, quadros do cruzeiro, loops e posters
npm run images                              # sharp: AVIF/WebP/JPG responsivos a partir de media-src/
```

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Em **Root Directory**, informe `beloti-travel`. O framework é detectado automaticamente; a saída é estática (`output: "export"`).
3. Variáveis (opcionais): `NEXT_PUBLIC_SITE_URL` (padrão `https://belotitravel.com`) e `NEXT_PUBLIC_GA_ID`.
4. O `vercel.json` já define cache longo para `/_next/static`, `/img` e `/media`, além de cabeçalhos de segurança.

Em outras hospedagens, publique a pasta `out/` e configure cache longo para `/img`, `/media` e `/_next/static`.

> Este projeto **não** altera o site publicado em belotitravel.com. Apontar o domínio para o novo site é uma decisão do cliente.

## Analytics

Todos os CTAs chamam `track()` (`lib/analytics.ts`) com os eventos `hero_cta_click`, `destination_click`, `cruise_cta_click`, `corporate_cta_click`, `trip_planner_start`, `trip_planner_step`, `trip_planner_complete`, `region_select` e `whatsapp_click`.

- **Sem `NEXT_PUBLIC_GA_ID`**, nada é enviado a terceiros. Os eventos são apenas disparados localmente como `CustomEvent("beloti:track")`.
- **Com o ID**, aparece um aviso de consentimento (LGPD). O GA4 só carrega após “Aceitar”.

## Testes e qualidade (medidos nesta entrega)

- `npm run build`, `npm run lint`, `npm run typecheck`: sem erros.
- `npm test`: 4/4 testes passando (validação dos 7 passos, formatação de datas, conteúdo da mensagem, número e codificação do link wa.me).
- E2E com Playwright (iPhone 14 e desktop 1440×900):
  - **Links:** 30 links wa.me, todos com o número correto; todas as âncoras internas existem.
  - **Planejador:** fluxo completo, incluindo os erros de validação e a mensagem final conferida; o progresso persiste após recarregar a página.
  - **Interações:** filtros de destinos e menu móvel (abre e fecha com Esc).
  - **Layout e console:** sem overflow horizontal e sem erros no console, inclusive com movimento reduzido.
- Lighthouse 12.8 (servidor local, build de produção):
  - **Desktop:** Performance 98 · Acessibilidade 97 · Boas práticas 100 · SEO 100.
  - **Mobile (simulado, 4× CPU, 4G lento):** Performance 77 · Acessibilidade 97 · Boas práticas 100 · SEO 100.
    - LCP simulado de 4,0 s (o LCP observado foi 0,23 s), TBT 400 ms, CLS 0.
    - O custo vem do JavaScript de animação (GSAP e hidratação de uma página longa). Esse é o compromisso técnico principal; veja “Próximos passos”.
  - **Pendências de acessibilidade apontadas:** o contraste inicial das palavras do manifesto, que ficam esmaecidas de propósito até o scroll revelá-las, e a correspondência entre rótulo e texto do link do logotipo.

## Limites conhecidos e próximos passos

- After Effects não foi usado: não havia software nem projeto disponível no ambiente. Todo o motion é GSAP/SVG/canvas. Para integrar trabalhos do AE, exporte Lottie (Bodymovin) ou vídeo H.264/WebM e substitua, por exemplo, a mala SVG ou a linha náutica.
- Para subir a nota mobile:
  - carregar sob demanda os capítulos abaixo da dobra (`next/dynamic` + IntersectionObserver);
  - mover o SplitText para um chunk carregado depois;
  - testar a performance num dispositivo real.
- WebM/VP9 não foi gerado (MP4 H.264 cobre todos os navegadores atuais). Pode ser adicionado como `<source>` extra.
- Veja `docs/MEDIA.md` para créditos, licenças e mídias a substituir.

## Pré-visualização em arquivo único (celular, sem servidor)

```bash
npm run preview:file   # gera preview/beloti-preview.html (~12 MB, tudo embutido)
```

Usa o build do webpack, embute JS, CSS, fontes, imagens (WebP), os vídeos verticais e os quadros do cruzeiro, e resolve as mídias via `lib/asset.ts`. Serve para revisar no iPhone; para produção, use o deploy normal (`out/`).
