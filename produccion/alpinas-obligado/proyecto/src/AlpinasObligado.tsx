import React, {useEffect, useState} from 'react';
import {
	AbsoluteFill,
	Audio,
	Easing,
	OffthreadVideo,
	Sequence,
	continueRender,
	delayRender,
	interpolate,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

export const FPS = 30;
const CREAM = '#F7F0E3';
const GOLD = '#E6C796';
const FOREST = '#1E2A21';
const SERIF = '"Cormorant", Georgia, serif';
const SANS = '"Jost", Helvetica, Arial, sans-serif';

const OUT = Easing.bezier(0.16, 1, 0.3, 1); // desaceleración larga, tipo "expo out"
const INOUT = Easing.bezier(0.65, 0, 0.35, 1);

const s = (sec: number) => Math.round(sec * FPS);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/* ---------- Fuentes locales (npm @fontsource) ---------- */
const FONT_FILES: [string, string, string, string][] = [
	['Cormorant', 'cormorant-garamond-latin-500-normal.woff2', '500', 'normal'],
	['Cormorant', 'cormorant-garamond-latin-600-normal.woff2', '600', 'normal'],
	['Cormorant', 'cormorant-garamond-latin-700-normal.woff2', '700', 'normal'],
	['Cormorant', 'cormorant-garamond-latin-500-italic.woff2', '500', 'italic'],
	['Jost', 'jost-latin-300-normal.woff2', '300', 'normal'],
	['Jost', 'jost-latin-400-normal.woff2', '400', 'normal'],
	['Jost', 'jost-latin-500-normal.woff2', '500', 'normal'],
	['Jost', 'jost-latin-600-normal.woff2', '600', 'normal'],
];
export const useFonts = () => {
	const [handle] = useState(() => delayRender('fonts'));
	useEffect(() => {
		Promise.all(
			FONT_FILES.map(([fam, file, weight, style]) => {
				const f = new FontFace(fam, `url(${staticFile('fonts/' + file)})`, {weight, style});
				return f.load().then((l) => document.fonts.add(l));
			}),
		).then(() => continueRender(handle));
	}, [handle]);
};

/* ---------- Plan de montaje (segundos de timeline) ---------- */
type Shot = {
	file: string;
	start: number;
	end: number;
	fadeIn: number; // duración del fundido de entrada (s)
	z0: number;
	z1: number;
	x0?: number;
	x1?: number;
	y0?: number;
	y1?: number;
};
const SHOTS: Shot[] = [
	{file: 's01', start: 0.0, end: 3.7, fadeIn: 0.0, z0: 1.12, z1: 1.2, x0: 70, x1: 30},
	{file: 's02', start: 3.43, end: 6.15, fadeIn: 0.3, z0: 1.05, z1: 1.12},
	{file: 's03', start: 6.0, end: 8.6, fadeIn: 0.2, z0: 1.04, z1: 1.1},
	{file: 's04', start: 8.45, end: 10.5, fadeIn: 0.2, z0: 1.0, z1: 1.05, y0: -40, y1: -70},
	{file: 's05', start: 10.29, end: 12.2, fadeIn: 0.3, z0: 1.04, z1: 1.1, y0: 20, y1: -10},
	{file: 's06', start: 12.0, end: 13.9, fadeIn: 0.22, z0: 1.05, z1: 1.11},
	{file: 's07', start: 13.71, end: 15.7, fadeIn: 0.22, z0: 1.1, z1: 1.04},
	{file: 's08', start: 15.5, end: 17.4, fadeIn: 0.22, z0: 1.04, z1: 1.1},
	{file: 's09', start: 17.14, end: 20.75, fadeIn: 0.35, z0: 1.04, z1: 1.13, x0: -10, x1: -40},
	{file: 's10', start: 20.57, end: 24.2, fadeIn: 0.4, z0: 1.12, z1: 1.05, x0: 40, x1: 10},
	{file: 's11', start: 24.0, end: 30.0, fadeIn: 0.45, z0: 1.24, z1: 1.1, x0: 120, x1: 70, y0: -20, y1: 0},
];

const ShotLayer: React.FC<{shot: Shot}> = ({shot}) => {
	const f = useCurrentFrame();
	const dur = s(shot.end - shot.start);
	const p = interpolate(f, [0, dur], [0, 1], clamp);
	const e = INOUT(p) * 0.7 + p * 0.3; // movimiento continuo y suave
	const z = shot.z0 + (shot.z1 - shot.z0) * e;
	const x = (shot.x0 ?? 0) + ((shot.x1 ?? 0) - (shot.x0 ?? 0)) * e;
	const y = (shot.y0 ?? 0) + ((shot.y1 ?? 0) - (shot.y0 ?? 0)) * e;
	const op = interpolate(f, [0, Math.max(1, s(shot.fadeIn))], [0, 1], {...clamp, easing: INOUT});
	return (
		<AbsoluteFill style={{opacity: op}}>
			<OffthreadVideo
				muted
				src={staticFile(`shots/${shot.file}.mp4`)}
				style={{
					width: '100%',
					height: '100%',
					objectFit: 'cover',
					transform: `translate(${x}px, ${y}px) scale(${z})`,
				}}
			/>
		</AbsoluteFill>
	);
};

/* ---------- Utilidades de animación tipográfica ---------- */
const useReveal = (inF: number, outF: number, dur = 22) => {
	const f = useCurrentFrame();
	const a = interpolate(f, [inF, inF + dur], [0, 1], {...clamp, easing: OUT});
	const b = interpolate(f, [outF - 14, outF], [1, 0], {...clamp, easing: INOUT});
	return Math.min(a, b);
};

const Word: React.FC<{
	children: React.ReactNode;
	at: number;
	out: number;
	style?: React.CSSProperties;
	rise?: number;
}> = ({children, at, out, style, rise = 46}) => {
	const f = useCurrentFrame();
	const a = interpolate(f, [at, at + 26], [0, 1], {...clamp, easing: OUT});
	const o = interpolate(f, [out - 16, out], [1, 0], {...clamp, easing: INOUT});
	const oy = interpolate(f, [out - 16, out], [0, -18], {...clamp, easing: INOUT});
	return (
		<span style={{display: 'inline-block', overflow: 'hidden', padding: '0.08em 0.04em', verticalAlign: 'bottom'}}>
			<span
				style={{
					display: 'inline-block',
					transform: `translateY(${(1 - a) * rise + oy}px)`,
					opacity: a * o,
					filter: `blur(${(1 - a) * 8}px)`,
					...style,
				}}
			>
				{children}
			</span>
		</span>
	);
};

const Rule: React.FC<{at: number; out: number; width: number; color?: string}> = ({at, out, width, color = GOLD}) => {
	const f = useCurrentFrame();
	const w = interpolate(f, [at, at + 30], [0, width], {...clamp, easing: OUT});
	const o = interpolate(f, [out - 14, out], [1, 0], clamp);
	return <div style={{height: 2, width: w, background: color, opacity: o * 0.9, margin: '0 auto', borderRadius: 2}} />;
};

const shadow = '0 2px 24px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.35)';

/* ---------- Gradientes de legibilidad ---------- */
const Grad: React.FC<{from: number; to: number; top?: boolean; strength?: number}> = ({from, to, top, strength = 0.55}) => {
	const f = useCurrentFrame();
	const o = Math.min(
		interpolate(f, [s(from), s(from) + 18], [0, 1], {...clamp, easing: INOUT}),
		interpolate(f, [s(to) - 18, s(to)], [1, 0], {...clamp, easing: INOUT}),
	);
	return (
		<AbsoluteFill
			style={{
				opacity: o,
				background: top
					? `linear-gradient(180deg, rgba(12,18,14,${strength}) 0%, rgba(12,18,14,${strength * 0.55}) 26%, rgba(12,18,14,0) 46%)`
					: `linear-gradient(0deg, rgba(12,18,14,${strength}) 0%, rgba(12,18,14,${strength * 0.6}) 30%, rgba(12,18,14,0) 52%)`,
			}}
		/>
	);
};

/* ---------- 0–3 s · Gancho ---------- */
const Hook: React.FC = () => {
	const i = s(0.45);
	const out = s(3.3);
	return (
		<AbsoluteFill style={{alignItems: 'center', top: 300}}>
			<div style={{textAlign: 'center', color: CREAM, textShadow: shadow}}>
				<div style={{fontFamily: SANS, fontWeight: 500, fontSize: 34, letterSpacing: '0.42em', textTransform: 'uppercase', marginBottom: 14}}>
					<Word at={i} out={out}>Tu escapada</Word>
				</div>
				<div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 500, fontSize: 104, lineHeight: 1.02}}>
					<Word at={i + 8} out={out}>de</Word> <Word at={i + 12} out={out}>este</Word>{' '}
					<Word at={i + 16} out={out}>finde</Word>
					<br />
					<Word at={i + 22} out={out}>largo…</Word>
				</div>
			</div>
		</AbsoluteFill>
	);
};

/* ---------- Subtítulos sincronizados con Vicky (tiempos de Whisper, palabra por palabra) ---------- */
type W = [number, number, string]; // [inicio, fin] en timeline (s)
const shift = (off: number, ws: W[]): W[] => ws.map(([a, b, t]) => [a + off, b + off, t]);
const CHUNKS: {from: number; to: number; words: W[]}[] = [
	{from: 3.6, to: 6.15, words: shift(0.35, [[3.31, 4.25, 'Nuestra'], [4.25, 4.71, 'cabaña'], [4.71, 5.6, 'familiar…']])},
	{from: 6.38, to: 7.74, words: shift(-44.35, [[50.78, 50.96, 'Es'], [50.96, 51.44, 'súper'], [51.44, 51.98, 'amplio,']])},
	{from: 7.74, to: 10.2, words: shift(-44.35, [[52.16, 52.3, 'tiene'], [52.3, 52.54, 'unos'], [52.54, 53.08, '72'], [53.08, 53.56, 'metros'], [53.56, 54.38, 'cuadrados']])},
	{from: 12.15, to: 14.15, words: shift(-51.7, [[63.9, 63.96, 'Es'], [63.96, 64.34, 'súper'], [64.34, 65.6, 'rústico']])},
	{from: 14.3, to: 16.15, words: shift(-75.15, [[89.54, 89.68, 'Todo'], [89.68, 90.12, 'junto,'], [90.4, 90.5, 'sin'], [90.5, 91.32, 'división,']])},
	{from: 16.15, to: 17.9, words: shift(-75.15, [[91.42, 91.76, 'ideal'], [91.76, 92.12, 'para'], [92.12, 92.38, 'una'], [92.38, 92.88, 'familia.']])},
];

const Subtitles: React.FC = () => {
	const f = useCurrentFrame();
	const t = f / FPS;
	const chunk = CHUNKS.find((c) => t >= c.from && t < c.to);
	if (!chunk) return null;
	const cin = interpolate(t, [chunk.from, chunk.from + 0.25], [0, 1], {...clamp, easing: OUT});
	const cout = interpolate(t, [chunk.to - 0.18, chunk.to], [1, 0], clamp);
	return (
		<AbsoluteFill style={{top: 1235, alignItems: 'center'}}>
			<div
				style={{
					maxWidth: 760,
					textAlign: 'center',
					fontFamily: SANS,
					fontWeight: 500,
					fontSize: 50,
					lineHeight: 1.2,
					color: CREAM,
					opacity: cin * cout,
					transform: `translateY(${(1 - cin) * 14}px)`,
					textShadow: '0 2px 14px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.6)',
				}}
			>
				{chunk.words.map(([a, , w], k) => {
					const lit = interpolate(t, [a - 0.05, a + 0.12], [0, 1], clamp);
					return (
						<span key={k} style={{opacity: 0.42 + 0.58 * lit, color: lit > 0.5 ? CREAM : '#EDE5D6', marginRight: '0.28em', display: 'inline-block', transform: `translateY(${(1 - lit) * 3}px)`}}>
							{w}
						</span>
					);
				})}
				<div
					style={{
						margin: '14px auto 0',
						width: 46,
						height: 2,
						background: GOLD,
						opacity: 0.85,
					}}
				/>
			</div>
		</AbsoluteFill>
	);
};

const Speaker: React.FC = () => {
	// Rótulo discreto que presenta a Vicky al empezar su voz
	const o = useReveal(s(3.75), s(6.0), 20);
	return (
		<AbsoluteFill style={{top: 1170, alignItems: 'center'}}>
			<div style={{opacity: o, fontFamily: SANS, fontWeight: 500, fontSize: 24, letterSpacing: '0.38em', color: GOLD, textTransform: 'uppercase', textShadow: shadow}}>
				Vicky · Alpinas Obligado
			</div>
		</AbsoluteFill>
	);
};

/* ---------- 10–18 s · Deseo ---------- */
const Desire: React.FC = () => {
	const a = s(10.5);
	const ao = s(13.55);
	const b = s(14.35);
	const bo = s(17.1);
	return (
		<>
			<AbsoluteFill style={{top: 330, alignItems: 'center'}}>
				<div style={{textAlign: 'center', color: CREAM, textShadow: shadow, fontFamily: SERIF, fontWeight: 500, fontSize: 108, lineHeight: 1.0}}>
					<Word at={a} out={ao}>Un</Word> <Word at={a + 5} out={ao}>lugar</Word>
					<br />
					<Word at={a + 10} out={ao} style={{fontStyle: 'italic'}}>para</Word>{' '}
					<Word at={a + 15} out={ao} style={{fontStyle: 'italic'}}>desconectar.</Word>
					<div style={{marginTop: 26}}>
						<Rule at={a + 18} out={ao} width={150} />
					</div>
				</div>
			</AbsoluteFill>
			<AbsoluteFill style={{top: 320, alignItems: 'center'}}>
				<div style={{textAlign: 'center', color: CREAM, textShadow: shadow}}>
					<div style={{fontFamily: SANS, fontWeight: 500, fontSize: 36, letterSpacing: '0.36em', textTransform: 'uppercase', marginBottom: 6}}>
						<Word at={b} out={bo}>Para disfrutar</Word>
					</div>
					<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 112, lineHeight: 1.0}}>
						<Word at={b + 7} out={bo}>de a</Word> <Word at={b + 11} out={bo} style={{color: GOLD}}>2 a 6</Word>
						<br />
						<Word at={b + 16} out={bo} style={{fontStyle: 'italic', fontWeight: 500}}>personas.</Word>
					</div>
				</div>
			</AbsoluteFill>
		</>
	);
};

/* ---------- 18–24 s · Oportunidad ---------- */
const Opportunity: React.FC = () => {
	const f = useCurrentFrame();
	const a = s(17.45);
	const out = s(23.85);
	const track = interpolate(f, [a, a + 40], [0.2, 0.04], {...clamp, easing: OUT});
	const breathe = 1 + 0.012 * Math.sin(((f - a) / FPS) * Math.PI * 0.9);
	return (
		<AbsoluteFill style={{top: 285, alignItems: 'center'}}>
			<div style={{textAlign: 'center', color: CREAM, textShadow: shadow, transform: `scale(${breathe})`}}>
				<div style={{marginBottom: 22}}>
					<Rule at={a} out={out} width={120} />
				</div>
				<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 48, letterSpacing: '0.5em', paddingLeft: '0.5em', marginBottom: 4}}>
					<Word at={a + 2} out={out} rise={40}>QUEDA</Word>
				</div>
				<div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 158, lineHeight: 0.92, letterSpacing: `${track}em`}}>
					<Word at={a + 7} out={out} rise={80} style={{color: GOLD}}>1</Word> <Word at={a + 11} out={out} rise={80}>SOLA</Word>
					<br />
					<Word at={a + 16} out={out} rise={80}>ALPINA</Word>
				</div>
				<div style={{marginTop: 34}}>
					<Word at={a + 30} out={out} rise={24}>
						<span
							style={{
								display: 'inline-block',
								fontFamily: SANS,
								fontWeight: 500,
								fontSize: 40,
								letterSpacing: '0.05em',
								padding: '14px 34px',
								borderRadius: 999,
								background: 'rgba(14,20,16,0.5)',
								border: `1.5px solid rgba(230,199,150,0.7)`,
								textShadow: 'none',
							}}
						>
							Disponible este fin de semana largo
						</span>
					</Word>
				</div>
			</div>
		</AbsoluteFill>
	);
};

/* ---------- 24–30 s · Conversión ---------- */
const AFrameMark: React.FC<{at: number}> = ({at}) => {
	// Silueta mínima de alpina (triángulo) dibujada en trazo: eco de la arquitectura real
	const f = useCurrentFrame();
	const p = interpolate(f, [at, at + 36], [0, 1], {...clamp, easing: OUT});
	const L = 330;
	return (
		<svg width={120} height={96} viewBox="0 0 120 96" style={{display: 'block', margin: '0 auto 10px'}}>
			<path
				d="M10 90 L60 8 L110 90 M38 90 L60 54 L82 90"
				fill="none"
				stroke={GOLD}
				strokeWidth={3}
				strokeLinejoin="round"
				strokeLinecap="round"
				strokeDasharray={L}
				strokeDashoffset={L * (1 - p)}
			/>
		</svg>
	);
};

const EndCard: React.FC = () => {
	const f = useCurrentFrame();
	const a = s(24.35);
	const out = s(31);
	const ctaIn = s(25.7);
	const c = interpolate(f, [ctaIn, ctaIn + 24], [0, 1], {...clamp, easing: OUT});
	const glow = 0.5 + 0.5 * Math.sin(((f - ctaIn) / FPS) * Math.PI * 1.1);
	return (
		<>
			<AbsoluteFill style={{top: 250, alignItems: 'center'}}>
				<div style={{textAlign: 'center', color: CREAM, textShadow: shadow}}>
					<AFrameMark at={a} />
					<div style={{fontFamily: SANS, fontWeight: 500, fontSize: 26, letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: 4, paddingLeft: '0.5em'}}>
						<Word at={a + 6} out={out}>Cabañas</Word>
					</div>
					<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 122, lineHeight: 0.98}}>
						<Word at={a + 10} out={out}>Alpinas</Word>
						<br />
						<Word at={a + 15} out={out}>Obligado</Word>
					</div>
					<div style={{marginTop: 24, fontFamily: SERIF, fontStyle: 'italic', fontWeight: 500, fontSize: 58}}>
						<Word at={a + 26} out={out} rise={26}>Tu próxima escapada te espera.</Word>
					</div>
				</div>
			</AbsoluteFill>
			<AbsoluteFill style={{top: 1190, alignItems: 'center'}}>
				<div
					style={{
						opacity: c,
						transform: `translateY(${(1 - c) * 30}px) scale(${0.96 + 0.04 * c})`,
						background: CREAM,
						color: FOREST,
						borderRadius: 999,
						padding: '30px 56px',
						fontFamily: SANS,
						fontWeight: 400,
						fontSize: 46,
						lineHeight: 1.25,
						textAlign: 'center',
						boxShadow: `0 10px 40px rgba(0,0,0,0.35), 0 0 ${18 + glow * 22}px rgba(230,199,150,${0.25 + glow * 0.25})`,
						maxWidth: 800,
					}}
				>
					Escribinos <b style={{fontWeight: 600, letterSpacing: '0.12em'}}>ALPINA</b>
					<br />
					por mensaje privado
				</div>
			</AbsoluteFill>
		</>
	);
};

/* ---------- Acabado: viñeta + grano ---------- */
const Finish: React.FC = () => {
	const f = useCurrentFrame();
	return (
		<>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 70% at 50% 46%, rgba(0,0,0,0) 55%, rgba(10,8,4,0.38) 100%)'}} />
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(255,190,120,0.05), rgba(0,0,0,0) 40%, rgba(255,170,90,0.04))', mixBlendMode: 'soft-light'}} />
			<AbsoluteFill style={{opacity: 0.07, mixBlendMode: 'overlay'}}>
				<svg width="100%" height="100%">
					<filter id="g">
						<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 24} stitchTiles="stitch" />
						<feColorMatrix type="saturate" values="0" />
					</filter>
					<rect width="100%" height="100%" filter="url(#g)" />
				</svg>
			</AbsoluteFill>
		</>
	);
};

const FadeFromBlack: React.FC = () => {
	const f = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const o = Math.max(
		interpolate(f, [0, 4], [0.6, 0], clamp),
		interpolate(f, [durationInFrames - 10, durationInFrames], [0, 0.0], clamp),
	);
	return <AbsoluteFill style={{background: '#000', opacity: o}} />;
};

export const AlpinasObligado: React.FC = () => {
	useFonts();
	return (
		<AbsoluteFill style={{background: '#0d120e', fontVariantNumeric: 'lining-nums', fontFeatureSettings: '"lnum" 1'}}>
			{SHOTS.map((sh) => (
				<Sequence key={sh.file} from={s(sh.start)} durationInFrames={s(sh.end - sh.start)} layout="none">
					<AbsoluteFill>
						<ShotLayer shot={sh} />
					</AbsoluteFill>
				</Sequence>
			))}
			<Finish />
			{/* gradientes de legibilidad */}
			<Grad from={0.2} to={3.4} top strength={0.45} />
			<Grad from={10.35} to={17.2} top strength={0.5} />
			<Grad from={17.3} to={24.0} top strength={0.55} />
			<Grad from={24.2} to={30.5} top strength={0.55} />
			<Grad from={3.5} to={17.95} strength={0.5} />
			<Grad from={25.4} to={30.5} strength={0.5} />
			<Hook />
			<Speaker />
			<Subtitles />
			<Desire />
			<Opportunity />
			<EndCard />
			<FadeFromBlack />
			<Audio src={staticFile('mix.wav')} />
		</AbsoluteFill>
	);
};

/* ---------- Portada 1080×1920 ---------- */
export const Portada: React.FC = () => {
	useFonts();
	return (
		<AbsoluteFill style={{background: '#0d120e', fontVariantNumeric: 'lining-nums', fontFeatureSettings: '"lnum" 1'}}>
			<OffthreadVideo muted src={staticFile('shots/s01.mp4')} startFrom={s(2.6)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: 'translate(40px,0) scale(1.16)'}} />
			<Finish />
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(12,18,14,0.6) 0%, rgba(12,18,14,0.3) 30%, rgba(12,18,14,0) 48%)'}} />
			<AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(12,18,14,0.75) 0%, rgba(12,18,14,0.45) 32%, rgba(12,18,14,0) 52%)'}} />
			<AbsoluteFill style={{top: 250, alignItems: 'center'}}>
				<div style={{textAlign: 'center', color: CREAM, textShadow: shadow}}>
					<div style={{fontFamily: SANS, fontWeight: 500, fontSize: 32, letterSpacing: '0.42em', textTransform: 'uppercase', marginBottom: 18}}>Finde largo</div>
					<div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 140, lineHeight: 0.95, letterSpacing: '0.06em'}}>
						QUEDA <span style={{color: GOLD}}>1</span> SOLA
						<br />
						ALPINA
					</div>
					<div style={{height: 2, width: 130, background: GOLD, margin: '34px auto 0'}} />
				</div>
			</AbsoluteFill>
			<AbsoluteFill style={{top: 1240, alignItems: 'center'}}>
				<div style={{textAlign: 'center', color: CREAM, textShadow: shadow}}>
					<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 84}}>Alpinas Obligado</div>
					<div style={{fontFamily: SANS, fontWeight: 500, fontSize: 44, marginTop: 10, letterSpacing: '0.04em', color: GOLD}}>De 2 a 6 personas</div>
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
