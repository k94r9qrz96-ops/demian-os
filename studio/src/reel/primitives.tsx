import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import type {Brand} from './types';

// Zona segura para 1080×1920 (deja libre la interfaz de IG/TikTok: arriba ~220px, abajo ~380px, derecha ~140px)
export const SAFE = {top: 230, bottom: 400, side: 90, right: 150};

export const BrandContext = React.createContext<Brand | null>(null);
export const useBrand = () => {
  const b = React.useContext(BrandContext);
  if (!b) throw new Error('Falta BrandContext');
  return b;
};

// Fondo vivo: degradados que respiran + retícula sutil + grano. Da sensación premium sin distraer.
export const LiveBackground: React.FC<{intensity?: number}> = ({intensity = 1}) => {
  const frame = useCurrentFrame();
  const {colores} = useBrand();
  const t = frame / 30;
  const b1x = 30 + Math.sin(t * 0.6) * 18;
  const b1y = 25 + Math.cos(t * 0.5) * 10;
  const b2x = 70 + Math.cos(t * 0.45) * 16;
  const b2y = 78 + Math.sin(t * 0.55) * 10;
  return (
    <AbsoluteFill style={{background: colores.fondo, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          opacity: 0.55 * intensity,
          background: `radial-gradient(circle at ${b1x}% ${b1y}%, ${colores.primario} 0%, transparent 42%), radial-gradient(circle at ${b2x}% ${b2y}%, ${colores.acento} 0%, transparent 38%)`,
          filter: 'blur(60px)',
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.07,
          backgroundImage: `linear-gradient(${colores.texto} 1px, transparent 1px), linear-gradient(90deg, ${colores.texto} 1px, transparent 1px)`,
          backgroundSize: '90px 90px',
          backgroundPosition: `0 ${(frame * 0.6) % 90}px`,
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <Grain />
    </AbsoluteFill>
  );
};

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = frame % 6;
  return (
    <AbsoluteFill style={{opacity: 0.09, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
      <svg width="100%" height="100%">
        <filter id={`g${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

// Palabra que entra con desenfoque + subida + resorte. Base de la tipografía cinética.
export const KineticWord: React.FC<{children: string; delay: number; color?: string; highlight?: boolean; size: number}> = ({
  children, delay, color, highlight, size,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {colores} = useBrand();
  const s = spring({frame: frame - delay, fps, config: {damping: 15, stiffness: 140, mass: 0.7}});
  const blur = interpolate(s, [0, 1], [16, 0]);
  const sweep = interpolate(frame - delay - 6, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <span style={{display: 'inline-block', position: 'relative', marginRight: size * 0.22, transform: `translateY(${(1 - s) * size * 0.6}px)`, opacity: s, filter: `blur(${blur}px)`}}>
      {highlight && (
        <span
          style={{
            position: 'absolute', left: -size * 0.12, right: -size * 0.12, top: '12%', bottom: '6%',
            background: colores.primario, borderRadius: size * 0.14, transformOrigin: 'left center', transform: `scaleX(${sweep})`, zIndex: 0,
          }}
        />
      )}
      <span style={{position: 'relative', zIndex: 1, color: highlight ? colores.texto : color ?? colores.texto}}>{children}</span>
    </span>
  );
};

export const KineticLines: React.FC<{lineas: string[]; resaltar?: string; size: number; startDelay?: number; stagger?: number; align?: 'left' | 'center'}> = ({
  lineas, resaltar, size, startDelay = 0, stagger = 3, align = 'left',
}) => {
  let i = 0;
  const hl = (resaltar ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return (
    <div style={{fontSize: size, lineHeight: 1.08, fontWeight: 800, letterSpacing: -size * 0.03, textAlign: align}}>
      {lineas.map((l, li) => (
        <div key={li}>
          {l.split(/\s+/).map((w, wi) => {
            const d = startDelay + i++ * stagger;
            const clean = w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
            return <KineticWord key={wi} delay={d} size={size} highlight={hl.includes(clean)}>{w}</KineticWord>;
          })}
        </div>
      ))}
    </div>
  );
};

export const Kicker: React.FC<{children: string; delay?: number}> = ({children, delay = 0}) => {
  const frame = useCurrentFrame();
  const {colores} = useBrand();
  const p = interpolate(frame - delay, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <div style={{display: 'inline-flex', alignItems: 'center', gap: 16, fontSize: 34, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase', color: colores.acento, opacity: p, transform: `translateX(${(1 - p) * -40}px)`}}>
      <span style={{width: 60 * p, height: 4, background: colores.acento, borderRadius: 2}} />
      {children}
    </div>
  );
};

// Salida suave de cada escena para que la transición no corte en seco
export const useExit = (durationInFrames: number, len = 8) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [durationInFrames - len, durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
};
