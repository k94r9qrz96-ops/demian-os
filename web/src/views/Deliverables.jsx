import { useCallback, useState } from 'react';
import { useApi, useLiveReload, ago, Markdown } from '../lib.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { Icon } from '../icons.jsx';

export function DeliverablesView({ ctx }) {
  const [kind, setKind] = useState('');
  const { data, reload } = useApi(`/deliverables${kind ? `?kind=${kind}` : ''}`, [kind]);
  const rel = useCallback(() => reload(), [reload]);
  useLiveReload(rel, (ev) => ev.type === 'deliverable.created');
  return (
    <div className="page">
      <div className="seg" style={{ marginBottom: 14 }}>
        {[['', 'Todos'], ['video', 'Videos'], ['markdown', 'Documentos']].map(([k, l]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>)}
      </div>
      {data?.length ? (
        <div className="grid2">
          {data.map((d) => (
            <div key={d.id} className="card" style={{ cursor: 'pointer', padding: d.kind === 'video' ? 0 : 16, overflow: 'hidden' }} onClick={() => ctx.openDeliverable(d.id)}>
              {d.kind === 'video' && <img src={`/api/deliverables/${d.id}/file?thumb=1`} alt="" style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', display: 'block', background: '#000' }} />}
              <div style={d.kind === 'video' ? { padding: 14 } : undefined}>
                <div className="row"><Icon name={d.kind === 'video' ? 'video' : 'doc'} size={18} /><b className="min0" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</b></div>
                <div className="small muted" style={{ marginTop: 6 }}>{d.kind === 'video' ? `${Number(d.meta.expected_seconds || 0).toFixed(1)} s · ${(d.size / 1e6).toFixed(1)} MB${d.meta.qa ? ` · QA ${d.meta.qa.ok ? '✅' : '❌'}` : ''}` : d.excerpt?.replace(/[#*_|>-]/g, ' ').slice(0, 120)}</div>
                <div className="tiny dim" style={{ marginTop: 6 }}>{ago(d.created_at)}{d.is_demo ? ' · demo' : ''}</div>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty"><b>Sin entregables</b>Los resultados de los agentes (reportes, propuestas, videos) aparecen acá.</div>}
    </div>
  );
}

export function DeliverableSheet({ id, onClose }) {
  const { data: d } = useApi(`/deliverables/${id}`, [id]);
  if (!d) return <Sheet title="Cargando…" onClose={onClose}><span className="spin" /></Sheet>;
  return (
    <Sheet onClose={onClose} title={d.title} subtitle={`${d.kind === 'video' ? 'Video exportado' : 'Documento'} · ${ago(d.created_at)}`}
      actions={d.kind === 'video' ? <a className="btn sm" href={`/api/deliverables/${d.id}/file?download=1`}><Icon name="upload" size={15} style={{ transform: 'rotate(180deg)' }} />Descargar</a> : <button className="btn sm" onClick={() => navigator.clipboard?.writeText(d.body || '')}>Copiar</button>}>
      {d.kind === 'video' ? (
        <div className="col">
          <video src={`/api/deliverables/${d.id}/file`} controls playsInline preload="metadata" poster={`/api/deliverables/${d.id}/file?thumb=1`} />
          <dl className="kv">
            <dt>Formato</dt><dd>{d.meta.width}×{d.meta.height} · H.264 + AAC · {Number(d.meta.expected_seconds).toFixed(1)} s</dd>
            <dt>Fotos reales</dt><dd>{(d.meta.photos || []).map((p) => `#${p}`).join(', ')}</dd>
            {d.meta.texts?.length > 0 && <><dt>Textos</dt><dd>{d.meta.texts.join(' · ')}</dd></>}
            <dt>Audio</dt><dd>{d.meta.audio}</dd>
            <dt>Huella</dt><dd className="mono">{d.sha256?.slice(0, 24)}…</dd>
          </dl>
          {d.meta.notes?.length > 0 && <div className="note">{d.meta.notes.join(' · ')}</div>}
          {d.meta.qa && <div className={d.meta.qa.ok ? 'okbox' : 'err'}><b>Control de calidad {d.meta.qa.ok ? 'aprobado' : 'con fallas'}</b>{d.meta.qa.checks.map((c) => <div key={c.name}>{c.ok ? '✅' : '❌'} {c.name}: {c.detail}</div>)}</div>}
        </div>
      ) : <Markdown text={d.body} />}
    </Sheet>
  );
}
