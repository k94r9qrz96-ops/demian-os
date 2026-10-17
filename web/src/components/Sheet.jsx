import { useEffect } from 'react';
import { Icon } from '../icons.jsx';

export function Sheet({ title, subtitle, icon, onClose, kind = 'drawer', children, actions }) {
  useEffect(() => {
    const f = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <section className={`sheet ${kind}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <div className="grab" />
        <header>
          {icon}
          <div className="min0">
            <div style={{ fontWeight: 650, fontSize: 17, lineHeight: 1.25 }}>{title}</div>
            {subtitle && <div className="small muted" style={{ marginTop: 2 }}>{subtitle}</div>}
          </div>
          {actions}
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        </header>
        <div className="body">{children}</div>
      </section>
    </>
  );
}
