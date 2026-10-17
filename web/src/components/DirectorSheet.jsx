import { useEffect, useRef, useState } from 'react';
import { api, useApi, useToast } from '../lib.jsx';
import { Sheet } from './Sheet.jsx';
import { Icon } from '../icons.jsx';

const SUGGESTIONS = [
  'Prepará la próxima semana de contenido de este cliente con sus fotos',
  'Revisá estas conversaciones y preparame los seguimientos pendientes',
  'Organizá las entrevistas de esta búsqueda y mostrame qué falta',
  'Buscá posibles clientes de Rushy y prepará propuestas personalizadas con evidencia',
  '¿Qué tengo pendiente hoy? Prioridades y bloqueos',
];

export function DirectorSheet({ init, me, onClose, onCreated }) {
  const { data: companies } = useApi('/companies');
  const [text, setText] = useState(init.text || '');
  const [company, setCompany] = useState(init.company_id || '');
  const [client, setClient] = useState(init.client_id || '');
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const toast = useToast();
  const comp = companies?.find((c) => String(c.id) === String(company));
  const isEH = comp?.slug === 'elite-hunters';
  const { data: searches } = useApi(isEH ? '/recruiting/searches' : null, [isEH]);
  useEffect(() => { setClient(''); }, [company]);

  const upload = async (list) => {
    if (!company) { toast('Elegí la empresa (y el cliente) antes de adjuntar', 'error'); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('company_id', company);
      if (client) form.append('client_id', client);
      for (const f of list) form.append('file', f);
      const saved = await api('/files', { method: 'POST', form });
      setFiles((x) => [...x, ...saved]);
    } catch (e) { toast(e.message, 'error'); } finally { setUploading(false); }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api('/instructions', { method: 'POST', body: { text, company_id: company || null, client_id: client || null, attachments: files.map((f) => f.id), params: search ? { search_id: Number(search) } : {} } });
      toast(`Instrucción #${r.id} enviada al director`, 'ok');
      onCreated(r.id);
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Sheet kind="modal" onClose={onClose} title="Instrucción al director" subtitle="Interpreta, reparte tareas, ejecuta lo permitido y te muestra qué necesita tu aprobación"
      icon={<div className="iconbtn" style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 0 }}><Icon name="spark" /></div>}>
      <div className="col" style={{ gap: 12 }}>
        <textarea autoFocus placeholder="¿Qué necesitás?" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 110, fontSize: 16 }} />
        {!text && <div className="chips" style={{ flexWrap: 'wrap' }}>{SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => setText(s)}>{s}</button>)}</div>}
        <div>
          <div className="small muted" style={{ marginBottom: 6 }}>Empresa</div>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            <button className={`chip ${!company ? 'on' : ''}`} onClick={() => setCompany('')}>Detectar automáticamente</button>
            {(companies || []).map((c) => <button key={c.id} className={`chip ${String(company) === String(c.id) ? 'on' : ''}`} onClick={() => setCompany(c.id)}><span style={{ width: 8, height: 8, borderRadius: 3, background: c.color, display: 'inline-block' }} />{c.name}</button>)}
          </div>
        </div>
        {comp && comp.slug !== 'elite-hunters' && (
          <label className="f">Cliente
            <select value={client} onChange={(e) => setClient(e.target.value)}>
              <option value="">{comp.clients.length ? 'Sin cliente (nivel empresa)' : 'No hay clientes cargados'}</option>
              {comp.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        {isEH && (
          <label className="f">Búsqueda (opcional)
            <select value={search} onChange={(e) => setSearch(e.target.value)}>
              <option value="">Detectar por el texto</option>
              {(searches || []).map((s) => <option key={s.id} value={s.id}>#{s.id} {s.role_title} · {s.hiring_company}</option>)}
            </select>
          </label>
        )}
        <div>
          <input ref={fileRef} type="file" multiple accept="image/*,audio/*,video/*,application/pdf" hidden onChange={(e) => upload([...e.target.files])} />
          <div className="row wrap">
            <button className="btn sm" onClick={() => fileRef.current.click()} disabled={uploading}><Icon name="clip" size={16} />{uploading ? 'Subiendo…' : 'Adjuntar fotos o archivos'}</button>
            {files.map((f) => <span key={f.id} className="chip on" style={{ cursor: 'default' }}>{f.original_name}</span>)}
          </div>
          {files.length > 0 && <div className="tiny dim" style={{ marginTop: 6 }}>Se guardan en {comp?.name}{client ? ' · cliente elegido' : ''}. Las fotos reales no se alteran.</div>}
        </div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <span className="tiny dim">{me.llm === 'real' ? 'Claude conectado' : 'Sin Claude: funcionan los pedidos frecuentes; los libres quedan bloqueados con aviso'}</span>
          <button className="btn primary" disabled={!text.trim() || busy} onClick={submit}>{busy ? <span className="spin" /> : <><Icon name="send" size={17} />Enviar</>}</button>
        </div>
      </div>
    </Sheet>
  );
}
