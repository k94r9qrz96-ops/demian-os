// Portada de reel (Still 1080×1920). Lo esencial vive en la franja central 1080×1350,
// que es lo que se ve en la grilla del perfil; arriba y abajo solo hay apoyo visual.
import React from 'react';
import {AbsoluteFill, Img, continueRender, delayRender, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Brand, Ctx, DISPLAY, Grain, SERIF, TECH, Vignette} from './core';
import {Phone, ReelUI} from './mockups';

export type PortadaProps = {
  brand: Brand;
  linea1: string; // pregunta en serif
  resalte: string; // palabra gigante en color de marca
  linea2: string; // serif
  tachado: string; // palabra que se tacha
  antes: string; // foto cruda
  despues: string; // misma foto editada dentro del reel
  tituloPieza: string;
  negocioEjemplo: string;
  cta: string;
  rotuloEjemplo?: string;
};

export const Portada: React.FC<PortadaProps> = (p) => {
  const {brand} = p;
  const c = brand.colores;
  const [h] = React.useState(() => delayRender('fuentes portada'));
  React.useEffect(() => {
    const fs = [loadFont({family: 'RushyDisplay', url: staticFile(brand.tipografia.titulos), weight: '100 900'})];
    if (brand.tipografia.acento) fs.push(loadFont({family: 'RushySerif', url: staticFile(brand.tipografia.acento), style: 'italic'}));
    if (brand.tipografia.marca) fs.push(loadFont({family: 'RushyTech', url: staticFile(brand.tipografia.marca), weight: '400 900'}));
    Promise.all(fs).then(() => continueRender(h)).catch(() => continueRender(h));
  }, [brand, h]);

  return (
    <Ctx.Provider value={{brand, tl: {duracion: 1, escenas: [], eventos: {}, subtitulos: []}}}>
      <AbsoluteFill style={{background: c.fondo, overflow: 'hidden'}}>
        {/* luz de marca + piso en perspectiva para dar profundidad */}
        <div style={{position: 'absolute', width: 1500, height: 1500, left: -210, top: 120, borderRadius: '50%', background: `radial-gradient(circle, ${c.primario}66 0%, transparent 55%)`, filter: 'blur(30px)'}} />
        <div style={{position: 'absolute', width: 900, height: 900, right: -320, bottom: -160, borderRadius: '50%', background: `radial-gradient(circle, ${c.acento}77 0%, transparent 60%)`, filter: 'blur(40px)'}} />
        <AbsoluteFill style={{perspective: 900}}>
          <div style={{position: 'absolute', left: -600, right: -600, top: 1180, height: 1400, transform: 'rotateX(72deg)', transformOrigin: 'top', backgroundImage: `linear-gradient(${c.acento}55 2px, transparent 2px), linear-gradient(90deg, ${c.acento}55 2px, transparent 2px)`, backgroundSize: '120px 120px', maskImage: 'linear-gradient(180deg, black, transparent 70%)'}} />
        </AbsoluteFill>

        {/* marca arriba */}
        <div style={{position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18}}>
          {brand.logo && <Img src={staticFile(brand.logo)} style={{width: 84, height: 84, filter: `drop-shadow(0 0 18px ${c.acento}66)`}} />}
          <div style={{fontFamily: TECH, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: 'rgba(255,255,255,0.85)'}}>{brand.handle}</div>
        </div>

        {/* titular */}
        <div style={{position: 'absolute', top: 420, left: 0, right: 0, textAlign: 'center'}}>
          <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 118, color: '#fff', lineHeight: 1}}>{p.linea1}</div>
          <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 290, letterSpacing: -16, lineHeight: 0.92, marginTop: 6, color: 'transparent', backgroundImage: `linear-gradient(180deg, #F6FFD9 0%, ${c.acento} 45%, ${c.primario} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', filter: `drop-shadow(0 0 60px ${c.acento}88) drop-shadow(0 18px 0 rgba(0,0,0,0.6))`}}>{p.resalte}</div>
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 26, marginTop: 4}}>
            <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 104, color: 'rgba(255,255,255,0.9)'}}>{p.linea2}</div>
            <div style={{position: 'relative', fontFamily: DISPLAY, fontWeight: 900, fontSize: 132, letterSpacing: -5, color: 'rgba(255,255,255,0.55)'}}>
              {p.tachado}
              <div style={{position: 'absolute', left: -14, right: -14, top: '52%', height: 16, background: '#FF3B4E', borderRadius: 8, transform: 'rotate(-6deg)', boxShadow: '0 0 30px #FF3B4E88'}} />
            </div>
          </div>
        </div>

        {/* antes → después */}
        <div style={{position: 'absolute', left: 70, top: 1130, width: 360, height: 450, transform: 'rotate(-9deg)', borderRadius: 26, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.6)', border: '4px solid rgba(255,255,255,0.18)'}}>
          <Img src={staticFile(p.antes)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.35) brightness(0.72) contrast(0.8) sepia(0.2)'}} />
          <div style={{position: 'absolute', left: 18, top: 18, padding: '8px 18px', borderRadius: 999, background: 'rgba(0,0,0,0.65)', fontFamily: TECH, fontWeight: 800, fontSize: 24, letterSpacing: 3, color: '#fff'}}>ANTES</div>
        </div>
        <svg width="300" height="200" viewBox="0 0 300 200" style={{position: 'absolute', left: 300, top: 1015, filter: `drop-shadow(0 0 14px ${c.acento})`}}>
          <path d="M20 170 C 90 40, 190 30, 262 70" fill="none" stroke={c.acento} strokeWidth="12" strokeLinecap="round" />
          <path d="M236 38 L 270 74 L 222 92" fill="none" stroke={c.acento} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{position: 'absolute', left: 525, top: 990, transform: 'rotate(7deg)'}}>
          <Phone w={430} glare={0.8} style={{boxShadow: `0 40px 100px rgba(0,0,0,0.7), 0 0 80px ${c.primario}55`}}>
            <Img src={staticFile(p.despues)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.3) contrast(1.12) brightness(1.05)'}} />
            <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 40%, ${c.fondo}DD)`}} />
            <div style={{position: 'absolute', left: 30, right: 80, bottom: 290}}>
              <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 64, color: '#fff', lineHeight: 0.95}}>{p.tituloPieza}</div>
            </div>
            <ReelUI w={406} handle={p.negocioEjemplo} caption="" progress={0.42} />
          </Phone>
          <div style={{position: 'absolute', top: -30, right: 30, padding: '10px 22px', borderRadius: 999, background: c.acento, fontFamily: TECH, fontWeight: 800, fontSize: 26, letterSpacing: 3, color: '#0B0B10', boxShadow: `0 10px 30px ${c.acento}88`}}>DESPUÉS</div>
          <div style={{position: 'absolute', left: '50%', top: '24%', width: 140, height: 140, marginLeft: -70, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', border: '3px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <svg width="60" height="60" viewBox="0 0 24 24"><path d="M8 5l12 7-12 7z" fill="#fff" /></svg>
          </div>
        </div>

        {/* llamada */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 1650, display: 'flex', justifyContent: 'center'}}>
          <div style={{padding: '22px 44px', borderRadius: 999, background: `linear-gradient(90deg, ${c.acento}, ${c.primario})`, fontFamily: DISPLAY, fontWeight: 900, fontSize: 46, color: '#0B0B10', boxShadow: `0 16px 50px ${c.acento}66`}}>{p.cta}</div>
        </div>
        {p.rotuloEjemplo && <div style={{position: 'absolute', left: 80, top: 1600, fontFamily: TECH, fontSize: 18, letterSpacing: 2, color: 'rgba(255,255,255,0.4)'}}>{p.rotuloEjemplo}</div>}
        <Vignette />
        <Grain opacity={0.06} />
      </AbsoluteFill>
    </Ctx.Provider>
  );
};
