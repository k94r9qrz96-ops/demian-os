// Interfaces genéricas de red social (sin logos de terceros) para mostrar el resultado del servicio.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {C, DISPLAY, SERIF} from './core';

export const Phone: React.FC<{w?: number; children: React.ReactNode; style?: React.CSSProperties; glare?: number}> = ({w = 560, children, style, glare = 0.5}) => {
  const h = w * 2.08;
  return (
    <div style={{width: w, height: h, borderRadius: w * 0.14, background: 'linear-gradient(145deg,#2a2a33,#0c0c10 40%,#1c1c22)', padding: w * 0.028, boxShadow: '0 60px 120px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.08) inset', position: 'relative', ...style}}>
      <div style={{width: '100%', height: '100%', borderRadius: w * 0.118, overflow: 'hidden', position: 'relative', background: '#000'}}>
        {children}
        <div style={{position: 'absolute', top: w * 0.03, left: '50%', width: w * 0.3, height: w * 0.075, marginLeft: -w * 0.15, borderRadius: 99, background: '#000'}} />
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(125deg, rgba(255,255,255,${0.16 * glare}) 0%, transparent 32%, transparent 70%, rgba(255,255,255,${0.06 * glare}) 100%)`, pointerEvents: 'none'}} />
      </div>
    </div>
  );
};

const I = {
  heart: 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2 0 3.6 1.1 4.3 2.6.7-1.5 2.3-2.6 4.3-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z',
  comment: 'M21 11.5a8.5 8.5 0 1 1-3.6-6.9A8.4 8.4 0 0 1 21 11.5zM21 21l-3.2-2.6',
  send: 'M22 3L9.5 13.5M22 3l-7 18-3.5-7.5L4 10z',
  save: 'M6 3h12v18l-6-4.5L6 21z',
};
export const Icon: React.FC<{d: keyof typeof I; s?: number; fill?: string}> = ({d, s = 46, fill}) => (
  <svg width={s} height={s} viewBox="0 0 24 24"><path d={I[d]} fill={fill ?? 'none'} stroke="#fff" strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round" /></svg>
);

export const Avatar: React.FC<{s?: number; label: string; ring?: boolean}> = ({s = 56, label, ring}) => {
  const c = C();
  return (
    <div style={{width: s, height: s, borderRadius: '50%', padding: ring ? 3 : 0, background: ring ? `linear-gradient(45deg, ${c.acento}, ${c.primario})` : 'transparent', flexShrink: 0}}>
      <div style={{width: '100%', height: '100%', borderRadius: '50%', background: `linear-gradient(135deg, ${c.primario}, #2b1f66)`, border: ring ? '3px solid #000' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: DISPLAY, fontWeight: 800, fontSize: s * 0.42}}>{label.slice(0, 1).toUpperCase()}</div>
    </div>
  );
};

// Post de feed "sin diseño" o con diseño
export const FeedPost: React.FC<{img: string; handle: string; w: number; dull?: boolean}> = ({img, handle, w, dull}) => (
  <div style={{width: w, background: '#000', paddingBottom: 18}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px'}}>
      <Avatar s={44} label={handle} />
      <div style={{color: '#fff', fontFamily: DISPLAY, fontWeight: 700, fontSize: 24}}>{handle}</div>
    </div>
    <Img src={staticFile(img)} style={{width: w, height: w * 1.1, objectFit: 'cover', filter: dull ? 'grayscale(0.85) contrast(0.8) brightness(0.8)' : undefined}} />
    <div style={{display: 'flex', gap: 22, padding: '16px 18px'}}><Icon d="heart" s={40} /><Icon d="comment" s={40} /><Icon d="send" s={40} /></div>
    <div style={{margin: '0 18px', height: 14, width: '70%', borderRadius: 7, background: 'rgba(255,255,255,0.18)'}} />
    <div style={{margin: '10px 18px 0', height: 14, width: '45%', borderRadius: 7, background: 'rgba(255,255,255,0.12)'}} />
  </div>
);

// Capa de interfaz de un reel (íconos laterales, usuario, texto)
export const ReelUI: React.FC<{handle: string; caption: string; progress: number; w: number}> = ({handle, caption, progress, w}) => {
  const k = w / 560;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 18%, transparent 62%, rgba(0,0,0,0.65) 100%)'}} />
      <div style={{position: 'absolute', top: 70 * k, left: 28 * k, color: '#fff', fontFamily: DISPLAY, fontWeight: 800, fontSize: 30 * k}}>Reels</div>
      <div style={{position: 'absolute', right: 20 * k, bottom: 170 * k, display: 'flex', flexDirection: 'column', gap: 34 * k, alignItems: 'center'}}>
        <Icon d="heart" s={44 * k} /><Icon d="comment" s={44 * k} /><Icon d="send" s={44 * k} /><Icon d="save" s={40 * k} />
      </div>
      <div style={{position: 'absolute', left: 26 * k, right: 110 * k, bottom: 54 * k}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12 * k}}>
          <Avatar s={46 * k} label={handle} />
          <div style={{color: '#fff', fontFamily: DISPLAY, fontWeight: 700, fontSize: 22 * k}}>{handle}</div>
          <div style={{color: '#fff', fontFamily: DISPLAY, fontWeight: 700, fontSize: 18 * k, border: '1.5px solid rgba(255,255,255,0.7)', borderRadius: 8 * k, padding: `${4 * k}px ${12 * k}px`}}>Seguir</div>
        </div>
        <div style={{color: 'rgba(255,255,255,0.9)', fontFamily: DISPLAY, fontWeight: 500, fontSize: 20 * k, marginTop: 12 * k}}>{caption}</div>
      </div>
      <div style={{position: 'absolute', left: 0, bottom: 0, height: 5 * k, width: `${progress * 100}%`, background: '#fff'}} />
    </>
  );
};

export const StoryCard: React.FC<{img: string; texto: string; handle: string; w: number; progress: number}> = ({img, texto, handle, w, progress}) => {
  const c = C();
  const k = w / 400;
  return (
    <div style={{width: w, height: w * 1.78, borderRadius: 34 * k, overflow: 'hidden', position: 'relative', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.12)'}}>
      <Img src={staticFile(img)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.2) contrast(1.08)'}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.45), transparent 25%, transparent 60%, rgba(0,0,0,0.55))'}} />
      <div style={{position: 'absolute', top: 16 * k, left: 14 * k, right: 14 * k, display: 'flex', gap: 6 * k}}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{flex: 1, height: 5 * k, borderRadius: 3, background: 'rgba(255,255,255,0.35)', overflow: 'hidden'}}>
            <div style={{height: '100%', width: `${i === 0 ? 100 : i === 1 ? progress * 100 : 0}%`, background: '#fff'}} />
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', top: 36 * k, left: 16 * k, display: 'flex', alignItems: 'center', gap: 10 * k}}>
        <Avatar s={40 * k} label={handle} />
        <div style={{color: '#fff', fontFamily: DISPLAY, fontWeight: 700, fontSize: 19 * k}}>{handle}</div>
      </div>
      <div style={{position: 'absolute', left: 26 * k, right: 26 * k, bottom: 90 * k, display: 'flex', justifyContent: 'center'}}>
        <div style={{background: '#fff', color: '#111', fontFamily: SERIF, fontStyle: 'italic', fontSize: 40 * k, padding: `${10 * k}px ${20 * k}px`, borderRadius: 14 * k, transform: 'rotate(-3deg)', textAlign: 'center', boxShadow: `6px 6px 0 ${c.acento}`}}>{texto}</div>
      </div>
    </div>
  );
};
