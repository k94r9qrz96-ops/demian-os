# Mídias, licenças e pendências

## Origem das mídias usadas

| Arquivo(s) | Origem | Licença |
|---|---|---|
| `media/hero-d.mp4`, `media/hero-m.mp4` | Montagem própria de 5 clipes Pexels: 7618000 (Taryn Elliott), 10167690 (Mylo Kaye), 20707597, 11321500, 2110771 | Licença Pexels (uso comercial gratuito, sem atribuição obrigatória) |
| `media/cruise/{d,m}/*.webp`, `img/cruise-poster*`, `img/porto*` | Quadros do clipe Pexels 10167690 (17 s → 35,5 s) | Licença Pexels |
| `media/praias.mp4` | Pexels 7618000 | Licença Pexels |
| `media/clouds.mp4` | Pexels 11130971 | Licença Pexels |
| `media/sunset-d.mp4` / `sunset-m.mp4` | Pexels 4801449 / 5189814 | Licença Pexels |
| `img/europa-santorini*`, `img/europa-amalfi*`, `img/dubai*` | Quadros dos clipes Pexels 20707597, 15437348 e 5101347 | Licença Pexels |
| `img/praias-rio*` | Pexels foto 30212989 | Licença Pexels |
| `img/africa*` | Pexels foto 13142739 (Isis Petroni) | Licença Pexels |
| `img/asia*` | Pexels foto 3625108 (LUNA LUNA) | Licença Pexels |
| `img/ecoturismo*` | Pexels foto 21352676 (Marina Zvada) | Licença Pexels |
| `img/hotel*` | Pexels foto 24807132 | Licença Pexels |
| `img/seguro*`, `img/transfer*`, `img/passeios*`, `img/corporativo*`, `img/maldivas*`, `img/pacote*` | Pexels fotos 842961, 19626588, 15847936, 4173205, 28843922, 32642485 | Licença Pexels |
| `img/familia-selfie*`, `img/familia-parque*` | Fotos publicadas pela própria Beloti Travel em belotitravel.com (página “Quem somos”) | Acervo do cliente |
| `img/familia-mar*`, `img/familia-coqueiros*`, `img/familia-praia*` | Recortes das capturas de stories enviadas pelo cliente | Acervo do cliente |
| `apple-touch-icon.png`, `favicon.ico`, `app/icon.png` | Logotipo de belotitravel.com | Marca do cliente |
| `fonts/*` | Cormorant Garamond e Manrope (via Fontsource) | SIL Open Font License |

Alguns clipes mostram a marca de uma companhia de cruzeiros no casco (na sequência do cruzeiro e na cena 2 do hero). O texto do site não sugere parceria nem posse do navio. Se preferir neutralidade total, troque por outro clipe.

## Confirmar ou substituir com o cliente

1. **Autorização das fotos da família.** Confirme que todas as pessoas, inclusive a criança, autorizam a publicação. As fotos dos stories são recortes de capturas de tela; o ideal é receber os originais em alta resolução.
2. **Logotipo vetorial oficial.** `components/Logo.tsx` é uma reconstrução em SVG feita a partir do logotipo público. Substitua pelo arquivo SVG oficial.
3. **Vídeos próprios da agência.** Se houver material real de viagens de clientes com autorização, ele fortalece muito a autenticidade, sobretudo no hero e no fechamento.
4. **GA4.** Informe o ID (`NEXT_PUBLIC_GA_ID`) se quiser medição.
5. **Endereço completo e CNPJ** (opcional), para o rodapé e os dados estruturados. O site atual informa apenas “Centro, São Bernardo do Campo”.

## Regenerar mídias

Os originais em alta resolução ficam em `media-src/`, que não é versionado. Os vídeos originais vêm de `https://videos.pexels.com/video-files/<id>/<id>-hd_1920_1080_<fps>fps.mp4`.

```bash
npm run media -- /caminho/dos/originais
npm run images
```
