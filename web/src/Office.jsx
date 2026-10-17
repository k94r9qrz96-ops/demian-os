// Oficina isométrica en SVG. Todo lo que se anima proviene del backend:
// el estado de cada agente (/api/office) y los eventos en vivo (SSE). Sin ejecución, no hay animación de trabajo.
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { STATUS_HEX, useLive } from './lib.jsx';
import { Icon } from './icons.jsx';

const HW = 28; // medio ancho de baldosa
const HH = 14; // medio alto de baldosa
const iso = (x, y, z = 0) => [(x - y) * HW, (x + y) * HH - z];
const pts = (arr) => arr.map((p) => p.join(',')).join(' ');
const RW = 10; // ancho de sala (x)
const RD = 8.4; // profundidad de sala (y)
const WALL = 78;
const GAP = 2.4;
const LAYOUT = ['direccion', 'comercial', 'marketing', 'diseno', 'seleccion', 'operaciones', 'investigacion', 'consejo'];

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function roomOrigin(key) {
  const i = LAYOUT.indexOf(key);
  return [(i % 4) * (RW + GAP), Math.floor(i / 4) * (RD + GAP)];
}

function deskSlots(dept, n) {
  if (dept === 'direccion') return [[2.4, 5.3], [5.6, 5.3], [8.2, 5.3]].slice(0, n);
  if (dept === 'consejo') return [[2.3, 2.6], [5.0, 2.6], [7.7, 2.6], [2.3, 5.6], [5.0, 5.6], [7.7, 5.6]].slice(0, n);
  const out = [];
  for (let i = 0; i < n; i++) out.push([2.3 + (i % 3) * 2.7, 2.6 + Math.floor(i / 3) * 3.0]);
  return out;
}

function box(x, y, w, d, z0, h, top, left, right) {
  const tTop = [iso(x, y, z0 + h), iso(x + w, y, z0 + h), iso(x + w, y + d, z0 + h), iso(x, y + d, z0 + h)];
  const fFront = [iso(x, y + d, z0), iso(x + w, y + d, z0), iso(x + w, y + d, z0 + h), iso(x, y + d, z0 + h)];
  const fSide = [iso(x + w, y, z0), iso(x + w, y + d, z0), iso(x + w, y + d, z0 + h), iso(x + w, y, z0 + h)];
  return (
    <g>
      <polygon points={pts(fFront)} fill={left} />
      <polygon points={pts(fSide)} fill={right} />
      <polygon points={pts(tTop)} fill={top} />
    </g>
  );
}

function Plant({ x, y, s = 1 }) {
  const [px, py] = iso(x, y);
  return (
    <g transform={`translate(${px},${py}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="11" ry="5" fill="rgba(0,0,0,.25)" />
      <path d="M-8 -2 L-6 -16 L6 -16 L8 -2 Z" fill="#3b3f46" />
      <path d="M-6 -16 L6 -16" stroke="#555a63" strokeWidth="2" />
      <g fill="#3e7d4f">
        <ellipse cx="-6" cy="-26" rx="6" ry="11" transform="rotate(-25 -6 -26)" />
        <ellipse cx="6" cy="-27" rx="6" ry="11" transform="rotate(25 6 -27)" />
        <ellipse cx="0" cy="-33" rx="5.5" ry="12" fill="#4f9a62" />
      </g>
    </g>
  );
}

const HAIR = {
  short: (c) => <path d="M-8.5 -3 C-9 -12 9 -12 8.5 -3 C6 -7 -6 -7 -8.5 -3 Z" fill={c} />,
  long: (c) => <path d="M-9 -2 C-10 -13 10 -13 9 -2 L9.5 9 L6 9 L6 -2 C3 -6 -3 -6 -6 -2 L-6 9 L-9.5 9 Z" fill={c} />,
  bun: (c) => <g fill={c}><circle cx="0" cy="-11" r="4" /><path d="M-8.5 -2 C-9 -11 9 -11 8.5 -2 C6 -6 -6 -6 -8.5 -2 Z" /></g>,
  curly: (c) => <g fill={c}>{[-7, -3.5, 0, 3.5, 7].map((dx) => <circle key={dx} cx={dx} cy={-6 - (Math.abs(dx) < 4 ? 2 : 0)} r="3.6" />)}</g>,
  bald: () => null,
  pony: (c) => <g fill={c}><path d="M-8.5 -2 C-9 -11 9 -11 8.5 -2 C6 -6 -6 -6 -8.5 -2 Z" /><path d="M7 -4 Q14 2 10 10 Q9 3 6 0 Z" /></g>,
  side: (c) => <path d="M-8.6 -1 C-9 -12 9 -12 8.6 -3 C4 -8 -2 -5 -8.6 -1 Z" fill={c} />,
};

function Person({ a, working }) {
  const av = a.avatar || {};
  const skin = av.skin || '#e1b48f';
  const shirt = av.shirt || '#3d5a80';
  return (
    <g>
      {/* respaldo de silla */}
      <rect x="-14" y="-46" width="28" height="34" rx="7" fill="#1f2228" stroke="#2c3038" />
      {/* torso */}
      <path d="M-12 -14 C-12 -26 -8 -30 0 -30 C8 -30 12 -26 12 -14 Z" fill={shirt} />
      <path d="M-4 -30 L0 -25 L4 -30" fill="none" stroke={shade(shirt, 40)} strokeWidth="1.6" />
      <rect x="-3" y="-34" width="6" height="5" fill={shade(skin, -18)} />
      {/* cabeza */}
      <g transform="translate(0,-42)">
        <ellipse cx="0" cy="0" rx="8.2" ry="9" fill={skin} />
        {HAIR[av.hair || 'short']?.(av.hairColor || '#2b1e16')}
        <circle cx="-3" cy="1" r="1.1" fill="#1b1b1f" />
        <circle cx="3" cy="1" r="1.1" fill="#1b1b1f" />
        {av.glasses && <g fill="none" stroke="#1b1b1f" strokeWidth=".9"><circle cx="-3" cy="1" r="2.5" /><circle cx="3" cy="1" r="2.5" /><path d="M-.5 1h1" /></g>}
        <path d="M-2.2 4.6 Q0 5.8 2.2 4.6" stroke={shade(skin, -60)} strokeWidth=".9" fill="none" />
      </g>
      {/* manos sobre el escritorio */}
      <g className={working ? 'typing' : ''}>
        <ellipse cx="-7" cy="-11" rx="3.2" ry="2.4" fill={skin} />
        <ellipse cx="7" cy="-11" rx="3.2" ry="2.4" fill={skin} className="h2" />
      </g>
    </g>
  );
}

function Badge({ status }) {
  const c = STATUS_HEX[status];
  if (status === 'working') return (
    <g className="bubble" transform="translate(16,-62)">
      <rect x="-12" y="-8" width="24" height="15" rx="7.5" fill="#f4f1ea" />
      {[-5, 0, 5].map((dx, i) => <circle key={dx} cx={dx} cy="-0.5" r="1.8" fill="#2b2f36" className={`dot d${i}`} />)}
    </g>
  );
  const glyph = { waiting_approval: <path d="M0 -4.5v5M0 3.2v.4" stroke="#1c1405" strokeWidth="2.2" strokeLinecap="round" />, blocked: <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1" fill="#2a1406" />, failed: <path d="M-3 -3l6 6M3 -3l-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />, completed: <path d="M-3.4 0l2.3 2.4 4.6-4.8" stroke="#16260a" strokeWidth="2" fill="none" strokeLinecap="round" />, queued: <g stroke="#0d1830" strokeWidth="1.6" fill="none" strokeLinecap="round"><circle r="4" /><path d="M0 -2v2.2l1.6 1" /></g> }[status];
  if (!glyph) return null;
  return (
    <g className={`badge-${status}`} transform="translate(15,-60)">
      <circle r="7.5" fill={c} stroke="rgba(0,0,0,.35)" />
      {glyph}
    </g>
  );
}

function Desk({ a, x, y, selected, dim, onPick, bubble }) {
  const working = a.status === 'working';
  const glow = STATUS_HEX[a.status];
  const [sx, sy] = iso(x + 1, y - 0.42);
  return (
    <g className={`agent-g ${selected ? 'sel' : ''}`} data-agent={a.slug} opacity={dim ? 0.3 : 1} onClick={() => onPick(a.slug)}>
      <ellipse className="halo" cx={sx} cy={sy - 2} rx="34" ry="16" fill="none" stroke="#f2b544" strokeWidth="2" strokeDasharray="4 3" />
      {/* resplandor del monitor: solo con estado real */}
      {['working', 'waiting_approval', 'failed', 'blocked'].includes(a.status) && (
        <ellipse className={working ? 'glow' : ''} cx={iso(x + 0.45, y + 0.15)[0]} cy={iso(x + 0.45, y + 0.15)[1] - 26} rx="22" ry="13" fill={glow} opacity=".22" />
      )}
      <g transform={`translate(${sx},${sy})`}><Person a={a} working={working} /></g>
      {box(x, y, 2.0, 0.95, 0, 17, '#6b4a35', '#3e2a1e', '#523726')}
      <polygon points={pts([iso(x, y + 0.95, 17), iso(x + 2, y + 0.95, 17), iso(x + 2, y + 0.95, 15.5), iso(x, y + 0.95, 15.5)])} fill="rgba(255,214,150,.35)" />
      {/* teclado */}
      <polygon points={pts([iso(x + 0.65, y + 0.1, 17.4), iso(x + 1.35, y + 0.1, 17.4), iso(x + 1.35, y + 0.42, 17.4), iso(x + 0.65, y + 0.42, 17.4)])} fill="#c9c4ba" opacity=".9" />
      {/* monitor (dorso) */}
      {box(x + 0.15, y + 0.05, 0.62, 0.12, 17, 1, '#2a2d33', '#1e2126', '#25282e')}
      {box(x + 0.38, y + 0.08, 0.14, 0.06, 18, 8, '#2a2d33', '#1e2126', '#25282e')}
      {box(x + 0.05, y + 0.02, 0.85, 0.07, 24, 20, '#30343b', '#1b1d22', '#25282e')}
      <polygon points={pts([iso(x + 0.06, y + 0.02, 25), iso(x + 0.89, y + 0.02, 25), iso(x + 0.89, y + 0.02, 43), iso(x + 0.06, y + 0.02, 43)])} fill={working ? glow : '#1a1d22'} opacity={working ? 0.55 : 1} className={working ? 'screen' : ''} />
      {/* taza */}
      {box(x + 1.6, y + 0.55, 0.16, 0.16, 17, 6, '#e9e4da', '#bdb6aa', '#d3cdc2')}
      <g transform={`translate(${sx},${sy})`}><Badge status={a.status} /></g>
      {bubble && (
        <g transform={`translate(${sx},${sy - 78})`} className="flash">
          <rect x={-Math.min(120, bubble.length * 3.1 + 14) / 2} y="-10" width={Math.min(120, bubble.length * 3.1 + 14)} height="15" rx="7.5" fill="#101318" stroke={glow || '#f2b544'} />
          <text textAnchor="middle" y="1" fontSize="7.4" fill="#ece9e2" fontFamily="Inter Variable, sans-serif">{bubble.slice(0, 36)}</text>
        </g>
      )}
    </g>
  );
}

function Pill({ a, x, y, show, selected }) {
  if (!show) return null;
  const [sx, sy] = iso(x + 1, y - 0.42);
  const label = a.role.length > 26 ? `${a.role.slice(0, 25)}…` : a.role;
  const w = label.length * 4.25 + 22;
  return (
    <g transform={`translate(${sx},${sy - 66})`} style={{ pointerEvents: 'none' }}>
      <rect x={-w / 2} y="-9" width={w} height="16" rx="8" fill={selected ? '#f2b544' : '#f4f1ea'} stroke="rgba(0,0,0,.25)" />
      <circle cx={-w / 2 + 9} cy="-1" r="3" fill={STATUS_HEX[a.status]} />
      <text x={-w / 2 + 16} y="2.4" fontSize="8.2" fontWeight="600" fill="#1d2026" fontFamily="Inter Variable, sans-serif">{label}</text>
    </g>
  );
}

function Room({ dept, agents, dim, focus, onPick, selected, query, bubbles, showPills, pending, office }) {
  const [x0, y0] = roomOrigin(dept.key);
  const col = dept.color;
  const floor = '#3a2f26';
  const slots = deskSlots(dept.key, agents.length);
  const working = agents.filter((a) => a.status === 'working').length;
  const waiting = agents.filter((a) => a.status === 'waiting_approval').length;
  const trouble = agents.filter((a) => ['blocked', 'failed'].includes(a.status)).length;
  const queued = agents.filter((a) => a.status === 'queued').length;
  const matches = (a) => !query || `${a.role} ${a.name}`.toLowerCase().includes(query.toLowerCase());

  const corners = [iso(x0, y0), iso(x0 + RW, y0), iso(x0 + RW, y0 + RD), iso(x0, y0 + RD)];
  const wallA = [iso(x0, y0), iso(x0 + RW, y0), iso(x0 + RW, y0, WALL), iso(x0, y0, WALL)];
  const wallB = [iso(x0, y0), iso(x0, y0 + RD), iso(x0, y0 + RD, WALL), iso(x0, y0, WALL)];
  const [sxA, syA] = iso(x0 + RW / 2, y0, WALL - 22);
  const [sxB, syB] = iso(x0, y0 + RD / 2, WALL - 30);
  // sala de dirección: escritorio de Demian
  const boss = dept.key === 'direccion';
  const items = agents.map((a, i) => ({ a, x: x0 + slots[i][0] - 1, y: y0 + slots[i][1] })).sort((p, q) => p.x + p.y - (q.x + q.y));
  return (
    <g className={`room-g ${dim ? 'room-dim' : ''}`}>
      <polygon points={pts(corners)} fill={floor} />
      {Array.from({ length: Math.floor(RD) }, (_, k) => <line key={k} x1={iso(x0, y0 + k + 1)[0]} y1={iso(x0, y0 + k + 1)[1]} x2={iso(x0 + RW, y0 + k + 1)[0]} y2={iso(x0 + RW, y0 + k + 1)[1]} stroke="#000" strokeOpacity=".12" />)}
      <polygon points={pts([iso(x0 + 0.9, y0 + 1.4), iso(x0 + RW - 0.6, y0 + 1.4), iso(x0 + RW - 0.6, y0 + RD - 0.6), iso(x0 + 0.9, y0 + RD - 0.6)])} fill={col} opacity=".08" />
      {/* muros */}
      <polygon points={pts(wallA)} fill="#2a1d1a" />
      <polygon points={pts(wallB)} fill="#22171a" />
      <polygon points={pts([iso(x0, y0, WALL - 6), iso(x0 + RW, y0, WALL - 6), iso(x0 + RW, y0, WALL), iso(x0, y0, WALL)])} fill={col} opacity=".85" />
      <polygon points={pts([iso(x0, y0, WALL - 6), iso(x0, y0 + RD, WALL - 6), iso(x0, y0 + RD, WALL), iso(x0, y0, WALL)])} fill={shade(col, -30)} opacity=".85" />
      <polygon points={pts([iso(x0, y0, 14), iso(x0 + RW, y0, 14), iso(x0 + RW, y0, 16), iso(x0, y0, 16)])} fill="#000" opacity=".25" />
      {/* cartel del departamento */}
      <g transform={`matrix(1,0.5,0,1,${sxA},${syA})`}>
        <rect x="-78" y="-15" width="156" height="26" rx="4" fill="#120d0c" opacity=".85" />
        <text textAnchor="middle" y="4" fontSize="13.5" fontWeight="650" fill="#f4efe6" fontFamily="Space Grotesk Variable, sans-serif">{dept.name.length > 22 ? dept.name.split(' · ')[0] : dept.name}</text>
      </g>
      {/* pantalla con datos en vivo */}
      <g transform={`matrix(1,-0.5,0,1,${sxB},${syB})`}>
        <rect x="-62" y="-20" width="124" height="44" rx="4" fill="#0f1c1a" stroke="#2c3a37" />
        <text x="-54" y="-6" fontSize="7" fill="#7fb4a6" fontFamily="Inter Variable, sans-serif" letterSpacing=".08em">EN VIVO</text>
        <circle cx="-14" cy="-8.4" r="2.2" fill={working ? '#3ddc97' : '#40524e'} className={working ? 'blink' : ''} />
        <text x="-54" y="7" fontSize="8.6" fontWeight="600" fill="#e6efe9" fontFamily="Inter Variable, sans-serif">{working} trabajando · {queued} en cola</text>
        <text x="-54" y="18" fontSize="7.6" fill={trouble ? '#ffb38a' : waiting ? '#ffd890' : '#8fa9a2'} fontFamily="Inter Variable, sans-serif">{trouble ? `${trouble} con problemas` : waiting ? `${waiting} esperan aprobación` : 'sin alertas'}</text>
      </g>
      <Plant x={x0 + 0.55} y={y0 + 0.7} />
      <Plant x={x0 + RW - 0.7} y={y0 + 0.6} s={0.9} />
      {boss && (
        <g>
          <g transform={`translate(${iso(x0 + 5, y0 + 2.1)[0]},${iso(x0 + 5, y0 + 2.1)[1]})`}>
            <rect x="-15" y="-48" width="30" height="36" rx="7" fill="#262016" stroke="#4a3c22" />
            <circle cy="-40" r="9" fill="#2d2a25" stroke="#f2b544" strokeWidth="1.5" />
            <text y="-36.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#f2b544" fontFamily="Space Grotesk Variable">D</text>
          </g>
          {box(x0 + 3.5, y0 + 2.5, 3.0, 1.2, 0, 18, '#7a5440', '#45301f', '#5b3f2c')}
          {box(x0 + 7.6, y0 + 5.2, 1.6, 2.4, 0, 12, '#8a3b2c', '#5f281e', '#712f24')}
          {box(x0 + 7.4, y0 + 5.2, 0.35, 2.4, 0, 24, '#9a4434', '#5f281e', '#712f24')}
          <g transform={`translate(${iso(x0 + 5, y0 + 2.1)[0]},${iso(x0 + 5, y0 + 2.1)[1] - 66})`} style={{ pointerEvents: 'none' }}>
            <rect x="-48" y="-9" width="96" height="16" rx="8" fill="#f2b544" />
            <text textAnchor="middle" y="2.4" fontSize="8.4" fontWeight="700" fill="#1c1405" fontFamily="Inter Variable">Vos · gerencia{pending ? ` · ${pending} ✋` : ''}</text>
          </g>
        </g>
      )}
      {items.map(({ a, x, y }) => <Desk key={a.slug} a={a} x={x} y={y} selected={selected === a.slug} dim={!matches(a)} onPick={onPick} bubble={bubbles[a.slug]} />)}
      {items.map(({ a, x, y }) => <Pill key={a.slug} a={a} x={x} y={y} selected={selected === a.slug} show={(showPills || selected === a.slug || a.status !== 'available') && matches(a)} />)}
      {/* vidrio frontal */}
      <polygon points={pts([iso(x0, y0 + RD), iso(x0 + RW * 0.42, y0 + RD), iso(x0 + RW * 0.42, y0 + RD, 20), iso(x0, y0 + RD, 20)])} fill="rgba(170,200,230,.05)" stroke="rgba(220,235,255,.14)" style={{ pointerEvents: 'none' }} />
      <polygon points={pts([iso(x0 + RW, y0), iso(x0 + RW, y0 + RD * 0.55), iso(x0 + RW, y0 + RD * 0.55, 20), iso(x0 + RW, y0, 20)])} fill="rgba(170,200,230,.05)" stroke="rgba(220,235,255,.14)" style={{ pointerEvents: 'none' }} />
      <polyline points={pts([iso(x0, y0 + RD), iso(x0 + RW, y0 + RD), iso(x0 + RW, y0)])} fill="none" stroke="rgba(255,206,130,.35)" strokeWidth="1.5" style={{ pointerEvents: 'none' }} />
    </g>
  );
}

export function roomBounds(key) {
  const [x0, y0] = roomOrigin(key);
  const xs = [iso(x0, y0 + RD)[0], iso(x0 + RW, y0)[0]];
  const ys = [iso(x0, y0, WALL)[1] - 10, iso(x0 + RW, y0 + RD)[1]];
  return { minX: xs[0], maxX: xs[1], minY: ys[0], maxY: ys[1] };
}
function worldBounds() {
  const all = LAYOUT.map(roomBounds);
  return { minX: Math.min(...all.map((b) => b.minX)), maxX: Math.max(...all.map((b) => b.maxX)), minY: Math.min(...all.map((b) => b.minY)), maxY: Math.max(...all.map((b) => b.maxY)) };
}

const Scene = memo(function Scene({ office, filter, query, selected, onPick, bubbles, showPills }) {
  const byDept = useMemo(() => {
    const m = {};
    for (const a of office.agents) (m[a.department] ||= []).push(a);
    return m;
  }, [office.agents]);
  const wb = worldBounds();
  return (
    <g>
      <rect x={wb.minX - 400} y={wb.minY - 300} width={wb.maxX - wb.minX + 800} height={wb.maxY - wb.minY + 600} fill="url(#grid)" />
      {office.departments.map((d) => (
        <Room key={d.key} dept={d} agents={byDept[d.key] || []} dim={filter && filter !== d.key} onPick={onPick} selected={selected} query={query} bubbles={bubbles} showPills={showPills} pending={office.pending_approvals} office={office} />
      ))}
    </g>
  );
});

export default function Office({ office, filter, query, selected, onPick }) {
  const wrap = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [view, setView] = useState(null);
  const [still, setStill] = useState(false);
  const [bubbles, setBubbles] = useState({});
  const pointers = useRef(new Map());
  const drag = useRef(null);
  const anim = useRef(null);
  const live = useLive();

  useLayoutEffect(() => {
    const el = wrap.current;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitTo = useCallback((b, pad = 40) => {
    const k = Math.min((size.w - pad) / (b.maxX - b.minX), (size.h - pad) / (b.maxY - b.minY), 2.6);
    return { k, x: size.w / 2 - ((b.minX + b.maxX) / 2) * k, y: size.h / 2 - ((b.minY + b.maxY) / 2) * k };
  }, [size]);

  const animateTo = useCallback((target) => {
    cancelAnimationFrame(anim.current);
    const start = performance.now();
    setView((from) => {
      if (!from) return target;
      const step = (now) => {
        const t = Math.min(1, (now - start) / 480);
        const e = 1 - (1 - t) ** 3;
        setView({ k: from.k + (target.k - from.k) * e, x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e });
        if (t < 1) anim.current = requestAnimationFrame(step);
      };
      anim.current = requestAnimationFrame(step);
      return from;
    });
  }, []);

  useEffect(() => {
    if (size.w < 50) return;
    const mobile = size.w < 640;
    const fitTop = (b) => { const k = Math.min(2.6, (size.w + 30) / (b.maxX - b.minX)); return { k, x: size.w / 2 - ((b.minX + b.maxX) / 2) * k, y: 16 - b.minY * k }; };
    const target = mobile ? fitTop(roomBounds(filter || 'direccion')) : filter ? fitTo(roomBounds(filter), 60) : fitTo(worldBounds(), 30);
    if (!view) setView(target); else animateTo(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, size.w, size.h]);

  // Burbujas de actividad: solo a partir de eventos reales del backend
  useEffect(() => live?.subscribe((ev) => {
    if (!ev.agent_slug) return;
    const text = ev.type === 'agent.step' ? ev.message : ev.type === 'task.running' ? 'Empezó una tarea' : ev.type === 'task.completed' ? '✓ Terminó' : ev.type === 'approval.requested' ? 'Pide tu aprobación' : ev.type === 'task.failed' ? '✗ Falló' : ev.type === 'deliverable.created' ? '＋ Entregable' : null;
    if (!text) return;
    setBubbles((b) => ({ ...b, [ev.agent_slug]: text }));
    setTimeout(() => setBubbles((b) => { if (b[ev.agent_slug] !== text) return b; const n = { ...b }; delete n[ev.agent_slug]; return n; }), 3500);
  }), [live]);

  const zoomAt = (factor, cx = size.w / 2, cy = size.h / 2) => setView((v) => {
    const k = Math.max(0.25, Math.min(3.2, v.k * factor));
    const f = k / v.k;
    return { k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f };
  });

  const onWheel = (e) => {
    e.preventDefault();
    const r = wrap.current.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
  };
  useEffect(() => {
    const el = wrap.current;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const onDown = (e) => {
    cancelAnimationFrame(anim.current);
    wrap.current.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const agentEl = e.target.closest?.('[data-agent]');
    drag.current = { x: e.clientX, y: e.clientY, view, moved: 0, agent: agentEl?.dataset.agent, pinch: null };
  };
  const onMove = (e) => {
    if (!pointers.current.has(e.pointerId) || !drag.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ps = [...pointers.current.values()];
    if (ps.length === 2) {
      const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
      const r = wrap.current.getBoundingClientRect();
      const mx = (ps[0].x + ps[1].x) / 2 - r.left, my = (ps[0].y + ps[1].y) / 2 - r.top;
      if (!drag.current.pinch) drag.current.pinch = { d, view };
      const base = drag.current.pinch.view;
      const k = Math.max(0.25, Math.min(3.2, base.k * (d / drag.current.pinch.d)));
      const f = k / base.k;
      setView({ k, x: mx - (mx - base.x) * f, y: my - (my - base.y) * f });
      drag.current.moved = 99;
      return;
    }
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    drag.current.moved = Math.max(drag.current.moved, Math.hypot(dx, dy));
    if (drag.current.moved > 4) {
      wrap.current.classList.add('dragging');
      setView({ ...drag.current.view, x: drag.current.view.x + dx, y: drag.current.view.y + dy });
    }
  };
  const onUp = (e) => {
    pointers.current.delete(e.pointerId);
    wrap.current.classList.remove('dragging');
    if (drag.current && drag.current.moved < 6 && drag.current.agent && pointers.current.size === 0) onPick(drag.current.agent);
    if (pointers.current.size === 0) drag.current = null;
    else drag.current = { ...drag.current, pinch: null, view, x: [...pointers.current.values()][0].x, y: [...pointers.current.values()][0].y };
  };

  const v = view || { k: 1, x: 0, y: 0 };
  const total = office.agents.length;
  return (
    <div ref={wrap} className={`office-wrap ${still ? 'still' : ''}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="application" aria-label="Oficina virtual: arrastrá para desplazarte, pellizcá o usá la rueda para hacer zoom">
      <svg viewBox={`0 0 ${size.w} ${size.h}`}>
        <defs>
          <pattern id="grid" width="56" height="28" patternUnits="userSpaceOnUse">
            <path d="M0 14 L28 0 L56 14 L28 28 Z" fill="none" stroke="#ffffff" strokeOpacity=".025" />
          </pattern>
          <style>{`
            .typing ellipse { animation: type .32s ease-in-out infinite alternate; }
            .typing .h2 { animation-delay: .16s; }
            @keyframes type { to { transform: translateY(-1.6px); } }
            .bubble .dot { animation: dot 1s infinite; } .bubble .d1 { animation-delay: .15s } .bubble .d2 { animation-delay: .3s }
            @keyframes dot { 0%,60%,100% { opacity: .25 } 30% { opacity: 1 } }
            .glow { animation: glow 1.6s ease-in-out infinite; } @keyframes glow { 50% { opacity: .08 } }
            .screen { animation: scr 2.4s ease-in-out infinite; } @keyframes scr { 50% { opacity: .35 } }
            .badge-waiting_approval { animation: bob 1.2s ease-in-out infinite; } @keyframes bob { 50% { transform: translate(15px,-64px) } }
            .badge-failed { animation: shake .5s 3; } @keyframes shake { 25% { transform: translate(13px,-60px) } 75% { transform: translate(17px,-60px) } }
            .badge-completed { animation: popc .5s; } @keyframes popc { from { transform: translate(15px,-60px) scale(.2) } }
            .blink { animation: glow 1s infinite; }
            .flash { animation: flash 3.5s forwards; } @keyframes flash { 0% { opacity: 0 } 8%, 80% { opacity: 1 } 100% { opacity: 0 } }
          `}</style>
        </defs>
        <g transform={`translate(${v.x},${v.y}) scale(${v.k})`}>
          <Scene office={office} filter={filter} query={query} selected={selected} onPick={() => {}} bubbles={bubbles} showPills={v.k > 0.62} />
        </g>
      </svg>
      <div className="office-hud">
        <div className="legend">
          <span><i style={{ background: '#3ddc97' }} />{office.agents.filter((a) => a.status === 'working').length} trabajando</span>
          <span><i style={{ background: '#7aa2f7' }} />{office.agents.filter((a) => a.status === 'queued').length} en cola</span>
          <span><i style={{ background: '#f5b544' }} />{office.pending_approvals} aprobaciones</span>
          <span><i style={{ background: '#ff8a3d' }} />{office.agents.filter((a) => ['blocked', 'failed'].includes(a.status)).length} con problemas</span>
          <span className="dim">{total} agentes · vos en gerencia</span>
        </div>
        <div className="zoombar" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => zoomAt(1 / 1.25)} aria-label="Alejar"><Icon name="minus" size={17} /></button>
          <span>{Math.round(v.k * 100)}%</span>
          <button onClick={() => zoomAt(1.25)} aria-label="Acercar"><Icon name="plus" size={17} /></button>
          <button onClick={() => animateTo(filter ? fitTo(roomBounds(filter), 60) : fitTo(worldBounds(), 30))} aria-label="Encuadrar"><Icon name="target" size={17} /></button>
          <button onClick={() => setStill((s) => !s)} aria-label={still ? 'Reanudar animaciones' : 'Pausar animaciones'}><Icon name={still ? 'play' : 'pause'} size={16} /></button>
        </div>
      </div>
    </div>
  );
}
