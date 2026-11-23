import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {Kicker, KineticLines, LiveBackground, SAFE, useBrand, useExit} from './primitives';
import type {Scene} from './types';

type P<T extends Scene['tipo']> = Extract<Scene, {tipo: T}> & {frames: number};

const Pad: React.FC<{children: React.ReactNode; justify?: 'center' | 'flex-start' | 'flex-end'}> = ({children, justify = 'center'}) => (
  <AbsoluteFill style={{paddingTop: SAFE.top, paddingBottom: SAFE.bottom, paddingLeft: SAFE.side, paddingRight: SAFE.right, justifyContent: justify}}>{children}</AbsoluteFill>
);

// 1) GANCHO: tipografía cinética grande + flash inicial. Lo primero que se ve tiene que frenar el scroll.
export const HookScene: React.FC<P<'hook'>> = ({lineas, resaltar, kicker, frames}) => {
  const frame = useCurrentFrame();
  const exit = useExit(frames);
  const flash = interpolate(frame, [0, 4], [0.9, 0], {extrapolateRight: 'clamp'});
  const punch = interpolate(frame, [0, 18], [1.12, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.exp)});
  return (
    <AbsoluteFill style={{opacity: exit}}>
      <LiveBackground intensity={1.2} />
      <Pad>
        <div style={{transform: `scale(${punch})`, transformOrigin: 'left center'}}>
          {kicker && <div style={{marginBottom: 40}}><Kicker delay={2}>{kicker}</Kicker></div>}
          <KineticLines lineas={lineas} resaltar={resaltar} size={124} startDelay={3} stagger={3} />
        </div>
      </Pad>
      <AbsoluteFill style={{background: 'white', opacity: flash}} />
    </AbsoluteFill>
  );
};

// 2) MEDIA REAL del cliente (foto o video autorizado) con movimiento de cámara y texto
export const MediaScene: React.FC<P<'media'>> = ({src, video, titulo, texto, movimiento = 'zoomin', frames}) => {
  const frame = useCurrentFrame();
  const {colores} = useBrand();
  const p = frame / frames;
  const t = {
    zoomin: `scale(${1 + 0.12 * p})`,
    zoomout: `scale(${1.14 - 0.12 * p})`,
    panizq: `scale(1.12) translateX(${4 - 8 * p}%)`,
    pander: `scale(1.12) translateX(${-4 + 8 * p}%)`,
  }[movimiento];
  const exit = useExit(frames);
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', transform: t};
  return (
    <AbsoluteFill style={{background: colores.fondo, opacity: exit}}>
      {video ? <OffthreadVideo src={staticFile(src)} style={style} muted /> : <Img src={staticFile(src)} style={style} />}
      <AbsoluteFill style={{background: `linear-gradient(180deg, transparent 35%, ${colores.fondo}EE 85%)`}} />
      <Pad justify="flex-end">
        {titulo && <KineticLines lineas={[titulo]} size={92} startDelay={6} />}
        {texto && <Sub delay={14}>{texto}</Sub>}
      </Pad>
    </AbsoluteFill>
  );
};

const Sub: React.FC<{children: string; delay: number}> = ({children, delay}) => {
  const frame = useCurrentFrame();
  const {colores} = useBrand();
  const o = interpolate(frame - delay, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{marginTop: 28, fontSize: 46, lineHeight: 1.3, fontWeight: 600, color: colores.texto, opacity: o * 0.85, transform: `translateY(${(1 - o) * 20}px)`}}>{children}</div>;
};

// 3) CONTRASTE: el conflicto. Tarjeta "antes" que se tacha y tarjeta "después" que la reemplaza.
export const ContrastScene: React.FC<P<'contraste'>> = ({antes, despues, etiquetaAntes = 'Hoy', etiquetaDespues = 'Con sistema', frames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {colores} = useBrand();
  const exit = useExit(frames);
  const a = spring({frame, fps, config: {damping: 16}});
  const strike = interpolate(frame, [18, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const b = spring({frame: frame - 30, fps, config: {damping: 13}});
  const card = (bg: string, border: string): React.CSSProperties => ({padding: '44px 48px', borderRadius: 36, background: bg, border: `3px solid ${border}`, backdropFilter: 'blur(20px)'});
  return (
    <AbsoluteFill style={{opacity: exit}}>
      <LiveBackground intensity={0.7} />
      <Pad>
        <div style={{...card('rgba(255,255,255,0.05)', 'rgba(255,255,255,0.15)'), opacity: interpolate(strike, [0, 1], [1, 0.45]), transform: `translateY(${(1 - a) * 80}px) scale(${1 - strike * 0.05})`}}>
          <div style={{fontSize: 32, letterSpacing: 4, textTransform: 'uppercase', color: colores.texto, opacity: 0.6, marginBottom: 16}}>{etiquetaAntes}</div>
          <div style={{fontSize: 64, fontWeight: 800, color: colores.texto, position: 'relative', display: 'inline-block'}}>
            {antes}
            <span style={{position: 'absolute', left: 0, top: '52%', height: 8, width: `${strike * 100}%`, background: '#FF4D5E', borderRadius: 4}} />
          </div>
        </div>
        <div style={{height: 40}} />
        <div style={{...card(`${colores.primario}33`, colores.primario), opacity: b, transform: `translateY(${(1 - b) * 120}px) scale(${0.9 + b * 0.1})`, boxShadow: `0 0 ${80 * b}px ${colores.primario}66`}}>
          <div style={{fontSize: 32, letterSpacing: 4, textTransform: 'uppercase', color: colores.acento, marginBottom: 16}}>{etiquetaDespues}</div>
          <div style={{fontSize: 72, fontWeight: 800, color: colores.texto}}>{despues}</div>
        </div>
      </Pad>
    </AbsoluteFill>
  );
};

// 4) LISTA: beneficios que aparecen de a uno con check animado
export const ListScene: React.FC<P<'lista'>> = ({titulo, items, frames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {colores} = useBrand();
  const exit = useExit(frames);
  const per = Math.min(13, Math.max(6, Math.floor((frames - 40) / Math.max(1, items.length))));
  return (
    <AbsoluteFill style={{opacity: exit}}>
      <LiveBackground intensity={0.8} />
      <Pad>
        <KineticLines lineas={[titulo]} size={96} />
        <div style={{height: 56}} />
        {items.map((it, i) => {
          const s = spring({frame: frame - 14 - i * per, fps, config: {damping: 14}});
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 32, marginBottom: 34, opacity: s, transform: `translateX(${(1 - s) * 120}px)`}}>
              <div style={{width: 76, height: 76, flexShrink: 0, borderRadius: 22, background: colores.acento, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${s}) rotate(${(1 - s) * -90}deg)`}}>
                <svg width="44" height="44" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={colores.fondo} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="24" strokeDashoffset={24 * (1 - s)} /></svg>
              </div>
              <div style={{fontSize: 58, fontWeight: 700, color: colores.texto, lineHeight: 1.15}}>{it}</div>
            </div>
          );
        })}
      </Pad>
    </AbsoluteFill>
  );
};

// 5) PROCESO: pasos conectados por una línea que se dibuja (muestra "cómo funciona")
export const ProcessScene: React.FC<P<'proceso'>> = ({titulo, pasos, frames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {colores} = useBrand();
  const exit = useExit(frames);
  const per = Math.min(14, Math.max(6, Math.floor((frames - 40) / Math.max(1, pasos.length))));
  const line = interpolate(frame, [10, 10 + per * pasos.length], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: exit}}>
      <LiveBackground intensity={0.8} />
      <Pad>
        {titulo && <><KineticLines lineas={[titulo]} size={88} /><div style={{height: 60}} /></>}
        <div style={{position: 'relative', paddingLeft: 10}}>
          <div style={{position: 'absolute', left: 48, top: 40, width: 6, height: `calc(${line * 100}% - 80px)`, background: `linear-gradient(${colores.primario}, ${colores.acento})`, borderRadius: 3}} />
          {pasos.map((p, i) => {
            const s = spring({frame: frame - 10 - i * per, fps, config: {damping: 13}});
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 36, marginBottom: 46, opacity: s}}>
                <div style={{width: 82, height: 82, flexShrink: 0, borderRadius: 41, background: colores.fondo, border: `5px solid ${i % 2 ? colores.acento : colores.primario}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 800, color: colores.texto, transform: `scale(${s})`, position: 'relative', zIndex: 1}}>{i + 1}</div>
                <div style={{fontSize: 56, fontWeight: 700, color: colores.texto, transform: `translateX(${(1 - s) * 60}px)`}}>{p}</div>
              </div>
            );
          })}
        </div>
      </Pad>
    </AbsoluteFill>
  );
};

// 6) FRASE: giro / idea fuerza, centrada
export const StatementScene: React.FC<P<'frase'>> = ({texto, resaltar, frames}) => {
  const exit = useExit(frames);
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, frames], [1, 1.06]);
  return (
    <AbsoluteFill style={{opacity: exit}}>
      <LiveBackground intensity={1} />
      <Pad>
        <div style={{transform: `scale(${zoom})`}}>
          <KineticLines lineas={texto.split('\n')} resaltar={resaltar} size={104} stagger={2} align="center" />
        </div>
      </Pad>
    </AbsoluteFill>
  );
};

// 7) CTA: marca + botón con pulso + subtítulo
export const CtaScene: React.FC<P<'cta'>> = ({titulo, boton, sub}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const brand = useBrand();
  const {colores} = brand;
  const s = spring({frame: frame - 14, fps, config: {damping: 11}});
  const pulse = 1 + Math.sin(Math.max(0, frame - 30) / 6) * 0.025;
  const ring = interpolate((frame - 30) % 36, [0, 36], [0, 1], {extrapolateLeft: 'clamp'});
  return (
    <AbsoluteFill>
      <LiveBackground intensity={1.3} />
      <Pad>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
          {brand.logo ? <Img src={staticFile(brand.logo)} style={{height: 140, marginBottom: 50, opacity: s}} /> : null}
          <KineticLines lineas={titulo.split('\n')} size={100} align="center" />
          <div style={{height: 70}} />
          <div style={{position: 'relative', transform: `scale(${s * pulse})`}}>
            {frame > 30 && <div style={{position: 'absolute', inset: 0, borderRadius: 999, border: `4px solid ${colores.acento}`, transform: `scale(${1 + ring * 0.35})`, opacity: 1 - ring}} />}
            <div style={{padding: '34px 70px', borderRadius: 999, background: `linear-gradient(90deg, ${colores.primario}, ${colores.acento})`, fontSize: 52, fontWeight: 800, color: colores.texto, boxShadow: `0 20px 80px ${colores.primario}88`}}>{boton}</div>
          </div>
          {sub && <div style={{marginTop: 46, fontSize: 42, fontWeight: 600, color: colores.texto, opacity: interpolate(frame, [30, 44], [0, 0.8], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>{sub}</div>}
        </div>
      </Pad>
    </AbsoluteFill>
  );
};
