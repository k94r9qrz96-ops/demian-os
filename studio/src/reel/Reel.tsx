import React from 'react';
import {AbsoluteFill, Audio, CalculateMetadataFunction, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {TransitionSeries, springTiming, type TransitionPresentation} from '@remotion/transitions';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import {fade} from '@remotion/transitions/fade';
import {loadFont} from '@remotion/fonts';
import {BrandContext, SAFE} from './primitives';
import {ContrastScene, CtaScene, HookScene, ListScene, MediaScene, ProcessScene, StatementScene} from './scenes';
import type {ReelProps, Scene} from './types';

const FPS = 30;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presentations: Array<() => TransitionPresentation<any>> = [
  () => slide({direction: 'from-bottom'}),
  () => wipe({direction: 'from-left'}),
  () => slide({direction: 'from-right'}),
  () => fade(),
];

export const calculateReelMetadata: CalculateMetadataFunction<ReelProps> = ({props}) => {
  const t = props.transicion ?? 12;
  const total = props.escenas.reduce((a, s) => a + Math.round(s.duracion * FPS), 0) - t * Math.max(0, props.escenas.length - 1);
  return {durationInFrames: Math.max(1, total), fps: FPS};
};

const SceneSwitch: React.FC<{scene: Scene; frames: number}> = ({scene, frames}) => {
  switch (scene.tipo) {
    case 'hook': return <HookScene {...scene} frames={frames} />;
    case 'media': return <MediaScene {...scene} frames={frames} />;
    case 'contraste': return <ContrastScene {...scene} frames={frames} />;
    case 'lista': return <ListScene {...scene} frames={frames} />;
    case 'proceso': return <ProcessScene {...scene} frames={frames} />;
    case 'frase': return <StatementScene {...scene} frames={frames} />;
    case 'cta': return <CtaScene {...scene} frames={frames} />;
  }
};

const Captions: React.FC<{items: NonNullable<ReelProps['subtitulos']>; color: string; accent: string}> = ({items, color, accent}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const c = items.find((x) => t >= x.desde && t < x.hasta);
  if (!c) return null;
  const local = (t - c.desde) * fps;
  const s = interpolate(local, [0, 5], [0.85, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: SAFE.bottom - 120, paddingLeft: SAFE.side, paddingRight: SAFE.right}}>
      <div style={{transform: `scale(${s})`, fontSize: 54, fontWeight: 800, color, textAlign: 'center', padding: '14px 28px', borderRadius: 18, background: 'rgba(0,0,0,0.55)', borderBottom: `5px solid ${accent}`}}>{c.texto}</div>
    </AbsoluteFill>
  );
};

export const Reel: React.FC<ReelProps> = (props) => {
  const {brand, escenas, subtitulos, musica, marcaDeAgua} = props;
  const t = props.transicion ?? 12;
  const {durationInFrames} = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = React.useState(() => delayRender('Cargando tipografías de la marca'));
  React.useEffect(() => {
    const fonts = [loadFont({family: 'BrandTitle', url: staticFile(brand.tipografia.titulos), weight: '800'})];
    if (brand.tipografia.cuerpo) fonts.push(loadFont({family: 'BrandBody', url: staticFile(brand.tipografia.cuerpo)}));
    Promise.all(fonts).then(() => continueRender(handle)).catch((e) => { console.error(e); continueRender(handle); });
  }, [brand, handle]);

  const vol = (f: number) => (musica?.volumen ?? 0.6) * interpolate(f, [0, 10, durationInFrames - 25, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <BrandContext.Provider value={brand}>
      <AbsoluteFill style={{fontFamily: 'BrandTitle, BrandBody, sans-serif', background: brand.colores.fondo}}>
        <TransitionSeries>
          {escenas.flatMap((s, i) => {
            const frames = Math.round(s.duracion * FPS);
            const seq = (
              <TransitionSeries.Sequence key={`s${i}`} name={`${i + 1}. ${s.tipo}`} durationInFrames={frames}>
                <SceneSwitch scene={s} frames={frames} />
              </TransitionSeries.Sequence>
            );
            if (i === 0) return [seq];
            return [
              <TransitionSeries.Transition key={`t${i}`} presentation={presentations[i % presentations.length]()} timing={springTiming({config: {damping: 200}, durationInFrames: t})} />,
              seq,
            ];
          })}
        </TransitionSeries>
        {subtitulos?.length ? <Captions items={subtitulos} color={brand.colores.texto} accent={brand.colores.acento} /> : null}
        {brand.handle ? (
          <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'flex-start', padding: `${SAFE.top - 110}px ${SAFE.side}px`}}>
            <div style={{fontSize: 30, fontWeight: 700, color: brand.colores.texto, opacity: 0.7, letterSpacing: 2}}>{brand.handle}</div>
          </AbsoluteFill>
        ) : null}
        {marcaDeAgua ? (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', pointerEvents: 'none'}}>
            <div style={{transform: 'rotate(-30deg)', fontSize: 70, fontWeight: 800, color: 'rgba(255,255,255,0.12)', whiteSpace: 'nowrap'}}>{marcaDeAgua}</div>
          </AbsoluteFill>
        ) : null}
        <div style={{position: 'absolute', top: 0, left: 0, height: 6, width: `${(frame / durationInFrames) * 100}%`, background: brand.colores.acento, opacity: 0.8}} />
        {musica ? <Audio src={staticFile(musica.src)} volume={vol} /> : null}
      </AbsoluteFill>
    </BrandContext.Provider>
  );
};
