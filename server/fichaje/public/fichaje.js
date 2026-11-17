// Fichaje · interfaz pública (sin dependencias). Todo el contenido dinámico se inserta como texto.
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v; else if (k === 'style') n.setAttribute('style', v);
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v !== undefined && v !== null) n.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
    return n;
  };
  const show = (id, on = true) => { const n = typeof id === 'string' ? $(id) : id; if (n) n.classList.toggle('hide', !on); };
  async function api(method, url, body, headers = {}) {
    const r = await fetch(url, { method, headers: { 'x-requested-with': 'fichaje', ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
    let data = {}; try { data = await r.json(); } catch {}
    if (!r.ok) throw Object.assign(new Error(data.error || `Error ${r.status}`), { status: r.status });
    return data;
  }
  const copy = async (text, btn) => {
    try { await navigator.clipboard.writeText(text); } catch { const t = el('textarea', {}, text); document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
    if (btn) { const o = btn.textContent; btn.textContent = '¡Copiado!'; setTimeout(() => (btn.textContent = o), 1400); }
  };
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) copy($('#' + b.dataset.copy).value, b); });
  const vClass = (v) => ({ 'Fichar ya': 'v-fichar', Entrevistar: 'v-entrevistar', 'En reserva': 'v-reserva', Descartado: 'v-descartado' })[v] || '';
  const vColor = (s) => (s >= 75 ? 'var(--lime)' : s >= 55 ? 'var(--ok)' : s >= 35 ? 'var(--warn)' : 'var(--bad)');
  const wa = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;

  // ---------- Landing ----------
  function landing() {
    const f = $('#vacForm');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#vacBtn'); const err = $('#vacErr'); show(err, false);
      const body = Object.fromEntries(new FormData(f).entries());
      if (!body.title || !body.company_name || !body.description) { err.textContent = 'Completá puesto, empresa y descripción.'; return show(err); }
      btn.disabled = true; btn.textContent = 'Tu entrevistador se está preparando…';
      try {
        const r = await api('POST', '/fichaje/api/vacancies', body);
        $('#doneTitle').textContent = `¡${body.title} ya está fichando!`;
        $('#doneApply').value = r.apply_url; $('#donePanel').value = r.panel_url;
        $('#doneOpen').href = r.panel_url;
        $('#doneShare').href = wa(`Estamos buscando ${body.title} en ${body.company_name}. Postulate en 3 minutos, sin CV: ${r.apply_url}`);
        try { localStorage.setItem('fichaje_last_panel', r.panel_url); } catch {}
        show(f, false); show('#vacDone');
        $('#crear').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (x) { err.textContent = x.message; show(err); }
      finally { btn.disabled = false; btn.textContent = 'Crear mi vacante con entrevistador →'; }
    });
  }

  // ---------- Postulación ----------
  async function apply() {
    const slug = location.pathname.split('/')[2];
    let v;
    try { v = await api('GET', `/fichaje/api/v/${slug}`); } catch (x) { $('#loading').textContent = x.message; return; }
    show('#loading', false); show('#intro');
    $('#company').textContent = v.company_name; $('#headline').textContent = v.headline || `${v.company_name} busca ${v.title}`;
    $('#meta').textContent = [v.title, v.location, v.salary].filter(Boolean).join(' · ');
    $('#aviso').textContent = v.aviso || '';
    if (v.closed) return show('#closed');
    const answers = {}; let name = ''; let contact = '';
    const steps = ['you', ...v.questions.map((q) => q), 'send'];
    let i = 0;
    const form = $('#applyForm'); const body = $('#stepBody'); const err = $('#applyErr');
    show(form);
    const render = () => {
      show(err, false);
      $('#bar').style.width = `${Math.round((i / (steps.length - 1)) * 100)}%`;
      $('#stepLabel').textContent = i === 0 ? 'Empecemos' : i === steps.length - 1 ? 'Último paso' : `Pregunta ${i} de ${v.questions.length}`;
      $('#backBtn').style.visibility = i === 0 ? 'hidden' : 'visible';
      $('#nextBtn').textContent = i === steps.length - 1 ? 'Enviar postulación ✓' : 'Siguiente →';
      body.replaceChildren();
      const s = steps[i];
      if (s === 'you') {
        body.append(el('div', { class: 'qtext' }, '¿Cómo te llamás y dónde te contactamos?'),
          el('label', { for: 'a-name' }, 'Nombre y apellido'), el('input', { id: 'a-name', autocomplete: 'name', maxlength: '120', value: name }),
          el('label', { for: 'a-contact' }, 'WhatsApp o email'), el('input', { id: 'a-contact', autocomplete: 'tel', maxlength: '160', value: contact }));
        setTimeout(() => $('#a-name').focus(), 30);
      } else if (s === 'send') {
        body.append(el('div', { class: 'qtext' }, '¡Listo! ¿Enviamos tu postulación?'), el('p', { class: 'mute' }, `Vas a postularte a ${v.title} en ${v.company_name} como ${name} (${contact}).`));
      } else if (s.type === 'knockout') {
        body.append(el('div', { class: 'qtext' }, s.text), el('div', { class: 'opts' }, ['Sí', 'No'].map((o) => el('button', { type: 'button', class: `opt${answers[s.id] === o ? ' on' : ''}`, onclick: () => { answers[s.id] = o; next(); } }, o))));
      } else if (s.type === 'choice') {
        body.append(el('div', { class: 'qtext' }, s.text), el('div', { class: 'opts' }, (s.options || []).map((o) => el('button', { type: 'button', class: `opt${answers[s.id] === o ? ' on' : ''}`, onclick: () => { answers[s.id] = o; next(); } }, o))));
      } else {
        const ta = el('textarea', { id: 'a-open', maxlength: '2000', placeholder: 'Escribí tu respuesta. Los ejemplos concretos suman.' });
        ta.value = answers[s.id] || '';
        body.append(el('div', { class: 'qtext' }, s.text), ta);
        setTimeout(() => ta.focus(), 30);
      }
    };
    const fail = (m) => { err.textContent = m; show(err); };
    const next = async () => {
      const s = steps[i];
      if (s === 'you') {
        name = $('#a-name').value.trim(); contact = $('#a-contact').value.trim();
        if (name.length < 2) return fail('Escribí tu nombre.');
        if (!/@|\d{6,}/.test(contact.replace(/[\s()-]/g, ''))) return fail('Dejá un WhatsApp o email válido.');
      } else if (s === 'send') {
        const btn = $('#nextBtn'); btn.disabled = true; btn.textContent = 'Enviando…';
        try {
          await api('POST', `/fichaje/api/v/${slug}/apply`, { name, contact, answers, website: form.website.value });
          show(form, false); show('#intro', false); show('#sent'); window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (x) { fail(x.message); } finally { btn.disabled = false; if (!form.classList.contains('hide')) btn.textContent = 'Enviar postulación ✓'; }
        return;
      } else if (s.type === 'open') {
        answers[s.id] = $('#a-open').value.trim();
        if (answers[s.id].length < 2) return fail('Respondé para seguir.');
      } else if (!answers[s.id]) return fail('Elegí una opción.');
      i++; render();
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); next(); });
    $('#backBtn').addEventListener('click', () => { if (steps[i]?.type === 'open') answers[steps[i].id] = $('#a-open').value; i = Math.max(0, i - 1); render(); });
    render();
  }

  // ---------- Panel de la empresa ----------
  async function panel() {
    const slug = location.pathname.split('/')[2];
    const key = new URLSearchParams(location.hash.slice(1)).get('k') || '';
    let kitTab = 'aviso'; let first = true;
    const load = async () => {
      let d;
      try { d = await api('GET', `/fichaje/api/v/${slug}/panel`, null, { 'x-fichaje-key': key }); }
      catch (x) { if (first) { show('#loading', false); show('#denied'); } return; }
      show('#loading', false); show('#panel');
      const v = d.vacancy; const o = d.offer;
      $('#planBadge').textContent = v.plan === 'free' ? 'Plan gratis' : v.plan === 'pro' ? 'Fichaje Pro' : 'Desbloqueada';
      $('#planBadge').className = `badge${v.plan === 'free' ? '' : ' lime'}`;
      $('#pTitle').textContent = `${v.title} · ${v.company_name}`;
      $('#pMeta').textContent = [v.location, v.salary, v.closed ? 'Búsqueda cerrada' : 'Recibiendo postulaciones'].filter(Boolean).join(' · ');
      $('#sTotal').textContent = d.stats.total; $('#sViews').textContent = v.views;
      $('#sHot').textContent = d.candidates.filter((c) => c.verdict === 'Fichar ya').length;
      $('#sConv').textContent = v.views ? `${Math.min(100, Math.round((d.stats.total / v.views) * 100))}%` : '–';
      $('#applyUrl').value = d.apply_url;
      $('#waShare').href = wa(`Estamos buscando ${v.title} en ${v.company_name}. Postulate en 3 minutos, sin CV: ${d.apply_url}`);
      $('#liShare').href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(d.apply_url)}`;
      $('#closeBtn').textContent = v.closed ? 'Reabrir búsqueda' : 'Cerrar búsqueda';
      const csv = $('#csvBtn'); show(csv, v.plan !== 'free'); csv.href = `/fichaje/api/v/${slug}/export.csv?k=${encodeURIComponent(key)}`;

      // upsell
      const paid = v.plan !== 'free';
      const setPay = (a, url, label) => { if (url) { a.href = url; a.textContent = label; show(a); } else show(a, false); };
      setPay($('#payBtn'), o.pay_url, `Desbloquear todo · ${o.price}`);
      setPay($('#proBtn'), o.pro_pay_url, `Pro con headhunter · ${o.pro_price}`);
      setPay($('#proBtn2'), o.pro_pay_url, `Quiero Pro · ${o.pro_price}`);
      if (!paid && (d.stats.locked > 0 || d.stats.total >= o.free_candidates - 1)) {
        $('#upTitle').textContent = d.stats.locked
          ? `Hay ${d.stats.locked} candidato${d.stats.locked > 1 ? 's' : ''} más esperando${d.stats.hot_locked ? ` · ${d.stats.hot_locked} para fichar ya` : ''}`
          : `Tu plan gratis muestra ${o.free_candidates} candidatos`;
        $('#upText').textContent = `Desbloqueá la vacante por ${o.price} (pago único) y mirá nombre, contacto, respuestas y razones de todos, sin límite, y exportalos a Excel.`;
        show('#payNote', !!o.pay_url || !!o.pro_pay_url);
        show('#upsell');
      } else show('#upsell', false);

      // ranking
      const box = $('#cands'); box.replaceChildren();
      show('#empty', d.candidates.length === 0);
      for (const c of d.candidates) {
        const kitQ = Object.fromEntries((d.kit.questions || []).map((q) => [q.id, q.text]));
        box.append(el('div', { class: `cand${c.locked ? ' locked' : ''}` },
          el('div', { class: 'ring', style: `--p:${c.score};--c:${vColor(c.score)}` }, el('span', {}, c.score)),
          el('div', {},
            el('div', {}, el('b', { class: 'who' }, c.name), el('span', { class: `chip ${vClass(c.verdict)}` }, c.verdict)),
            el('div', { class: 'mute small who' }, c.contact),
            c.locked ? el('p', { class: 'mute small', style: 'margin:6px 0 0' }, '🔒 Desbloqueá la vacante para ver a este candidato.') : [
              c.reasons?.length ? el('ul', {}, c.reasons.map((r) => el('li', {}, r))) : null,
              c.red_flags?.length ? el('ul', { class: 'flags' }, c.red_flags.map((r) => el('li', {}, '⚠ ' + r))) : null,
              el('details', {}, el('summary', {}, 'Ver respuestas'), Object.entries(c.answers || {}).map(([k, a]) => el('p', { class: 'qa' }, el('b', {}, kitQ[k] || k), a))),
            ])));
      }

      // kit
      const kit = d.kit; const tabs = { aviso: 'Aviso', reel: 'Reel 15 s', posts: 'Posts', preguntas: 'Preguntas' };
      const tb = $('#kitTabs'); tb.replaceChildren(...Object.entries(tabs).map(([k, l]) => el('button', { type: 'button', class: k === kitTab ? 'on' : '', onclick: () => { kitTab = k; load(); } }, l)));
      const block = (title, text) => { const b = el('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, 'Copiar'); b.addEventListener('click', () => copy(text, b)); return el('div', {}, title ? el('b', {}, title) : null, el('pre', { class: 'copy' }, text), b, el('div', { style: 'height:14px' })); };
      const kb = $('#kitBody'); kb.replaceChildren();
      if (kitTab === 'aviso') kb.append(block(null, `${kit.aviso}\n\n👉 Postulate acá: ${d.apply_url}`));
      if (kitTab === 'reel') kb.append(el('p', { class: 'mute small' }, 'Grabalo con el celular en vertical o pasáselo a tu equipo de contenido.'), block(null, (kit.reel || []).map((s) => `[${s.t}]\nEn pantalla: ${s.screen}\nVoz: ${s.voice}`).join('\n\n')));
      if (kitTab === 'posts') for (const [k, t] of Object.entries(kit.posts || {})) kb.append(block(k[0].toUpperCase() + k.slice(1), `${t}\n${d.apply_url}`));
      if (kitTab === 'preguntas') kb.append(el('ol', {}, (kit.questions || []).map((q) => el('li', {}, q.text, ' ', el('span', { class: 'mute small' }, q.type === 'knockout' ? '(excluyente)' : q.type === 'choice' ? '(opciones)' : '(abierta)')))),
        el('b', {}, 'Rúbrica'), el('ul', {}, (kit.rubric || []).map((r) => el('li', { class: 'mute' }, r))));
      first = false;
    };
    $('#closeBtn').addEventListener('click', async () => { await api('POST', `/fichaje/api/v/${slug}/close`, {}, { 'x-fichaje-key': key }); load(); });
    await load();
    setInterval(() => { if (!document.hidden) load(); }, 20000);
  }

  // ---------- Caja del dueño ----------
  async function admin() {
    const call = async (method, url, body) => {
      const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'x-requested-with': 'demian-os', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(d.error || r.status), { status: r.status });
      return d;
    };
    const load = async () => {
      let d;
      try { d = await call('GET', '/fichaje/api/admin/overview'); } catch (x) { show('#loading', false); if (x.status === 401) show('#login'); else $('#loading').textContent = x.message; return; }
      show('#loading', false); show('#adm');
      const t = d.totals;
      $('#tVac').textContent = t.vacancies; $('#tUp').textContent = t.ready_to_upsell; $('#tPaid').textContent = t.paid + t.pro; $('#tCand').textContent = t.candidates;
      const w = $('#cfgWarn');
      if (!d.offer.pay_url_configured && !d.offer.whatsapp_configured) { w.textContent = 'Para cobrar: cargá FICHAJE_PAY_URL (link de pago de Mercado Pago o Stripe) o FICHAJE_WHATSAPP (tu número) en las variables del servidor. Sin eso, el botón de desbloquear no aparece.'; show(w); } else show(w, false);
      const rows = $('#rows'); rows.replaceChildren();
      for (const v of d.vacancies) {
        const sel = el('select', { 'aria-label': 'Plan' }, ['free', 'fichaje', 'pro'].map((p) => { const o = el('option', { value: p }, p === 'free' ? 'Gratis' : p === 'fichaje' ? `Pagada (${d.offer.price})` : `Pro (${d.offer.pro_price})`); if (p === v.plan) o.selected = true; return o; }));
        sel.addEventListener('change', async () => { try { await call('POST', `/fichaje/api/admin/vacancies/${v.id}/plan`, { plan: sel.value }); load(); } catch (x) { alert(x.message); } });
        const open = el('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, 'Panel');
        open.addEventListener('click', async () => { const r = await call('GET', `/fichaje/api/admin/vacancies/${v.id}/panel-link`); window.open(r.panel_url, '_blank', 'noopener'); });
        const phone = (v.contact_whatsapp || '').replace(/[^\d]/g, '');
        const contact = phone
          ? el('a', { href: `https://wa.me/${phone}?text=${encodeURIComponent(`Hola! Soy de Fichaje. Tu vacante "${v.title}" ya tiene ${v.candidates} candidatos${v.hot ? `, ${v.hot} para fichar ya` : ''}. ¿Querés que te la desbloquee?`)}`, target: '_blank', rel: 'noopener' }, v.contact_whatsapp)
          : el('span', {}, v.contact_email || '–');
        rows.append(el('tr', {},
          el('td', {}, el('b', {}, v.title), el('div', { class: 'mute small' }, `${v.company_name} · ${v.created_at.slice(0, 10)} · ${v.views} visitas${v.closed_at ? ' · cerrada' : ''}`)),
          el('td', {}, contact, v.contact_whatsapp && v.contact_email ? el('div', { class: 'mute small' }, v.contact_email) : null),
          el('td', {}, String(v.candidates), v.hot ? el('span', { class: 'chip v-fichar' }, `${v.hot} 🔥`) : null),
          el('td', {}, sel), el('td', {}, open)));
      }
      if (!d.vacancies.length) rows.append(el('tr', {}, el('td', { colspan: '5', class: 'mute' }, 'Todavía no hay vacantes. Compartí /fichaje con tus clientes.')));
    };
    await load();
    setInterval(() => { if (!document.hidden) load(); }, 30000);
  }

  ({ landing, apply, panel, admin })[document.body.dataset.page]?.();
})();
