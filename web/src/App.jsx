import { useEffect, useState } from 'react';
import { api, LiveProvider, useLive, ToastProvider, go } from './lib.jsx';
import { Icon, Logo } from './icons.jsx';
import { OfficeView } from './views/OfficeView.jsx';
import { TasksView, TaskSheet } from './views/Tasks.jsx';
import { ApprovalsView } from './views/Approvals.jsx';
import { DeliverablesView, DeliverableSheet } from './views/Deliverables.jsx';
import { ConversationsView } from './views/Conversations.jsx';
import { RecruitingView } from './views/Recruiting.jsx';
import { MemoryView } from './views/Memory.jsx';
import { IntegrationsView } from './views/Integrations.jsx';
import { SettingsView } from './views/Settings.jsx';
import { ActivityView } from './views/Activity.jsx';
import { MoreView } from './views/More.jsx';
import { DirectorSheet } from './components/DirectorSheet.jsx';
import { AgentPanel } from './components/AgentPanel.jsx';
import { GlobalSearch } from './components/GlobalSearch.jsx';
import { InstructionSheet } from './views/Instructions.jsx';

const ROUTES = {
  oficina: { title: 'Oficina', icon: 'office', el: OfficeView },
  tareas: { title: 'Tareas', icon: 'tasks', el: TasksView },
  aprobaciones: { title: 'Aprobaciones', icon: 'hand', el: ApprovalsView },
  entregables: { title: 'Entregables', icon: 'box', el: DeliverablesView },
  conversaciones: { title: 'Conversaciones', icon: 'chat', el: ConversationsView },
  seleccion: { title: 'Selección · Elite Hunters', icon: 'briefcase', el: RecruitingView },
  memoria: { title: 'Empresas, clientes y memoria', icon: 'brain', el: MemoryView },
  actividad: { title: 'Actividad', icon: 'bell', el: ActivityView },
  integraciones: { title: 'Integraciones', icon: 'plug', el: IntegrationsView },
  ajustes: { title: 'Ajustes y control', icon: 'gear', el: SettingsView },
  mas: { title: 'Más', icon: 'more', el: MoreView },
};

function useHashRoute() {
  const parse = () => {
    const h = window.location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    return { name: ROUTES[path] ? path : 'oficina', params: Object.fromEntries(new URLSearchParams(qs || '')) };
  };
  const [r, set] = useState(parse);
  useEffect(() => { const f = () => set(parse()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return r;
}

function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('Demian');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/setup/status').then((r) => setSetup(r.needs_setup)).catch(() => {}); }, []);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (setup) await api('/setup', { method: 'POST', body: { code, email, name, password } });
      else await api('/auth/login', { method: 'POST', body: { email, password } });
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <div className="login">
      <form className="card col" onSubmit={submit} style={{ gap: 14 }}>
        <div className="row" style={{ gap: 12 }}><Logo size={42} /><div><div className="h2" style={{ margin: 0 }}>Demian OS</div><div className="muted small">{setup ? 'Primer arranque: creá tu cuenta de dueño' : 'Tu oficina de agentes'}</div></div></div>
        {setup && <div className="note">Ingresá el código de instalación que aparece en los registros (logs) del servidor.</div>}
        {setup && <label className="f">Código de instalación<input value={code} onChange={(e) => setCode(e.target.value)} required autoCapitalize="characters" /></label>}
        {setup && <label className="f">Tu nombre<input value={name} onChange={(e) => setName(e.target.value)} required /></label>}
        <label className="f">Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="f">Contraseña{setup ? ' (mínimo 10 caracteres)' : ''}<input type="password" autoComplete={setup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={setup ? 10 : undefined} /></label>
        {err && <div className="err">{err}</div>}
        <button className="btn primary" disabled={busy}>{busy ? <span className="spin" /> : setup ? 'Crear cuenta y entrar' : 'Entrar'}</button>
      </form>
    </div>
  );
}

function Shell({ me, onLogout }) {
  const route = useHashRoute();
  const live = useLive();
  const office = live.office;
  const [director, setDirector] = useState(null);
  const [agent, setAgent] = useState(null);
  const [task, setTask] = useState(null);
  const [deliverable, setDeliverable] = useState(null);
  const [instruction, setInstruction] = useState(null);
  const R = ROUTES[route.name];
  const View = R.el;
  const ctx = { me, openAgent: setAgent, openTask: setTask, openDeliverable: setDeliverable, openInstruction: setInstruction, openDirector: (o = {}) => setDirector(o), params: route.params };
  const pending = office?.pending_approvals || 0;
  const unread = office?.unread || 0;
  const nav = ['oficina', 'tareas', 'aprobaciones', 'entregables', 'conversaciones', 'seleccion', 'memoria', 'actividad', 'integraciones', 'ajustes'];
  const mobile = ['oficina', 'tareas', 'aprobaciones', 'entregables', 'mas'];
  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><Logo /><div>Demian OS<small>{me.user.name} · {me.user.role === 'owner' ? 'dueño' : me.user.role}</small></div></div>
        {nav.map((k) => (
          <button key={k} className={`navitem ${route.name === k ? 'active' : ''}`} onClick={() => go(k)}>
            <Icon name={ROUTES[k].icon} size={19} />{ROUTES[k].title.split(' · ')[0].replace('Empresas, clientes y memoria', 'Memoria')}
            {k === 'aprobaciones' && pending > 0 && <span className="badge">{pending}</span>}
            {k === 'actividad' && unread > 0 && <span className="badge red">{unread}</span>}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="small dim" style={{ padding: '8px 12px' }}>
          <div className="row" style={{ gap: 6 }}><span className="int-status" style={{ background: live.connected ? 'var(--st-working)' : 'var(--st-failed)' }} />{live.connected ? 'En vivo' : 'Reconectando…'}</div>
          <div style={{ marginTop: 4 }}>Claude: {me.llm === 'real' ? 'conectado' : me.llm === 'simulado' ? 'simulado' : 'sin conectar'}</div>
        </div>
        <button className="navitem" onClick={onLogout}><Icon name="logout" size={19} />Salir</button>
      </aside>
      <div className="main">
        {me.ephemeral && <div className="paused-ribbon">Modo prueba gratis: sin disco. Cuando el servidor se duerme (15 min sin uso) se borran tareas, clientes, memoria y videos.</div>}
        {me.demo && <div className="demo-ribbon">MODO DEMO · DATOS DE DEMOSTRACIÓN, SEPARADOS DE PRODUCCIÓN</div>}
        {office?.paused && <div className="paused-ribbon"><Icon name="pause" size={16} />Automatizaciones en pausa general<button className="btn sm" onClick={() => go('ajustes')}>Ver</button></div>}
        <header className="topbar">
          {route.name !== 'oficina' && <h1>{R.title}</h1>}
          {route.name === 'oficina' && <div className="row" style={{ gap: 10 }}><span className="mobile-only"><Logo size={28} /></span><h1>Demian OS</h1></div>}
          <div className="grow" />
          <GlobalSearch ctx={ctx} />
          <button className="iconbtn" onClick={() => go('actividad')} aria-label="Notificaciones"><Icon name="bell" size={19} />{unread > 0 && <span className="badge red" style={{ position: 'absolute', top: -5, right: -5 }}>{unread}</span>}</button>
        </header>
        <div className="content" id="content">
          <View ctx={ctx} />
        </div>
      </div>
      <nav className="bottomnav">
        {mobile.map((k) => (
          <button key={k} className={route.name === k || (k === 'mas' && !mobile.includes(route.name)) ? 'active' : ''} onClick={() => go(k)}>
            <Icon name={ROUTES[k].icon} size={22} />{ROUTES[k].title.split(' ')[0]}
            {k === 'aprobaciones' && pending > 0 && <span className="badge dot">{pending}</span>}
          </button>
        ))}
      </nav>
      <button className="fab" onClick={() => setDirector({})}><Icon name="spark" size={20} stroke={2.2} />Instrucción al director</button>
      {director && <DirectorSheet init={director} me={me} onClose={() => setDirector(null)} onCreated={(id) => { setDirector(null); setInstruction(id); }} />}
      {agent && <AgentPanel slug={agent} ctx={ctx} onClose={() => setAgent(null)} />}
      {task && <TaskSheet id={task} ctx={ctx} onClose={() => setTask(null)} />}
      {deliverable && <DeliverableSheet id={deliverable} onClose={() => setDeliverable(null)} />}
      {instruction && <InstructionSheet id={instruction} ctx={ctx} onClose={() => setInstruction(null)} />}
      <div className="toasts">
        {live.toasts.map(({ id, ev }) => (
          <div key={id} className="toast" style={{ '--c': ev.level === 'error' ? 'var(--st-failed)' : ev.level === 'warning' ? 'var(--st-waiting)' : ev.level === 'success' ? 'var(--st-working)' : 'var(--accent)' }}
            onClick={() => (ev.type === 'approval.requested' ? go('aprobaciones') : ev.task_id ? setTask(ev.task_id) : ev.instruction_id ? setInstruction(ev.instruction_id) : null)}>
            {ev.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState(undefined);
  const load = () => api('/me').then(setMe).catch(() => setMe(null));
  useEffect(() => { load(); }, []);
  if (me === undefined) return <div className="login"><span className="spin" /></div>;
  if (!me) return <Login onDone={load} />;
  return (
    <ToastProvider>
      <LiveProvider>
        <Shell me={me} onLogout={async () => { await api('/auth/logout', { method: 'POST' }); setMe(null); }} />
      </LiveProvider>
    </ToastProvider>
  );
}
