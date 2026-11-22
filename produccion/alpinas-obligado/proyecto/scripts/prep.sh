#!/bin/bash
# id src start dur outdur stab grade
set -e
OUT=alpinas-obligado/public/shots
shot(){ id=$1; src=raw/v$2.mov; ss=$3; d=$4; od=$5; stab=$6; g=$7
  rate=$(python3 -c "print($d/$od)")
  tmp=/tmp/claude-0/s_$id; mkdir -p $tmp
  ffmpeg -v error -y -ss $ss -t $d -i $src -an -vf "fps=30" -c:v libx264 -crf 10 -preset fast $tmp/a.mp4
  if [ "$stab" = 1 ]; then
    (cd $tmp && ffmpeg -v error -y -i a.mp4 -vf vidstabdetect=shakiness=6:accuracy=15:result=t.trf -f null - && \
     ffmpeg -v error -y -i a.mp4 -vf "vidstabtransform=input=t.trf:smoothing=24:optzoom=1:zoomspeed=0.2:interpol=bicubic,unsharp=5:5:0.3" -c:v libx264 -crf 10 -preset fast b.mp4)
  else cp $tmp/a.mp4 $tmp/b.mp4; fi
  RT=""
  if python3 -c "import sys;sys.exit(0 if $rate<0.97 else 1)"; then RT="setpts=PTS/$rate,minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,"; fi
  case $g in
    ext) GR="colortemperature=temperature=5600:mix=0.55,eq=contrast=1.05:saturation=1.06:gamma=1.02,colorbalance=rs=0.02:bs=-0.03:rm=0.03:bm=-0.02:rh=0.02:gh=0.01:bh=-0.04,curves=master='0/0.03 0.25/0.24 0.75/0.78 1/0.97'";;
    int) GR="colortemperature=temperature=5200:mix=0.45,eq=contrast=1.04:saturation=1.04:brightness=0.02:gamma=1.06,colorbalance=rs=0.02:bs=-0.02:rh=0.02:bh=-0.03,curves=master='0/0.03 0.3/0.31 0.75/0.79 1/0.97'";;
  esac
  ffmpeg -v error -y -i $tmp/b.mp4 -vf "${RT}hqdn3d=1.5:1.5:4:4,scale=1080:1920:flags=lanczos,cas=0.45,$GR,format=yuv420p" -t $od -c:v libx264 -crf 14 -preset medium -r 30 $OUT/$id.mp4
  echo "$id $(ffprobe -v error -show_entries format=duration -of csv=p=0 $OUT/$id.mp4)"
}
shot s01 5 10.90 2.40 3.80 0 ext
shot s02 3 0.30 2.80 2.80 1 ext
shot s03 4 5.90 2.70 2.70 1 int
shot s04 4 15.00 2.10 2.20 1 int
shot s05 2 11.90 2.00 2.00 1 ext
shot s06 4 71.90 2.00 2.00 1 int
shot s07 4 85.10 2.00 2.10 1 int
shot s08 2 4.90 1.90 2.00 1 ext
shot s09 5 4.60 2.80 3.70 1 ext
shot s10 2 15.20 2.40 3.70 1 ext
shot s11 5 10.70 2.70 6.20 0 ext
