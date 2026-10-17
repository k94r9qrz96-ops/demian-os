import { useEffect, useRef, useState } from 'react';
import { api, useApi, fmtDate, useToast } from '../lib.jsx';
import { Icon } from '../icons.jsx';

const KINDS = [['instruction', 'Instrucción'], ['tone', 'Tono'], ['restriction', 'Restricción'], ['fact', 'Antecedente'], ['document', 'Documento'], ['public_info', 'Info pública (atención WhatsApp)']];

export function MemoryView({ ctx }) {
  const { data: companies, reload: reloadC } = useApi('/companies');
  const [company, setCompany] = useState(ctx.params.company ? Number(ctx.params.company) : null);
  const [client, setClient] = useState(ctx.params.client ? Number(ctx.params.client) : null);
  const toast = useToast();
  useEffect(() => { if (!company && companies?.length) setCompany(companies[0].id); }, [companies, company]);
  const comp = companies?.find((c) => c.id === company);
  const scope = `company_id=${company}${client ? `&client_id=${client}` : ''}`;
  const { data: items, reload } = useApi(company ? `/memory?${scope}` : null, [scope]);
  const { data: files, reload: reloadF } = useApi(company ? `/files?${scope}` : null, [scope]);
  const [draft, setDraft] = useState({ kind: 'instruction', title: '', content: '', source: '' });
  const [editing, setEditing] = useState(null);
  const [newClient, setNewClient] = useState(null);
  const [sel, setSel] = useState([]);
  const [license, setLicense] = useState('');
  const fileRef = useRef();
  const audioRef = useRef();
  const run = async (fn, msg) => { try { await fn(); if (msg) toast(msg, 'ok'); } catch (e) { toast(e.message, 'error'); } };

  const upload = (list, licenseNote) => run(async () => {
    const form = new FormData();
    form.append('company_id', company);
    if (client) form.append('client_id', client);
    if (licenseNote) form.append('license_note', licenseNote);
    for (const f of list) form.append('file', f);
    await api('/files', { method: 'POST', form });
    reloadF();
  }, 'Archivos guardados');

  if (!companies) return <div className="page"><span className="spin" /></div>;
  const photos = (files || []).filter((f) => f.mime.startsWith('image/'));
  const others = (files || []).filter((f) => !f.mime.startsWith('image/'));
  return (
    <div className="page">
      <div className="chips" style={{ marginBottom: 10 }}>
        {companies.map((c) => <button key={c.id} className={`chip ${company === c.id ? 'on' : ''}`} onClick={() => { setCompany(c.id); setClient(null); setSel([]); }}><span style={{ width: 8, height: 8, borderRadius: 3, background: c.color, display: 'inline-block' }} />{c.name}</button>)}
      </div>
      {comp && (
        <>
          <div className="muted small" style={{ marginBottom: 10 }}>{comp.description}</div>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            <button className={`chip ${!client ? 'on' : ''}`} onClick={() => { setClient(null); setSel([]); }}>Nivel empresa</button>
            {comp.clients.map((c) => <button key={c.id} className={`chip ${client === c.id ? 'on' : ''}`} onClick={() => { setClient(c.id); setSel([]); }}>{c.name}{c.is_demo ? ' · demo' : ''}</button>)}
            {comp.slug !== 'elite-hunters' && <button className="chip" onClick={() => setNewClient({ name: '', handle: '' })}><Icon name="plus" size={14} />Cliente</button>}
          </div>
          {newClient && (
            <div className="card row wrap" style={{ marginTop: 10 }}>
              <input placeholder="Nombre del cliente (real)" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} style={{ flex: 2 }} />
              <input placeholder="@usuario (opcional)" value={newClient.handle} onChange={(e) => setNewClient({ ...newClient, handle: e.target.value })} style={{ flex: 1 }} />
              <button className="btn primary" disabled={!newClient.name} onClick={() => run(async () => { const c = await api('/clients', { method: 'POST', body: { company_id: company, ...newClient } }); setNewClient(null); await reloadC(); setClient(c.id); }, 'Cliente creado')}>Crear</button>
              <button className="btn ghost" onClick={() => setNewClient(null)}>Cancelar</button>
            </div>
          )}

          <div className="sectionTitle">Memoria {client ? 'del cliente' : 'de la empresa'} · {items?.length || 0}</div>
          <div className="tiny dim" style={{ marginBottom: 8 }}>{client ? 'Solo la ven las tareas de este cliente (más la memoria general de la empresa).' : 'La ven todas las tareas de la empresa. Cada cliente tiene su memoria separada.'}</div>
          {(items || []).map((m) => (
            <div key={m.id} className="card">
              {editing?.id === m.id ? (
                <div className="col">
                  <select value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  <textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
                  <div className="row"><button className="btn primary sm" onClick={() => run(async () => { await api(`/memory/${m.id}`, { method: 'PATCH', body: { kind: editing.kind, content: editing.content } }); setEditing(null); reload(); }, 'Corregido')}>Guardar</button><button className="btn ghost sm" onClick={() => setEditing(null)}>Cancelar</button></div>
                </div>
              ) : (
                <>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="min0"><span className="chip" style={{ cursor: 'default', padding: '2px 8px', fontSize: 11.5 }}>{KINDS.find((k) => k[0] === m.kind)?.[1] || m.kind}</span> {m.title && <b>{m.title}</b>}</div>
                    <div className="row" style={{ gap: 4 }}>
                      <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={() => setEditing(m)} aria-label="Corregir"><Icon name="edit" size={15} /></button>
                      <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={() => confirm('¿Eliminar definitivamente?') && run(async () => { await api(`/memory/${m.id}`, { method: 'DELETE' }); reload(); }, 'Eliminado')} aria-label="Eliminar"><Icon name="trash" size={15} /></button>
                    </div>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{m.content}</div>
                  <div className="tiny dim" style={{ marginTop: 6 }}>Fuente: {m.source} · {m.source_date}</div>
                </>
              )}
            </div>
          ))}
          <div className="card col" style={{ marginTop: 10 }}>
            <div className="row"><select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} style={{ width: 'auto' }}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><input placeholder="Título (opcional)" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
            <textarea placeholder="Ej.: tono, restricciones, precios confirmados, antecedentes…" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
            <input placeholder="Fuente (quién o dónde lo confirmó)" value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} />
            <button className="btn" disabled={!draft.content.trim()} onClick={() => run(async () => { await api('/memory', { method: 'POST', body: { company_id: company, client_id: client, ...draft, source: draft.source || undefined } }); setDraft({ kind: draft.kind, title: '', content: '', source: '' }); reload(); }, 'Guardado en memoria')}>Agregar a la memoria</button>
          </div>

          <div className="sectionTitle">Fotos reales · {photos.length}</div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload([...e.target.files])} />
          <div className="drop" onClick={() => fileRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload([...e.dataTransfer.files]); }}>
            <Icon name="upload" /> <div>Subir fotos {client ? 'del cliente' : 'de la empresa'}</div><div className="tiny dim">Se usan tal cual: sin inventar ni deformar productos, platos, espacios o personas.</div>
          </div>
          {photos.length > 0 && (
            <>
              <div className="thumbs" style={{ marginTop: 10 }}>
                {photos.map((f) => (
                  <div key={f.id} className={`th ${sel.includes(f.id) ? 'sel' : ''}`} onClick={() => setSel((s) => (s.includes(f.id) ? s.filter((x) => x !== f.id) : [...s, f.id]))}>
                    <img src={`/api/files/${f.id}/raw`} alt={f.original_name} loading="lazy" />
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar foto?')) run(async () => { await api(`/files/${f.id}`, { method: 'DELETE' }); reloadF(); }); }} aria-label="Eliminar">×</button>
                  </div>
                ))}
              </div>
              {client && (
                <div className="row wrap" style={{ marginTop: 10 }}>
                  <span className="small muted">{sel.length ? `${sel.length} seleccionadas (en orden de toque)` : 'Tocá fotos para elegir orden'}</span>
                  <button className="btn sm primary" onClick={() => run(async () => { const r = await api('/instructions', { method: 'POST', body: { text: 'Exportá un reel con estas fotos', company_id: company, client_id: client, attachments: sel } }); ctx.openInstruction(r.id); }, 'Reel en producción')}><Icon name="video" size={15} />Reel rápido{sel.length ? ` con ${sel.length}` : ''}</button>
                  <button className="btn sm" onClick={() => ctx.openDirector({ text: 'Prepará la próxima semana de contenido de este cliente con sus fotos', company_id: company, client_id: client })}>Semana de contenido</button>
                </div>
              )}
            </>
          )}
          <div className="sectionTitle">Audio autorizado y documentos · {others.length}</div>
          <div className="row wrap">
            <input placeholder="Licencia del audio (ej.: comprado en X, licencia Y)" value={license} onChange={(e) => setLicense(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
            <input ref={audioRef} type="file" accept="audio/*,application/pdf,text/*" hidden onChange={(e) => upload([...e.target.files], license)} />
            <button className="btn sm" onClick={() => audioRef.current.click()}>Subir archivo</button>
          </div>
          <div className="tiny dim" style={{ marginTop: 6 }}>Un audio solo se usa en reels si tiene nota de licencia. Sin audio autorizado, el reel usa una pista original generada por el sistema.</div>
          <div className="list" style={{ marginTop: 6 }}>{others.map((f) => <div key={f.id} className="li"><Icon name="doc" /><div className="min0"><div className="t">{f.original_name}</div><div className="s">{f.mime} · {(f.size / 1024).toFixed(0)} KB{f.license_note ? ` · licencia: ${f.license_note}` : ''} · {fmtDate(f.created_at)}</div></div></div>)}</div>
        </>
      )}
    </div>
  );
}
