import React from 'react';
import {AbsoluteFill, Audio, CalculateMetadataFunction, continueRender, delayRender, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Brand, Ctx, DISPLAY, Grain, SceneShell, Timeline, Vignette, prog, spr, useT} from './core';
import {Beneficio, Cta, Pilares, Pregunta, Problema, Transformacion} from './scenes';

export type ReelProProps = {brand: Brand; timeline: Timeline; audio: string | null; marcaDeAgua: string | null};

export const calculateReelProMetadata: CalculateMetadataFunction<ReelProProps> = ({props}) => ({
  durationInFrames: Math.round(props.timeline.duracion * 30), fps: 30,
});

const SCENES: Record<string, React.FC<{s: any; i: number}>> = {pregunta: Pregunta, problema: Problema, transformacion: Transformacion, pilares: Pilares, beneficio: Beneficio, cta: Cta};
const ENTRADA: Record<string, 'zoom' | 'iris' | 'corte' | 'subida'> = {pregunta: 'corte', problema: 'zoom', transformacion: 'iris', pilares: 'zoom', beneficio: 'subida', cta: 'iris'};

// Subtítulos tipo karaoke: bloque de 2–4 palabras, la palabra que suena se ilumina
const Captions: React.FC = () => {
  const t = useT();
  const {tl, brand} = React.useContext(Ctx)!;
  const cap = tl.subtitulos.find((c) => t >= c.desde - 0.02 && t < c.hasta);
  if (!cap) return null;
  const p = spr(t, cap.desde - 0.02, {damping: 18, stiffness: 220});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 360, paddingLeft: 70, paddingRight: 70}}>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 16px', padding: '16px 30px', borderRadius: 22, background: 'rgba(8,8,12,0.62)', backdropFilter: 'blur(10px)', transform: `translateY(${(1 - p) * 24}px) scale(${0.94 + 0.06 * p})`, opacity: p}}>
        {cap.palabras.map((w, k) => {
          const on = t >= w.desde - 0.03;
          const now = on && t < w.hasta + 0.05;
          return (
            <span key={k} style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 50, letterSpacing: -0.5, color: now ? brand.colores.acento : on ? '#fff' : 'rgba(255,255,255,0.45)', transform: `scale(${now ? 1.06 : 1})`, display: 'inline-block'}}>{w.palabra}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Watermark: React.FC<{text: string}> = ({text}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div style={{transform: 'rotate(-28deg)', fontFamily: DISPLAY, fontWeight: 900, fontSize: 150, letterSpacing: 20, color: 'rgba(255,255,255,0.07)', whiteSpace: 'nowrap'}}>BORRADOR</div>
    </AbsoluteFill>
    <div style={{position: 'absolute', top: 120, right: 60, padding: '10px 20px', borderRadius: 10, background: 'rgba(255,209,102,0.92)', color: '#111', fontFamily: DISPLAY, fontWeight: 800, fontSize: 24, letterSpacing: 2}}>{text}</div>
  </AbsoluteFill>
);

// Destello de luz entre escenas (overlay que no acorta el tiempo)
const Flashes: React.FC = () => {
  const t = useT();
  const {tl} = React.useContext(Ctx)!;
  let o = 0;
  for (const s of tl.escenas.slice(1)) { const d = t - s.desde; if (d > -0.05 && d < 0.35) o = Math.max(o, (1 - prog(t, s.desde - 0.05, 0.4)) * 0.55); }
  return <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 45%, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)', opacity: o, mixBlendMode: 'screen', pointerEvents: 'none'}} />;
};

export const ReelPro: React.FC<ReelProProps> = ({brand, timeline, audio, marcaDeAgua}) => {
  const [h] = React.useState(() => delayRender('Fuentes de la marca'));
  React.useEffect(() => {
    const fs = [loadFont({family: 'RushyDisplay', url: staticFile(brand.tipografia.titulos), weight: '100 900'})];
    if (brand.tipografia.acento) fs.push(loadFont({family: 'RushySerif', url: staticFile(brand.tipografia.acento), style: 'italic'}));
    Promise.all(fs).then(() => continueRender(h)).catch((e) => { console.error(e); continueRender(h); });
  }, [brand, h]);
  return (
    <Ctx.Provider value={{brand, tl: timeline}}>
      <AbsoluteFill style={{background: brand.colores.fondo, overflow: 'hidden'}}>
        {timeline.escenas.map((s, i) => {
          const Comp = SCENES[s.tipo];
          if (!Comp) return null;
          return (
            <SceneShell key={i} desde={s.desde} hasta={s.hasta} entrada={i === 0 ? 'corte' : ENTRADA[s.tipo]} salida={i === timeline.escenas.length - 1 ? 'corte' : 'zoom'}>
              <Comp s={s} i={i} />
            </SceneShell>
          );
        })}
        <Flashes />
        <Captions />
        <Vignette />
        <Grain />
        {marcaDeAgua ? <Watermark text={marcaDeAgua} /> : null}
        {audio ? <Audio src={staticFile(audio)} /> : null}
      </AbsoluteFill>
    </Ctx.Provider>
  );
};
