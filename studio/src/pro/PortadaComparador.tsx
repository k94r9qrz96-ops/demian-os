// Portada "comparador": la misma foto partida por un deslizador antes/después, texto centrado.
// Lo esencial queda en la franja central 1080×1350 (grilla del perfil).
import React from 'react';
import {AbsoluteFill, Img, continueRender, delayRender, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Brand, Ctx, DISPLAY, Grain, SERIF, TECH} from './core';

export type PortadaComparadorProps = {
  brand: Brand;
  foto: string;
  kicker: string; // serif, arriba
  titulo: string; // gigante, color de marca
  pregunta1: string; // serif, abajo
  pregunta2: string; // bold, abajo
  boton: string;
  rotuloEjemplo?: string;
};

export const PortadaComparador: React.FC<PortadaComparadorProps> = (p) => {
  const {brand} = p;
  const c = brand.colores;
  const [h] = React.useState(() => delayRender('fuentes'));
  React.useEffect(() => {
    const fs = [loadFont({family: 'RushyDisplay', url: staticFile(brand.tipografia.titulos), weight: '100 900'})];
    if (brand.tipografia.acento) fs.push(loadFont({family: 'RushySerif', url: staticFile(brand.tipografia.acento), style: 'italic'}));
    if (brand.tipografia.marca) fs.push(loadFont({family: 'RushyTech', url: staticFile(brand.tipografia.marca), weight: '400 900'}));
    Promise.all(fs).then(() => continueRender(h)).catch(() => continueRender(h));
  }, [brand, h]);

  const img: React.CSSProperties = {position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.08)'};
  const center: React.CSSProperties = {position: 'absolute', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'};
  return (
    <Ctx.Provider value={{brand, tl: {duracion: 1, escenas: [], eventos: {}, subtitulos: []}}}>
      <AbsoluteFill style={{background: c.fondo, overflow: 'hidden'}}>
        {/* ANTES: mitad izquierda apagada */}
        <AbsoluteFill style={{clipPath: 'inset(0 50% 0 0)'}}>
          <Img src={staticFile(p.foto)} style={{...img, filter: 'grayscale(0.85) brightness(0.62) contrast(0.78) blur(1.5px)'}} />
        </AbsoluteFill>
        {/* DESPUÉS: mitad derecha con color de cine y luz de marca */}
        <AbsoluteFill style={{clipPath: 'inset(0 0 0 50%)'}}>
          <Img src={staticFile(p.foto)} style={{...img, filter: 'saturate(1.45) contrast(1.18) brightness(1.08)'}} />
          <AbsoluteFill style={{background: `radial-gradient(circle at 75% 55%, ${c.acento}40, transparent 45%)`, mixBlendMode: 'screen'}} />
          <AbsoluteFill style={{background: 'linear-gradient(115deg, transparent 55%, rgba(255,190,120,0.22) 75%, transparent 90%)', mixBlendMode: 'screen'}} />
        </AbsoluteFill>
        {/* oscurecido arriba y abajo para el texto */}
        <AbsoluteFill style={{background: `linear-gradient(180deg, ${c.fondo} 0%, ${c.fondo}F2 22%, ${c.fondo}99 36%, transparent 48%, transparent 62%, ${c.fondo}BB 74%, ${c.fondo} 92%)`}} />

        {/* deslizador */}
        <div style={{position: 'absolute', left: 537, top: 0, bottom: 0, width: 6, background: `linear-gradient(180deg, transparent 37%, ${c.acento} 44%, ${c.acento} 62%, transparent 68%)`, filter: `drop-shadow(0 0 14px ${c.acento})`}} />
        <div style={{position: 'absolute', left: 540, top: 1010, width: 150, height: 150, marginLeft: -75, marginTop: -75, borderRadius: '50%', background: c.fondo, border: `6px solid ${c.acento}`, boxShadow: `0 0 50px ${c.acento}AA`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6}}>
          <svg width="40" height="40" viewBox="0 0 24 24"><path d="M15 5l-8 7 8 7z" fill={c.acento} /></svg>
          <svg width="40" height="40" viewBox="0 0 24 24"><path d="M9 5l8 7-8 7z" fill={c.acento} /></svg>
        </div>
        <div style={{position: 'absolute', left: 270, top: 1170, transform: 'translateX(-50%)', padding: '12px 26px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.35)', fontFamily: TECH, fontWeight: 800, fontSize: 28, letterSpacing: 4, color: 'rgba(255,255,255,0.85)'}}>ANTES</div>
        <div style={{position: 'absolute', left: 810, top: 1170, transform: 'translateX(-50%)', padding: '12px 26px', borderRadius: 999, background: c.acento, fontFamily: TECH, fontWeight: 800, fontSize: 28, letterSpacing: 4, color: '#0B0B10', boxShadow: `0 10px 30px ${c.acento}88`}}>DESPUÉS</div>

        {/* texto superior centrado */}
        <div style={{...center, top: 285}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
            {brand.logo && <Img src={staticFile(brand.logo)} style={{width: 76, height: 76, filter: `drop-shadow(0 0 16px ${c.acento}66)`}} />}
            <div style={{fontFamily: TECH, fontWeight: 700, fontSize: 28, letterSpacing: 6, color: 'rgba(255,255,255,0.85)'}}>{brand.handle}</div>
          </div>
          <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 140, lineHeight: 1, color: '#fff', marginTop: 34}}>{p.kicker}</div>
          <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 166, letterSpacing: -8, lineHeight: 0.95, marginTop: 6, color: 'transparent', backgroundImage: `linear-gradient(180deg, #F6FFD9 5%, ${c.acento} 50%, ${c.primario} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', filter: `drop-shadow(0 0 50px ${c.acento}77) drop-shadow(0 14px 0 rgba(0,0,0,0.55))`}}>{p.titulo}</div>
        </div>

        {/* pregunta inferior centrada */}
        <div style={{...center, top: 1330}}>
          <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 100, lineHeight: 1, color: '#fff'}}>{p.pregunta1}</div>
          <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 112, letterSpacing: -4, lineHeight: 1.05, color: '#fff'}}>{p.pregunta2}</div>
        </div>
        <div style={{...center, top: 1660}}>
          <div style={{padding: '20px 44px', borderRadius: 999, background: `linear-gradient(90deg, ${c.acento}, ${c.primario})`, fontFamily: DISPLAY, fontWeight: 900, fontSize: 42, color: '#0B0B10', boxShadow: `0 14px 44px ${c.acento}66`}}>{p.boton}</div>
          {p.rotuloEjemplo && <div style={{marginTop: 22, fontFamily: TECH, fontSize: 18, letterSpacing: 3, color: 'rgba(255,255,255,0.4)'}}>{p.rotuloEjemplo}</div>}
        </div>
        <Grain opacity={0.05} />
      </AbsoluteFill>
    </Ctx.Provider>
  );
};
