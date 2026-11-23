import React from 'react';
import {AbsoluteFill, Easing, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export type Brand = {
  slug: string;
  nombre: string;
  handle?: string | null;
  colores: {fondo: string; primario: string; acento: string; texto: string; calido?: string};
  tipografia: {titulos: string; acento?: string; cuerpo?: string};
  logo?: string | null;
};
export type Word = {palabra: string; desde: number; hasta: number};
export type Timeline = {
  duracion: number;
  escenas: Array<Record<string, any> & {tipo: string; desde: number; hasta: number}>;
  eventos: Record<string, number>;
  subtitulos: Array<{desde: number; hasta: number; palabras: Word[]}>;
};

export const Ctx = React.createContext<{brand: Brand; tl: Timeline} | null>(null);
export const useCtx = () => React.useContext(Ctx)!;
export const C = () => useCtx().brand.colores;

export const DISPLAY = 'RushyDisplay, "Inter Tight", Poppins, sans-serif';
export const SERIF = 'RushySerif, "Instrument Serif", Georgia, serif';

export const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return f / fps;
};
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const prog = (t: number, a: number, d: number, e: (x: number) => number = Easing.out(Easing.cubic)) => e(clamp01((t - a) / d));
export const inOut = Easing.inOut(Easing.cubic);
export const expo = Easing.out(Easing.exp);
export const spr = (t: number, a: number, cfg: {damping?: number; stiffness?: number; mass?: number} = {}) =>
  t < a ? 0 : spring({frame: (t - a) * 30, fps: 30, config: {damping: 14, stiffness: 140, mass: 0.8, ...cfg}});
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

// Sacudida de cámara que decae después de cada impacto
export const shake = (t: number, hits: number[], amp = 16) => {
  let x = 0, y = 0, r = 0;
  for (const h of hits) {
    const d = t - h;
    if (d < 0 || d > 0.5) continue;
    const k = amp * Math.exp(-d * 9);
    x += Math.sin(d * 90) * k; y += Math.cos(d * 70) * k * 0.7; r += Math.sin(d * 60) * k * 0.03;
  }
  return `translate(${x}px, ${y}px) rotate(${r}deg)`;
};

// Fondo: degradado profundo + luces que respiran + viñeta
export const Atmosphere: React.FC<{tone?: 'frio' | 'gris' | 'calido'; energy?: number}> = ({tone = 'frio', energy = 1}) => {
  const t = useT();
  const c = C();
  const a = tone === 'gris' ? '#3a3d4a' : c.primario;
  const b = tone === 'gris' ? '#262830' : tone === 'calido' ? (c.calido ?? '#FF8A4C') : c.acento;
  return (
    <AbsoluteFill style={{background: tone === 'gris' ? '#0d0e12' : c.fondo, overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: 1400, height: 1400, left: -500 + Math.sin(t * 0.5) * 120, top: -420 + Math.cos(t * 0.4) * 90, borderRadius: '50%', background: `radial-gradient(circle, ${a}${tone === 'gris' ? '55' : '88'} 0%, transparent 60%)`, filter: 'blur(40px)', opacity: energy}} />
      <div style={{position: 'absolute', width: 1300, height: 1300, right: -560 + Math.cos(t * 0.45) * 110, bottom: -380 + Math.sin(t * 0.35) * 100, borderRadius: '50%', background: `radial-gradient(circle, ${b}${tone === 'gris' ? '44' : '66'} 0%, transparent 60%)`, filter: 'blur(40px)', opacity: energy}} />
    </AbsoluteFill>
  );
};

export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.07}) => {
  const f = useCurrentFrame();
  const s = f % 8;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity}}>
      <svg width="1080" height="1920">
        <filter id={`n${s}`}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={s} stitchTiles="stitch" /></filter>
        <rect width="1080" height="1920" filter={`url(#n${s})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%)'}} />
);

// Texto con máscara: cada palabra sube desde abajo de una "ranura" (look de títulos de cine)
export const MaskWords: React.FC<{text: string; t: number; at: number; size: number; font?: string; weight?: number; color?: string; stagger?: number; italic?: boolean; letter?: number; gradient?: string; stroke?: boolean; align?: 'left' | 'center'}> = ({
  text, t, at, size, font = DISPLAY, weight = 800, color, stagger = 0.05, letter = -0.035, gradient, stroke, align = 'center',
}) => {
  const c = C();
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: `0 ${size * 0.24}px`, lineHeight: 1}}>
      {text.split(' ').map((w, i) => {
        const p = spr(t, at + i * stagger, {damping: 18, stiffness: 170});
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', paddingBottom: size * 0.12, paddingTop: size * 0.04}}>
            <span style={{
              display: 'inline-block', fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: size * letter, color: gradient ? 'transparent' : color ?? c.texto,
              transform: `translateY(${(1 - p) * 110}%) rotate(${(1 - p) * 6}deg)`, filter: `blur(${(1 - p) * 8}px)`,
              ...(gradient ? {backgroundImage: gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text'} : {}),
              ...(stroke ? {WebkitTextStroke: `3px ${color ?? c.texto}`, color: 'transparent'} : {}),
            }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

// Etiqueta tipo "chip" para rotular (p. ej. EJEMPLO)
export const Chip: React.FC<{children: React.ReactNode; t: number; at: number; tone?: 'acento' | 'neutro' | 'aviso'; size?: number}> = ({children, t, at, tone = 'neutro', size = 28}) => {
  const c = C();
  const p = spr(t, at, {damping: 16});
  const bg = tone === 'acento' ? c.acento : tone === 'aviso' ? '#FFD166' : 'rgba(255,255,255,0.12)';
  const fg = tone === 'neutro' ? c.texto : '#0B0B10';
  return (
    <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, padding: `${size * 0.42}px ${size * 0.9}px`, borderRadius: 999, background: bg, color: fg, fontFamily: DISPLAY, fontWeight: 700, fontSize: size, letterSpacing: 1, opacity: p, transform: `translateY(${(1 - p) * 20}px) scale(${0.9 + 0.1 * p})`, backdropFilter: tone === 'neutro' ? 'blur(14px)' : undefined, border: tone === 'neutro' ? '1.5px solid rgba(255,255,255,0.18)' : undefined, whiteSpace: 'nowrap'}}>
      {children}
    </div>
  );
};

// Ventana de vida de una escena con transición de entrada y salida (zoom-through con desenfoque)
export const SceneShell: React.FC<{desde: number; hasta: number; children: React.ReactNode; entrada?: 'zoom' | 'iris' | 'corte' | 'subida'; salida?: 'zoom' | 'caida' | 'corte'}> = ({desde, hasta, children, entrada = 'zoom', salida = 'zoom'}) => {
  const t = useT();
  const OUT = 0.32;
  if (t < desde - 0.001 || t > hasta + OUT) return null;
  const pin = prog(t, desde, 0.42, expo);
  const pout = prog(t, hasta, OUT, Easing.in(Easing.cubic));
  let transform = '', filter = '', opacity = 1, clip: string | undefined;
  if (entrada === 'zoom') { transform += `scale(${mix(1.18, 1, pin)}) `; filter += `blur(${(1 - pin) * 18}px) `; opacity *= clamp01(pin * 1.6); }
  if (entrada === 'subida') { transform += `translateY(${(1 - pin) * 260}px) `; opacity *= clamp01(pin * 1.6); }
  if (entrada === 'iris') clip = `circle(${mix(0, 130, prog(t, desde, 0.55, expo))}% at 50% 48%)`;
  if (salida === 'zoom' && pout > 0) { transform += `scale(${mix(1, 0.86, pout)}) `; filter += `blur(${pout * 16}px) `; opacity *= 1 - pout; }
  if (salida === 'caida' && pout > 0) { transform += `translateY(${pout * 400}px) rotate(${pout * 4}deg) `; opacity *= 1 - pout; }
  if (salida === 'corte' && t > hasta) return null;
  return <AbsoluteFill style={{transform, filter: filter || undefined, opacity, clipPath: clip, willChange: 'transform'}}>{children}</AbsoluteFill>;
};
