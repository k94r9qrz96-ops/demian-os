// Portadas tipo afiche, texto centrado. Tres estilos: 'tipografica', 'logo', 'muro'.
import React from 'react';
import {AbsoluteFill, Img, continueRender, delayRender, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Brand, Ctx, DISPLAY, Grain, SERIF, TECH} from './core';

type Linea = {t: string; s: 'serif' | 'bold' | 'resalte' | 'tachado' | 'contorno'};
export type PortadaPosterProps = {
  brand: Brand;
  estilo: 'tipografica' | 'logo' | 'muro';
  lineas: Linea[];
  sub?: string;
  boton?: string;
  fotos?: string[];
  etiquetas?: string[];
  rotuloEjemplo?: string;
};

const Line: React.FC<{l: Linea; size: number; c: Brand['colores']}> = ({l, size, c}) => {
  const base: React.CSSProperties = {lineHeight: 0.98, display: 'inline-block', position: 'relative'};
  if (l.s === 'serif') return <div style={{...base, fontFamily: SERIF, fontStyle: 'italic', fontSize: size * 0.78, color: '#fff'}}>{l.t}</div>;
  if (l.s === 'bold') return <div style={{...base, fontFamily: DISPLAY, fontWeight: 900, fontSize: size, letterSpacing: -size * 0.045, color: '#fff'}}>{l.t}</div>;
  if (l.s === 'contorno') return <div style={{...base, fontFamily: DISPLAY, fontWeight: 900, fontSize: size, letterSpacing: -size * 0.04, color: 'transparent', WebkitTextStroke: '3px rgba(255,255,255,0.8)'}}>{l.t}</div>;
  if (l.s === 'tachado') return (
    <div style={{...base, fontFamily: DISPLAY, fontWeight: 900, fontSize: size, letterSpacing: -size * 0.04, color: 'rgba(255,255,255,0.35)'}}>
      {l.t}<div style={{position: 'absolute', left: -12, right: -12, top: '50%', height: size * 0.09, background: '#FF3B4E', borderRadius: 99, transform: 'rotate(-5deg)', boxShadow: '0 0 30px #FF3B4E99'}} />
    </div>
  );
  return <div style={{...base, fontFamily: DISPLAY, fontWeight: 900, fontSize: size * 1.12, letterSpacing: -size * 0.05, color: 'transparent', backgroundImage: `linear-gradient(180deg, #F6FFD9 5%, ${c.acento} 50%, ${c.primario} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', filter: `drop-shadow(0 0 45px ${c.acento}99) drop-shadow(0 12px 0 rgba(0,0,0,0.6))`}}>{l.t}</div>;
};

export const PortadaPoster: React.FC<PortadaPosterProps> = (p) => {
  const {brand} = p;
  const c = brand.colores;
  const [h] = React.useState(() => delayRender('fuentes'));
  React.useEffect(() => {
    const fs = [loadFont({family: 'RushyDisplay', url: staticFile(brand.tipografia.titulos), weight: '100 900'})];
    if (brand.tipografia.acento) fs.push(loadFont({family: 'RushySerif', url: staticFile(brand.tipografia.acento), style: 'italic'}));
    if (brand.tipografia.marca) fs.push(loadFont({family: 'RushyTech', url: staticFile(brand.tipografia.marca), weight: '400 900'}));
    Promise.all(fs).then(() => continueRender(h)).catch(() => continueRender(h));
  }, [brand, h]);
  const col: React.CSSProperties = {display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'};
  const size = p.estilo === 'tipografica' ? 190 : 150;

  const Marca = (
    <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
      {brand.logo && <Img src={staticFile(brand.logo)} style={{width: 74, height: 74, filter: `drop-shadow(0 0 16px ${c.acento}66)`}} />}
      <div style={{fontFamily: TECH, fontWeight: 700, fontSize: 28, letterSpacing: 6, color: 'rgba(255,255,255,0.85)'}}>{brand.handle}</div>
    </div>
  );
  const Pie = (
    <div style={{...col, position: 'absolute', left: 0, right: 0, top: 1650}}>
      {p.boton && <div style={{padding: '20px 46px', borderRadius: 999, background: `linear-gradient(90deg, ${c.acento}, ${c.primario})`, fontFamily: DISPLAY, fontWeight: 900, fontSize: 42, color: '#0B0B10', boxShadow: `0 14px 44px ${c.acento}66`}}>{p.boton}</div>}
      {p.rotuloEjemplo && <div style={{marginTop: 20, fontFamily: TECH, fontSize: 18, letterSpacing: 3, color: 'rgba(255,255,255,0.4)'}}>{p.rotuloEjemplo}</div>}
    </div>
  );

  return (
    <Ctx.Provider value={{brand, tl: {duracion: 1, escenas: [], eventos: {}, subtitulos: []}}}>
      <AbsoluteFill style={{background: c.fondo, overflow: 'hidden'}}>
        {p.estilo === 'tipografica' && (
          <>
            <div style={{position: 'absolute', left: 60, right: 60, top: 930, height: 420, borderRadius: '50%', background: `radial-gradient(ellipse, ${c.acento}55, transparent 65%)`, filter: 'blur(50px)'}} />
            <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '90px 90px', maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)'}} />
            <div style={{...col, position: 'absolute', left: 0, right: 0, top: 290}}>
              {Marca}
              <div style={{...col, marginTop: 170, gap: 14}}>{p.lineas.map((l, i) => <Line key={i} l={l} size={size} c={c} />)}</div>
            </div>
          </>
        )}

        {p.estilo === 'logo' && brand.logoPartes?.r && (
          <>
            <div style={{position: 'absolute', left: 540, top: 930, width: 2400, height: 2400, marginLeft: -1200, marginTop: -1200, background: `repeating-conic-gradient(from 0deg, ${c.acento}22 0deg 6deg, transparent 6deg 18deg)`, maskImage: 'radial-gradient(circle, black 0%, transparent 45%)'}} />
            <div style={{position: 'absolute', left: 540, top: 930, width: 900, height: 900, marginLeft: -450, marginTop: -450, borderRadius: '50%', background: `radial-gradient(circle, ${c.acento}66, transparent 62%)`, filter: 'blur(30px)'}} />
            <div style={{position: 'absolute', left: 540, top: 930, width: 560, height: 560, marginLeft: -280, marginTop: -280, borderRadius: '50%', border: `4px solid ${c.acento}`, boxShadow: `0 0 60px ${c.acento}, inset 0 0 60px ${c.acento}66`}} />
            <Img src={staticFile(brand.logoPartes.r)} style={{position: 'absolute', left: 540, top: 930, width: 360, marginLeft: -180, marginTop: -205, filter: `drop-shadow(0 0 50px ${c.acento}) drop-shadow(0 30px 30px rgba(0,0,0,0.6))`}} />
            <div style={{...col, position: 'absolute', left: 0, right: 0, top: 290}}>
              {Marca}
              <div style={{marginTop: 40}}><Line l={p.lineas[0]} size={size} c={c} /></div>
            </div>
            <div style={{...col, position: 'absolute', left: 0, right: 0, top: 1255, gap: 8}}>
              {p.lineas.slice(1).map((l, i) => <Line key={i} l={l} size={size} c={c} />)}
              {p.sub && <div style={{marginTop: 26, fontFamily: TECH, fontWeight: 700, fontSize: 28, letterSpacing: 4, color: 'rgba(255,255,255,0.75)'}}>{p.sub}</div>}
            </div>
          </>
        )}

        {p.estilo === 'muro' && (
          <>
            <AbsoluteFill style={{perspective: 1300}}>
              <div style={{position: 'absolute', left: -260, top: -120, width: 1600, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22, transform: 'rotateX(28deg) rotateZ(-12deg) translateY(40px)'}}>
                {[...(p.fotos ?? []), ...(p.fotos ?? []), ...(p.fotos ?? [])].slice(0, 20).map((f, i) => (
                  <div key={i} style={{height: 500, borderRadius: 26, overflow: 'hidden', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.6)'}}>
                    <Img src={staticFile(f)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.35) contrast(1.12) brightness(1.05)'}} />
                    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.75))'}} />
                    <div style={{position: 'absolute', left: 22, bottom: 20, fontFamily: SERIF, fontStyle: 'italic', fontSize: 46, color: '#fff'}}>{(p.etiquetas ?? [])[i % (p.etiquetas?.length || 1)]}</div>
                    <svg width="34" height="34" viewBox="0 0 24 24" style={{position: 'absolute', right: 18, top: 18}}><path d="M8 5l12 7-12 7z" fill="#fff" /></svg>
                  </div>
                ))}
              </div>
            </AbsoluteFill>
            <AbsoluteFill style={{background: `radial-gradient(ellipse 75% 42% at 50% 47%, ${c.fondo}F5 0%, ${c.fondo}D9 45%, ${c.fondo}33 100%)`}} />
            <div style={{...col, position: 'absolute', left: 0, right: 0, top: 290}}>
              {Marca}
              <div style={{...col, marginTop: 170, gap: 10}}>{p.lineas.map((l, i) => <Line key={i} l={l} size={size} c={c} />)}</div>
              {p.sub && <div style={{marginTop: 40, fontFamily: TECH, fontWeight: 700, fontSize: 28, letterSpacing: 4, color: 'rgba(255,255,255,0.8)'}}>{p.sub}</div>}
            </div>
          </>
        )}
        {Pie}
        <Grain opacity={0.05} />
      </AbsoluteFill>
    </Ctx.Provider>
  );
};
