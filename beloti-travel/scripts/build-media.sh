#!/usr/bin/env bash
# Pipeline de mídia (ffmpeg). Uso: scripts/build-media.sh <pasta-com-originais-pexels>
# Gera vídeos H.264 otimizados, posters e a sequência de quadros do cruzeiro.
set -euo pipefail
SRC="${1:?pasta de originais}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/media"
mkdir -p "$OUT/cruise/d" "$OUT/cruise/m" "$OUT/tmp"
X264="-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart -an"

# ---------- HERO: montagem de 5 cenas com crossfade ----------
seg() { # in start dur out vf
  ffmpeg -v error -y -ss "$2" -t "$3" -i "$SRC/$1" -vf "$5,fps=25,setsar=1" $X264 -crf 18 "$OUT/tmp/$4.mp4"; }
D="scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720"
M="scale=-2:1280,crop=720:1280"
for v in d m; do
  [ $v = d ] && VF=$D || VF=$M
  seg 7618000-hd_1920_1080_25fps.mp4 2 4 h1$v "$VF"
  seg 10167690-hd_1920_1080_30fps.mp4 17.2 4 h2$v "$VF"
  seg 20707597-hd_1920_1080_30fps.mp4 4 4 h3$v "$VF"
  seg 11321500-hd_1920_1080_30fps.mp4 3 4 h4$v "$VF"
  seg 2110771-hd_1920_1080_30fps.mp4 2 4 h5$v "$VF"
  ffmpeg -v error -y -i "$OUT/tmp/h1$v.mp4" -i "$OUT/tmp/h2$v.mp4" -i "$OUT/tmp/h3$v.mp4" -i "$OUT/tmp/h4$v.mp4" -i "$OUT/tmp/h5$v.mp4" \
   -filter_complex "[0][1]xfade=transition=fade:duration=0.8:offset=3.2[a];[a][2]xfade=transition=fade:duration=0.8:offset=6.4[b];[b][3]xfade=transition=fade:duration=0.8:offset=9.6[c];[c][4]xfade=transition=fade:duration=0.8:offset=12.8,eq=saturation=0.92:contrast=1.03[o]" \
   -map "[o]" $X264 -crf 28 -maxrate 2.2M -bufsize 4M -g 50 "$OUT/hero-$v.mp4"
done
ffmpeg -v error -y -i "$OUT/tmp/h1d.mp4" -frames:v 1 -q:v 3 "$OUT/tmp/hero-poster-d.jpg"
ffmpeg -v error -y -i "$OUT/tmp/h1m.mp4" -frames:v 1 -q:v 3 "$OUT/tmp/hero-poster-m.jpg"

# ---------- CRUZEIRO: sequência de quadros (scroll-scrub em canvas) ----------
# 17s→35.5s: navio em movimento → pôr do sol → vista aérea do porto
ffmpeg -v error -y -ss 17 -t 18.5 -i "$SRC/10167690-hd_1920_1080_30fps.mp4" -vf "fps=5,scale=1280:720" -c:v libwebp -quality 58 "$OUT/cruise/d/%03d.webp"
ffmpeg -v error -y -ss 17 -t 18.5 -i "$SRC/10167690-hd_1920_1080_30fps.mp4" -vf "fps=5,crop=640:1080:860:0,scale=540:912" -c:v libwebp -quality 55 "$OUT/cruise/m/%03d.webp"

# ---------- Loops curtos ----------
ffmpeg -v error -y -ss 1 -t 7 -i "$SRC/7618000-hd_1920_1080_25fps.mp4" -vf "scale=960:-2,fps=25" $X264 -crf 29 "$OUT/praias.mp4"
ffmpeg -v error -y -ss 4 -t 10 -i "$SRC/11130971-hd_1920_1080_30fps.mp4" -vf "scale=1280:-2,fps=25" $X264 -crf 29 "$OUT/clouds.mp4"
ffmpeg -v error -y -ss 2 -t 10 -i "$SRC/4801449-hd_1920_1080_30fps.mp4" -vf "scale=1280:-2,fps=25" $X264 -crf 28 "$OUT/sunset-d.mp4"
ffmpeg -v error -y -ss 8 -t 10 -i "$SRC/5189814-hd_1080_1920_30fps.mp4" -vf "scale=720:-2,fps=25" $X264 -crf 28 "$OUT/sunset-m.mp4"
for f in praias clouds sunset-d sunset-m; do ffmpeg -v error -y -i "$OUT/$f.mp4" -frames:v 1 -q:v 3 "$OUT/tmp/$f-poster.jpg"; done
# quadros estáticos de vídeos para imagens de destino
ffmpeg -v error -y -ss 5 -i "$SRC/20707597-hd_1920_1080_30fps.mp4" -frames:v 1 -q:v 2 "$OUT/tmp/europa-santorini.jpg"
ffmpeg -v error -y -ss 3 -i "$SRC/15437348-hd_1920_1080_24fps.mp4" -frames:v 1 -q:v 2 "$OUT/tmp/europa-amalfi.jpg"
ffmpeg -v error -y -ss 3 -i "$SRC/5101347-hd_1920_1080_25fps.mp4" -frames:v 1 -q:v 2 "$OUT/tmp/dubai.jpg"
ffmpeg -v error -y -ss 31.5 -i "$SRC/10167690-hd_1920_1080_30fps.mp4" -frames:v 1 -q:v 2 "$OUT/tmp/porto.jpg"
ffmpeg -v error -y -ss 26 -i "$SRC/10167690-hd_1920_1080_30fps.mp4" -frames:v 1 -q:v 2 "$OUT/tmp/cruise-poster.jpg"
echo "ok -> $OUT"
