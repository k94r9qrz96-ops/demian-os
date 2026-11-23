import React from 'react';
import {AbsoluteFill, Easing, Img, staticFile} from 'remotion';
import {Atmosphere, C, Chip, DISPLAY, MaskWords, SERIF, TECH, clamp01, expo, inOut, mix, prog, shake, spr, useCtx, useT} from './core';
import {Avatar, FeedPost, Icon, Phone, ReelUI, StoryCard} from './mockups';

type S = Record<string, any> & {desde: number; hasta: number};
type P = {s: S; i: number};
const useEv = (i: number) => {
  const {tl} = useCtx();
  return (k: string) => tl.eventos[`s${i}.${k}`] ?? 0;
};

// ─────────── 1. PREGUNTA (gancho) ───────────
export const Pregunta: React.FC<P> = ({s, i}) => {
  const t = useT();
  const c = C();
  const ev = useEv(i);
  const g0 = ev('golpe0'), g1 = ev('golpe1');
  const scroll = (t * 520 + Math.max(0, t - g1) * 1400) % (s.feed.length * 690);
  const phoneIn = prog(t, 0, 0.9, expo);
  const leave0 = prog(t, g1 - 0.28, 0.24, Easing.in(Easing.cubic));
  const strike = prog(t, g1 + 0.55, 0.28, inOut);
  const glitch = t > g1 + 0.5 && t < g1 + 0.85 ? Math.sin(t * 180) * 12 : 0;
  return (
    <AbsoluteFill style={{transform: shake(t, [g0, g1], 18)}}>
      <Atmosphere />
      {/* teléfono 3D con feed infinito, desenfocado como fondo */}
      <AbsoluteFill style={{perspective: 1800, alignItems: 'center'}}>
        <div style={{position: 'absolute', top: mix(1500, 820, phoneIn), transform: `rotateX(${mix(40, 24, phoneIn)}deg) rotateY(-16deg) rotateZ(6deg) scale(1.25)`, filter: `blur(${mix(10, 3, phoneIn)}px) brightness(0.75)`}}>
          <Phone w={560}>
            <div style={{transform: `translateY(${-scroll}px)`}}>
              {[...s.feed, ...s.feed, ...s.feed].map((img: string, k: number) => (
                <FeedPost key={k} img={img} w={505} handle={['cafe.ejemplo', 'resto.ejemplo', 'hotel.ejemplo'][k % 3]} />
              ))}
            </div>
          </Phone>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${c.fondo} 8%, ${c.fondo}CC 38%, transparent 62%)`}} />
      {/* golpe 0: ¿Tu negocio consigue CLIENTES */}
      <AbsoluteFill style={{paddingTop: 270, alignItems: 'center', opacity: 1 - leave0, transform: `translateY(${-leave0 * 200}px) scale(${1 - leave0 * 0.1})`, filter: `blur(${leave0 * 14}px)`}}>
        <MaskWords text={s.golpes[0].kicker} t={t} at={g0} size={104} font={SERIF} weight={400} />
        <MaskWords text={s.golpes[0].titulo} t={t} at={g0 + 0.35} size={96} weight={600} color="rgba(255,255,255,0.85)" />
        <div style={{transform: `scale(${mix(1.35, 1, spr(t, g0 + 0.7, {damping: 12}))})`, marginTop: -6}}>
          <MaskWords text={s.golpes[0].resalte} t={t} at={g0 + 0.7} size={176} weight={900} letter={-0.05} gradient={`linear-gradient(100deg, ${c.acento}, #FFFFFF 50%, ${c.primario})`} />
        </div>
      </AbsoluteFill>
      {/* golpe 1: …o solamente PUBLICA? */}
      {t > g1 - 0.05 && (
        <AbsoluteFill style={{paddingTop: 320, alignItems: 'center'}}>
          <MaskWords text={s.golpes[1].kicker} t={t} at={g1} size={104} font={SERIF} weight={400} />
          <div style={{position: 'relative', marginTop: 4, transform: `translateX(${glitch}px)`}}>
            <div style={{transform: `scale(${mix(1.5, 1, spr(t, g1 + 0.3, {damping: 11}))})`}}>
              <MaskWords text={s.golpes[1].resalte} t={t} at={g1 + 0.3} size={200} weight={900} letter={-0.05} />
            </div>
            {glitch !== 0 && <div style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', transform: `translateX(${-glitch * 1.6}px)`, opacity: 0.8}}><MaskWords text={s.golpes[1].resalte} t={t} at={-10} size={200} weight={900} letter={-0.05} color={c.primario} /></div>}
            {s.golpes[1].tachar && <div style={{position: 'absolute', left: -20, right: -20, top: '50%', height: 18, background: '#FF4D5E', borderRadius: 9, transformOrigin: 'left', transform: `scaleX(${strike}) rotate(-4deg)`, boxShadow: '0 0 30px #FF4D5E99'}} />}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ─────────── 2. PROBLEMA ───────────
export const Problema: React.FC<P> = ({s, i}) => {
  const t = useT();
  const ev = useEv(i);
  const tt = ev('titulo');
  const fall = prog(t, tt + 0.1, 0.9, Easing.in(Easing.quad));
  return (
    <AbsoluteFill style={{transform: shake(t, [tt], 22)}}>
      <Atmosphere tone="gris" />
      <AbsoluteFill style={{perspective: 1400, alignItems: 'center', justifyContent: 'center'}}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 300px)', gap: 18, transform: `rotateX(52deg) rotateZ(-14deg) translateY(${400 - (t - s.desde) * 160}px) scale(1.3)`}}>
          {[...s.imagenes, ...s.imagenes, ...s.imagenes].map((img: string, k: number) => {
            const d = fall * (0.6 + ((k * 37) % 10) / 10);
            return (
              <div key={k} style={{width: 300, height: 380, borderRadius: 18, overflow: 'hidden', background: '#1a1b20', transform: `translateZ(${-d * 900}px) rotateX(${d * 40}deg)`, opacity: 1 - d * 0.9}}>
                <Img src={staticFile(img)} style={{width: '100%', height: 300, objectFit: 'cover', filter: 'grayscale(1) contrast(0.7) brightness(0.6)'}} />
                <div style={{margin: '18px 16px 0', height: 14, width: '70%', borderRadius: 7, background: 'rgba(255,255,255,0.12)'}} />
                <div style={{margin: '10px 16px 0', height: 14, width: '40%', borderRadius: 7, background: 'rgba(255,255,255,0.08)'}} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, rgba(13,14,18,0.2) 0%, rgba(13,14,18,0.92) 70%)'}} />
      <AbsoluteFill style={{paddingTop: 520, alignItems: 'center'}}>
        <MaskWords text={s.kicker} t={t} at={s.desde + 0.12} size={98} font={SERIF} weight={400} color="rgba(255,255,255,0.8)" />
        <div style={{transform: `scale(${mix(1.35, 1, spr(t, tt, {damping: 10}))})`, marginTop: 10}}>
          <MaskWords text={s.titulo} t={t} at={tt} size={150} weight={900} letter={-0.05} stagger={0.07} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────── 3. TRANSFORMACIÓN (marca + foto → reel → historias) ───────────
export const Transformacion: React.FC<P> = ({s, i}) => {
  const t = useT();
  const c = C();
  const {brand} = useCtx();
  const ev = useEv(i);
  const tm = ev('marca'), tf = ev('transforma'), tr = ev('reel'), th = ev('historias');
  // marca
  const logoIn = spr(t, tm, {damping: 13});
  const logoToCorner = prog(t, tf - 0.35, 0.6, inOut);
  const sweep = prog(t, tm + 0.15, 0.8, inOut);
  // foto → reel
  const cardIn = spr(t, tf - 0.15, {damping: 16});
  const scan = prog(t, tf + 0.45, 1.1, inOut);
  const toPhone = prog(t, tr - 0.45, 0.6, inOut);
  const toLeft = prog(t, th - 0.1, 0.7, inOut);
  const w = 560;
  const cardW = mix(760, w * 0.944, toPhone), cardH = mix(980, w * 2.08 * 0.944, toPhone);
  const steps = [{l: 'Tus fotos', at: tf}, {l: 'Reels', at: tr}, {l: 'Historias', at: th}];
  return (
    <AbsoluteFill style={{transform: shake(t, [tm], 20)}}>
      <Atmosphere energy={1.2} />
      {/* rayos/anillos de revelado */}
      {[0, 1, 2].map((k) => {
        const p = prog(t, tm + k * 0.12, 1.1, expo);
        const d = p * 2200;
        return <div key={k} style={{position: 'absolute', left: 540 - d / 2, top: 880 - d / 2, width: d, height: d, borderRadius: '50%', border: `${mix(10, 2, p)}px solid ${k % 2 ? c.acento : c.primario}`, opacity: (1 - p) * 0.7, boxShadow: `0 0 40px ${k % 2 ? c.acento : c.primario}66`}} />;
      })}
      {/* marca: R oficial con impacto + texto con barrido → insignia en la esquina */}
      {brand.logoPartes?.r ? (
        <div style={{position: 'absolute', left: 540, top: 860, transform: `translate(-50%,-50%) scale(${mix(1, 0.3, logoToCorner)}) translate(${logoToCorner * -1050}px, ${logoToCorner * -1900}px)`, opacity: 1 - prog(t, tf - 0.15, 0.35)}}>
          <div style={{position: 'relative', width: 340, height: 385, margin: '0 auto', transform: `scale(${mix(2.8, 1, logoIn)}) rotate(${(1 - logoIn) * -28}deg)`, filter: `blur(${(1 - clamp01(logoIn * 1.3)) * 14}px) drop-shadow(0 0 ${40 + 40 * (1 - sweep)}px ${c.acento}88)`, opacity: clamp01(logoIn * 2)}}>
            <Img src={staticFile(brand.logoPartes.r)} style={{width: '100%', height: '100%'}} />
            <div style={{position: 'absolute', inset: 0, background: `linear-gradient(110deg, transparent ${sweep * 160 - 50}%, rgba(255,255,255,0.95) ${sweep * 160 - 30}%, transparent ${sweep * 160 - 10}%)`, WebkitMaskImage: `url(${staticFile(brand.logoPartes.r)})`, WebkitMaskSize: '100% 100%', maskImage: `url(${staticFile(brand.logoPartes.r)})`, maskSize: '100% 100%'}} />
          </div>
          {brand.logoPartes.texto && <Img src={staticFile(brand.logoPartes.texto)} style={{display: 'block', width: 760, margin: '36px auto 0', clipPath: `inset(0 ${(1 - prog(t, tm + 0.22, 0.5, inOut)) * 100}% 0 0)`}} />}
          <div style={{textAlign: 'center', fontFamily: TECH, fontWeight: 600, fontSize: 34, letterSpacing: 8, color: 'rgba(255,255,255,0.7)', marginTop: 26, opacity: prog(t, tm + 0.6, 0.4)}}>{brand.handle ?? ''}</div>
        </div>
      ) : (
        <div style={{position: 'absolute', left: 540, top: 880, transform: `translate(-50%,-50%) scale(${mix(0.6, 1, logoIn)})`, opacity: logoIn * (1 - logoToCorner), fontFamily: DISPLAY, fontWeight: 900, fontSize: 200, color: c.texto}}>{brand.nombre}</div>
      )}
      {brand.logo && <Img src={staticFile(brand.logo)} style={{position: 'absolute', left: 70, top: 215, width: 120, height: 120, opacity: prog(t, tf - 0.05, 0.35), transform: `scale(${0.6 + 0.4 * spr(t, tf - 0.05)})`, filter: `drop-shadow(0 0 20px ${c.acento}55)`}} />}
      {/* pasos */}
      {t > tf - 0.2 && (
        <div style={{position: 'absolute', top: 250, left: 220, right: 40, display: 'flex', justifyContent: 'center', gap: 14, alignItems: 'center'}}>
          {steps.map((st, k) => {
            const on = t >= st.at;
            const p = spr(t, steps[0].at - 0.2 + k * 0.08);
            return (
              <React.Fragment key={k}>
                {k > 0 && <div style={{width: 40, height: 3, background: on ? c.acento : 'rgba(255,255,255,0.25)', opacity: p}} />}
                <div style={{opacity: p, padding: '14px 26px', borderRadius: 999, fontFamily: TECH, fontWeight: 700, fontSize: 26, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: on ? '#0B0B10' : 'rgba(255,255,255,0.6)', background: on ? c.acento : 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', transform: `scale(${on ? 1 + 0.08 * Math.max(0, 1 - (t - st.at) * 4) : 0.95})`}}>{st.l}</div>
              </React.Fragment>
            );
          })}
        </div>
      )}
      {/* la pieza: foto cruda → reel en teléfono */}
      {t > tf - 0.3 && (
        <AbsoluteFill style={{perspective: 2000}}>
          <div style={{position: 'absolute', left: 540, top: 1020, transform: `translate(-50%,-50%) translateX(${mix(0, -190, toLeft)}px) translateY(${(1 - cardIn) * 500}px) rotateY(${mix(mix(-14, 0, cardIn) + Math.sin(t * 0.8) * 3, 16, toLeft)}deg) rotateX(${mix(8, 4, toPhone)}deg) scale(${mix(0.9, 0.82, toLeft)})`, opacity: cardIn}}>
            <div style={{position: 'relative', width: cardW + (w - w * 0.944) * toPhone, height: cardH + (w * 2.08 - w * 2.08 * 0.944) * toPhone}}>
              <div style={{position: 'absolute', inset: 0, opacity: toPhone}}><Phone w={w}><div /></Phone></div>
              <div style={{position: 'absolute', left: '50%', top: '50%', width: cardW, height: cardH, transform: 'translate(-50%,-50%)', borderRadius: mix(24, 64, toPhone), overflow: 'hidden', boxShadow: '0 50px 100px rgba(0,0,0,0.5)'}}>
                {/* versión cruda */}
                <Img src={staticFile(s.foto)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.45) brightness(0.78) contrast(0.82) sepia(0.15)', transform: 'scale(1.05) rotate(1.5deg)'}} />
                {/* versión editada, revelada por el escáner */}
                <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 ${(1 - scan) * 100}% 0)`}}>
                  <Img src={staticFile(s.foto)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.3) contrast(1.12) brightness(1.04)', transform: `scale(${1.08 + Math.max(0, t - tr) * 0.03})`}} />
                  <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 40%, ${c.fondo}DD 100%)`}} />
                  <div style={{position: 'absolute', left: 40, right: 40, bottom: mix(90, 210, toPhone), opacity: prog(t, tf + 0.9, 0.4)}}>
                    <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: mix(96, 74, toPhone), color: '#fff', lineHeight: 0.95}}>{s.tituloPieza}</div>
                    <div style={{fontFamily: DISPLAY, fontWeight: 600, fontSize: mix(32, 24, toPhone), color: c.acento, marginTop: 14, letterSpacing: 2}}>{s.subPieza}</div>
                  </div>
                  {toPhone > 0.5 && <div style={{position: 'absolute', inset: 0, opacity: prog(t, tr, 0.3)}}><ReelUI w={cardW} handle={s.negocioEjemplo} caption="Pasá a probarlo ☕" progress={clamp01((t - tr) / 2.6)} /></div>}
                </div>
                {/* línea del escáner */}
                {scan > 0 && scan < 1 && <div style={{position: 'absolute', left: 0, right: 0, top: `${scan * 100}%`, height: 6, background: c.acento, boxShadow: `0 0 40px 12px ${c.acento}99`}} />}
              </div>
              <div style={{position: 'absolute', top: -70, left: 0, opacity: 1 - toPhone}}><Chip t={t} at={tf} tone="aviso" size={26}>EJEMPLO · {s.etiquetaAntes}</Chip></div>
            </div>
          </div>
          {/* historias */}
          {s.historias.map((h: any, k: number) => {
            const p = spr(t, th + 0.05 + k * 0.16, {damping: 15});
            return (
              <div key={k} style={{position: 'absolute', left: 640 + k * 140, top: 1000 + k * 40, transform: `translate(-50%,-50%) translateX(${(1 - p) * 700}px) rotateY(${-22 + k * 4}deg) rotateZ(${4 + k * 3}deg)`, opacity: p}}>
                <StoryCard img={h.img} texto={h.texto} handle={h.rubro} w={340} progress={clamp01((t - th) / 1.5)} />
              </div>
            );
          })}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ─────────── 4. PILARES ───────────
const PillarIcon: React.FC<{kind: string; p: number}> = ({kind, p}) => {
  const c = C();
  const d = 120 * (1 - p);
  const st = {fill: 'none', stroke: c.acento, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeDasharray: 120, strokeDashoffset: d};
  return (
    <svg width="88" height="88" viewBox="0 0 32 32">
      {kind === 'estrategia' && <><circle cx="15" cy="17" r="10" {...st} /><circle cx="15" cy="17" r="5" {...st} /><path d="M15 17L27 5M22 5h5v5" {...st} /></>}
      {kind === 'creatividad' && <><path d="M16 3l2.6 7.4L26 13l-7.4 2.6L16 23l-2.6-7.4L6 13l7.4-2.6z" {...st} /><path d="M25 21l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" {...st} /></>}
      {kind === 'edicion' && <><rect x="4" y="7" width="24" height="18" rx="3" {...st} /><path d="M13 12l6 4-6 4z" {...st} /><path d="M4 21h24" {...st} /></>}
      {kind === 'calendario' && <><rect x="4" y="6" width="24" height="22" rx="3" {...st} /><path d="M4 12h24M10 3v6M22 3v6M11 20l3 3 6-6" {...st} /></>}
    </svg>
  );
};

export const Pilares: React.FC<P> = ({s, i}) => {
  const t = useT();
  const c = C();
  const ev = useEv(i);
  const tc = ev('cierre');
  const merge = prog(t, tc - 0.15, 0.55, inOut);
  const ring = prog(t, tc + 0.3, 0.9, expo);
  return (
    <AbsoluteFill style={{transform: shake(t, [tc + 0.35], 14)}}>
      <Atmosphere energy={0.9} />
      <AbsoluteFill style={{perspective: 1600}}>
        {s.items.map((it: any, k: number) => {
          const at = ev(`item${k}`);
          const p = spr(t, at, {damping: 15, stiffness: 120});
          const active = t >= at && (k === s.items.length - 1 || t < ev(`item${k + 1}`));
          const y = mix(k * 205, 260, merge);
          return (
            <div key={k} style={{position: 'absolute', top: 400 + y, left: 100, width: 880, height: 176, transform: `translateZ(${mix(-900, 0, p) - merge * 200}px) rotateX(${mix(60, 0, p) + merge * 0}deg) scale(${mix(1, 0.6, merge)})`, opacity: p * (1 - merge * 0.85), borderRadius: 36, padding: '0 44px', display: 'flex', alignItems: 'center', gap: 34, background: active ? `linear-gradient(100deg, ${c.primario}55, rgba(255,255,255,0.06))` : 'rgba(255,255,255,0.05)', border: `2px solid ${active ? c.acento : 'rgba(255,255,255,0.12)'}`, backdropFilter: 'blur(18px)', boxShadow: active ? `0 0 70px ${c.primario}55` : undefined}}>
              <PillarIcon kind={it.icono} p={prog(t, at + 0.1, 0.7, inOut)} />
              <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: it.texto.length > 20 ? 52 : 64, color: c.texto, letterSpacing: -1.5}}>{it.texto}</div>
              <div style={{marginLeft: 'auto', fontFamily: SERIF, fontStyle: 'italic', fontSize: 54, color: 'rgba(255,255,255,0.35)'}}>0{k + 1}</div>
            </div>
          );
        })}
      </AbsoluteFill>
      {/* cierre: todo en uno */}
      {t > tc - 0.2 && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <div style={{position: 'absolute', left: 540 - ring * 900, top: 700 - ring * 900, width: ring * 1800, height: ring * 1800, borderRadius: '50%', border: `${mix(8, 2, ring)}px solid ${c.acento}`, opacity: (1 - ring) * 0.8}} />
          <div style={{width: 300, height: 300, borderRadius: '50%', background: `conic-gradient(from ${t * 120}deg, ${c.primario}, ${c.acento}, ${c.primario})`, padding: 6, transform: `scale(${spr(t, tc + 0.2, {damping: 11})})`, boxShadow: `0 0 120px ${c.primario}99`, marginTop: -260}}>
            <div style={{width: '100%', height: '100%', borderRadius: '50%', background: c.fondo, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10}}>
              {s.items.map((it: any, k: number) => <div key={k} style={{transform: `scale(0.55) translateY(${Math.sin(t * 4 + k) * 6}px)`, margin: -14}}><PillarIcon kind={it.icono} p={1} /></div>)}
            </div>
          </div>
          <div style={{position: 'absolute', top: 1130, left: 0, right: 0}}>
            <MaskWords text={s.cierre.kicker} t={t} at={tc + 0.15} size={100} font={SERIF} weight={400} />
            <MaskWords text={s.cierre.texto} t={t} at={tc + 0.35} size={94} weight={900} letter={-0.04} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ─────────── 5. BENEFICIO ───────────
export const Beneficio: React.FC<P> = ({s, i}) => {
  const t = useT();
  const c = C();
  const ev = useEv(i);
  const tn = ev('nosotros');
  const split = prog(t, tn - 0.35, 0.65, inOut);
  const local = t - s.desde;
  return (
    <AbsoluteFill>
      <Atmosphere tone="calido" energy={0.8} />
      {/* VOS: foto del negocio a pantalla completa → se comprime arriba */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: mix(1920, 820, split), overflow: 'hidden', clipPath: `polygon(0 0, 100% 0, 100% ${mix(100, 88, split)}%, 0 100%)`}}>
        <Img src={staticFile(s.foto)} style={{width: '100%', height: 1920, objectFit: 'cover', transform: `scale(${1.15 - local * 0.02}) translateY(${-local * 14}px)`, filter: 'saturate(1.15) contrast(1.05)'}} />
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.6))`}} />
        <div style={{position: 'absolute', left: 80, bottom: mix(560, 150, split)}}>
          <MaskWords text={s.vos[0]} t={t} at={s.desde + 0.15} size={110} font={SERIF} weight={400} align="left" />
          <MaskWords text={s.vos[1]} t={t} at={s.desde + 0.35} size={118} weight={900} letter={-0.045} align="left" />
        </div>
        <div style={{position: 'absolute', top: 250, right: 70}}><Chip t={t} at={s.desde + 0.3} tone="aviso" size={24}>EJEMPLO</Chip></div>
      </div>
      {/* línea divisoria */}
      <div style={{position: 'absolute', left: 0, top: mix(1920, 790, split), width: 1080, height: 6, background: `linear-gradient(90deg, ${c.acento}, ${c.primario})`, transform: 'rotate(-3.2deg)', transformOrigin: 'left', opacity: split, boxShadow: `0 0 30px ${c.acento}`}} />
      {/* NOSOTROS: grilla de perfil que se llena */}
      {t > tn - 0.4 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 870, opacity: split}}>
          <div style={{paddingLeft: 80}}>
            <MaskWords text={s.nosotros[0]} t={t} at={tn} size={84} font={SERIF} weight={400} align="left" />
            <MaskWords text={s.nosotros[1]} t={t} at={tn + 0.15} size={84} weight={900} letter={-0.04} align="left" gradient={`linear-gradient(90deg, #fff, ${c.acento})`} />
          </div>
          <div style={{margin: '30px auto 0', width: 860, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, perspective: 1200}}>
            {s.grilla.map((img: string, k: number) => {
              const p = spr(t, ev(`tile${k}`), {damping: 13, stiffness: 160});
              return (
                <div key={k} style={{height: 200, borderRadius: 14, overflow: 'hidden', position: 'relative', transform: `rotateX(${(1 - p) * -80}deg) scale(${0.7 + 0.3 * p})`, opacity: p}}>
                  <Img src={staticFile(img)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.2) contrast(1.06)'}} />
                  <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 50%, ${c.fondo}CC)`}} />
                  <div style={{position: 'absolute', left: 14, bottom: 10, fontFamily: SERIF, fontStyle: 'italic', fontSize: 30, color: '#fff'}}>{['Nuevo', 'Hoy', 'Menú', 'Deco', 'Promo', 'Noche', 'Café', 'Salón', 'Mañana'][k % 9]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─────────── 6. CTA ───────────
export const Cta: React.FC<P> = ({s, i}) => {
  const t = useT();
  const c = C();
  const {brand} = useCtx();
  const ev = useEv(i);
  const tg = ev('grande'), td = ev('dm'), te = ev('enviar');
  const up = prog(t, td - 0.25, 0.55, inOut);
  const dmIn = spr(t, td - 0.15, {damping: 16});
  const kw: string = s.palabraClave;
  const typed = kw.split('').filter((_, k) => t >= ev(`tecla${k}`)).join('');
  const sent = spr(t, te, {damping: 14});
  const burst = prog(t, te + 0.1, 0.8, expo);
  const [num, ...rest] = String(s.grande).split(' ');
  void Img;
  return (
    <AbsoluteFill style={{transform: shake(t, [tg, te + 0.12], 16)}}>
      <Atmosphere energy={1.3} />
      <AbsoluteFill style={{alignItems: 'center', transform: `translateY(${mix(0, -250, up)}px) scale(${mix(1, 0.7, up)})`}}>
        {brand.logo && <Img src={staticFile(brand.logo)} style={{marginTop: 230, width: 170, height: 170, transform: `scale(${spr(t, s.desde + 0.05, {damping: 12})}) rotate(${(1 - spr(t, s.desde + 0.05, {damping: 12})) * -120}deg)`, filter: `drop-shadow(0 0 40px ${c.acento}66)`}} />}
        <div style={{marginTop: 30, padding: '0 60px'}}><MaskWords text={s.kicker} t={t} at={s.desde + 0.2} size={88} font={SERIF} weight={400} /></div>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 26, marginTop: 10, transform: `scale(${mix(1.4, 1, spr(t, tg, {damping: 11}))})`, opacity: prog(t, tg, 0.15)}}>
          <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 420, lineHeight: 0.8, letterSpacing: -20, color: 'transparent', backgroundImage: `linear-gradient(160deg, #fff 10%, ${c.acento} 55%, ${c.primario})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', textShadow: 'none', filter: `drop-shadow(0 20px 50px ${c.primario}88)`}}>{num}</div>
          <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 150, lineHeight: 0.9, letterSpacing: -6, color: c.texto, paddingBottom: 18}}>{rest.join(' ')}</div>
        </div>
      </AbsoluteFill>
      {s.nota && <div style={{position: 'absolute', left: 0, right: 0, top: mix(1280, 760, up), display: 'flex', justifyContent: 'center', transform: `scale(${mix(1, 0.85, up)})`}}><Chip t={t} at={tg + 0.35} tone="acento" size={30}>{s.nota}</Chip></div>}
      {/* chat privado */}
      {t > td - 0.3 && (
        <div style={{position: 'absolute', left: 90, right: 90, top: 860, transform: `translateY(${(1 - dmIn) * 700}px)`, opacity: dmIn, borderRadius: 44, background: 'rgba(18,18,26,0.85)', border: '2px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', padding: 34, boxShadow: '0 50px 100px rgba(0,0,0,0.5)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 20, paddingBottom: 26, borderBottom: '1.5px solid rgba(255,255,255,0.08)'}}>
            <Avatar s={76} label={brand.nombre} img={brand.logo} />
            <div>
              <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 36, color: '#fff'}}>{(brand.handle ?? '').replace('@', '')}</div>
              <div style={{fontFamily: DISPLAY, fontWeight: 500, fontSize: 26, color: 'rgba(255,255,255,0.5)'}}>Mensaje privado</div>
            </div>
          </div>
          <div style={{height: 170, position: 'relative'}}>
            {sent > 0 && (
              <div style={{position: 'absolute', right: 0, bottom: 24, transform: `translateY(${(1 - sent) * 120}px) scale(${0.6 + 0.4 * sent})`, transformOrigin: 'right bottom', opacity: sent, padding: '22px 38px', borderRadius: '36px 36px 8px 36px', background: `linear-gradient(120deg, ${c.primario}, ${c.acento})`, fontFamily: DISPLAY, fontWeight: 900, fontSize: 54, letterSpacing: 4, color: '#fff'}}>{kw}</div>
            )}
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '18px 18px 18px 34px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)'}}>
            <div style={{flex: 1, fontFamily: DISPLAY, fontWeight: 800, fontSize: 44, letterSpacing: 4, color: '#fff', minHeight: 56}}>
              {sent > 0.05 ? <span style={{color: 'rgba(255,255,255,0.35)', fontWeight: 500, letterSpacing: 0, fontSize: 36}}>Mensaje…</span> : typed}
              {sent <= 0.05 && <span style={{opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: c.acento}}>|</span>}
            </div>
            <div style={{width: 84, height: 84, borderRadius: '50%', background: typed.length ? c.acento : 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + 0.25 * Math.max(0, 1 - Math.abs(t - te) * 6)})`}}><Icon d="send" s={44} /></div>
          </div>
        </div>
      )}
      {burst > 0 && burst < 1 && [...Array(14)].map((_, k) => {
        const a = (k / 14) * Math.PI * 2;
        return <div key={k} style={{position: 'absolute', left: 820 + Math.cos(a) * burst * 260, top: 1080 + Math.sin(a) * burst * 260, width: 14, height: 14, borderRadius: 7, background: k % 2 ? c.acento : c.primario, opacity: 1 - burst}} />;
      })}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1350, textAlign: 'center', opacity: prog(t, te + 0.2, 0.4), fontFamily: DISPLAY, fontWeight: 700, fontSize: 40, letterSpacing: 6, color: 'rgba(255,255,255,0.75)'}}>{s.handle}</div>
    </AbsoluteFill>
  );
};
