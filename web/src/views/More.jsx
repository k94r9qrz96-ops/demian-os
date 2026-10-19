import { Icon } from '../icons.jsx';
import { go, api } from '../lib.jsx';

const ITEMS = [
  ['puesta', 'target', 'Puesta en marcha', 'Qué funciona, qué falta y para qué sirve cada paso'],
  ['conversaciones', 'chat', 'Conversaciones', 'WhatsApp vía Chatwoot, pausas y derivaciones'],
  ['seleccion', 'briefcase', 'Selección · Elite Hunters', 'Búsquedas, candidatos, entrevistas, permanencia'],
  ['memoria', 'brain', 'Empresas, clientes y memoria', 'Instrucciones, tono, restricciones, fotos reales'],
  ['actividad', 'bell', 'Actividad y notificaciones', 'Todo lo que pasó, en vivo'],
  ['integraciones', 'plug', 'Integraciones', 'Estado y prueba de cada conexión'],
  ['ajustes', 'gear', 'Ajustes y control', 'Pausa general, gasto, autonomía, WhatsApp'],
];

export function MoreView() {
  return (
    <div className="page">
      <div className="card" style={{ padding: '4px 14px' }}>
        <div className="list">
          {ITEMS.map(([k, icon, t, s]) => (
            <div key={k} className="li" onClick={() => go(k)}>
              <div className="iconbtn" style={{ pointerEvents: 'none' }}><Icon name={icon} size={19} /></div>
              <div className="min0"><div className="t">{t}</div><div className="s">{s}</div></div>
            </div>
          ))}
          <div className="li" onClick={async () => { await api('/auth/logout', { method: 'POST' }); location.reload(); }}>
            <div className="iconbtn" style={{ pointerEvents: 'none' }}><Icon name="logout" size={19} /></div>
            <div className="min0"><div className="t">Salir</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
