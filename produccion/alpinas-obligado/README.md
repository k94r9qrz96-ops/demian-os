# Reel Alpinas Obligado — finde largo

- `entrega/alpinas-obligado-reel.mp4` — MP4 final 1080×1920, 30 s, H.264 High + AAC 256k, −14 LUFS.
- `entrega/alpinas-obligado-portada.jpg` — portada 1080×1920.
- `entrega/copy-instagram.txt` — texto para la publicación.
- `proyecto/` — composición Remotion `AlpinasObligado` (+ still `Portada`) y scripts:
  - `scripts/prep.sh`: corte, estabilización (vidstab), slow-motion por interpolación, denoise, escalado Lanczos, nitidez CAS y grading.
  - `scripts/compose.py`: música original (piano + pad + reverb) a 70 BPM, secciones del reel en compases de 3,43 s.
  - `scripts/mix.py`: mezcla voz/música/ambiente con ducking suave; luego loudnorm 2 pasadas a −14 LUFS / −1,5 dBTP.
- Los videos originales del cliente no se suben al repositorio.
