"use client";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Img } from "./Img";
import { EMPTY, STEP_COUNT, TYPE_LABEL, buildMessage, validateStep, whenText, type PlannerData, type TripType } from "@/lib/planner";
import { waLink } from "@/lib/site";
import { track } from "@/lib/analytics";

const KEY = "beloti-planner-v1";

const TYPES: { id: TripType; img: string; hint: string }[] = [
  { id: "praia", img: "praias-rio", hint: "Mar, sol e descanso" },
  { id: "aventura", img: "passeios", hint: "Trilhas e natureza" },
  { id: "cultura", img: "europa-amalfi", hint: "História e gastronomia" },
  { id: "cruzeiro", img: "cruise-poster", hint: "O mundo pelo mar" },
  { id: "familia", img: "maldivas", hint: "Para todas as idades" },
  { id: "romantica", img: "sunset-d-poster", hint: "Lua de mel e datas especiais" },
  { id: "corporativa", img: "corporativo", hint: "Trabalho e eventos" },
];
const DEST_CHIPS = ["Praias", "Europa", "Dubai", "África", "Ásia", "Ecoturismo", "Nordeste", "Caribe"];
const ORIGINS = ["São Paulo", "São Bernardo do Campo", "Santo André", "São Caetano do Sul", "Campinas", "Rio de Janeiro", "Belo Horizonte", "Curitiba"];
const BUDGETS = ["Até R$ 5 mil", "R$ 5 mil a R$ 10 mil", "R$ 10 mil a R$ 20 mil", "R$ 20 mil a R$ 40 mil", "Acima de R$ 40 mil", "Prefiro conversar"];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const TITLES = [
  "Que tipo de viagem você imagina?",
  "Para onde você quer ir?",
  "De onde você vai sair?",
  "Quando pretende viajar?",
  "Quem vai com você?",
  "Tem um orçamento em mente?",
  "Como falamos com você?",
];

/** Sem ano escolhido, assume a próxima ocorrência do mês (nunca um mês que já passou). */
function nextYearFor(mm: string): number {
  const now = new Date();
  return Number(mm) < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
}

function Stepper({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-ocean/10">
      <span className="font-semibold" id={`st-${label}`}>{label}</span>
      <div className="flex items-center gap-4" role="group" aria-labelledby={`st-${label}`}>
        <button type="button" className="h-11 w-11 rounded-full text-xl ring-1 ring-ocean/20 transition hover:bg-ocean hover:text-sand disabled:opacity-30" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Diminuir ${label.toLowerCase()}`}>−</button>
        <output className="w-6 text-center text-xl font-bold" aria-live="polite">{value}</output>
        <button type="button" className="h-11 w-11 rounded-full text-xl ring-1 ring-ocean/20 transition hover:bg-ocean hover:text-sand disabled:opacity-30" onClick={() => onChange(Math.min(20, value + 1))} disabled={value >= 20} aria-label={`Aumentar ${label.toLowerCase()}`}>+</button>
      </div>
    </div>
  );
}

export function Planner() {
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [d, setD] = useState<PlannerData>(EMPTY);
  const [step, setStep] = useState(1); // 1..7, 8 = resumo
  const [error, setError] = useState<string | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [started, setStarted] = useState(false);
  const dir = useRef(1);
  const firstRender = useRef(true);

  // restaura o progresso da sessão (sessionStorage: some ao fechar a aba)
  useEffect(() => {
    const y = new Date().getFullYear();
    // ano atual e progresso salvo só existem no cliente (evita divergência de hidratação)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setYears([y, y + 1, y + 2]);
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setD({ ...EMPTY, ...saved.d, consent: false });
        setStep(Math.min(Math.max(1, saved.step || 1), STEP_COUNT));
      }
    } catch { /* sem armazenamento: segue normalmente */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify({ d: { ...d, consent: false }, step: Math.min(step, STEP_COUNT) })); } catch { /* ignore */ }
  }, [d, step]);

  const set = <K extends keyof PlannerData>(k: K, v: PlannerData[K]) => {
    setD((p) => ({ ...p, [k]: v }));
    setError(null);
    if (!started) { setStarted(true); track("trip_planner_start"); }
  };

  useGSAP(
    () => {
      if (firstRender.current) { firstRender.current = false; return; }
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) {
        gsap.fromTo(panel.current, { opacity: 0, x: 48 * dir.current, filter: "blur(6px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.7, ease: "expo.out" });
        gsap.fromTo(".pl-item", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.04, ease: "power3.out", delay: 0.05 });
      }
      heading.current?.focus({ preventScroll: true });
    },
    { scope: root, dependencies: [step] }
  );

  const next = () => {
    const err = validateStep(step, d);
    if (err) { setError(err); return; }
    track("trip_planner_step", { step });
    dir.current = 1;
    setStep((s) => Math.min(s + 1, STEP_COUNT + 1));
    if (step === STEP_COUNT) track("trip_planner_complete", { type: d.type });
  };
  const back = () => { dir.current = -1; setError(null); setStep((s) => Math.max(1, s - 1)); };

  // link <a> real (e não window.open): funciona também em visualizadores que bloqueiam pop-ups
  const sendLink = useRef<HTMLAnchorElement>(null);
  const send = () => sendLink.current?.click();
  const reset = () => { setD(EMPTY); dir.current = -1; setStep(1); try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } };

  const [year, month] = d.month ? d.month.split("-") : ["", ""];
  const progress = Math.min(step - 1, STEP_COUNT) / STEP_COUNT;
  const chip = (on: boolean) =>
    `pl-item rounded-full px-4 py-2.5 text-sm font-semibold ring-1 transition-colors duration-300 ${on ? "bg-ocean text-sand ring-ocean" : "bg-white ring-ocean/15 hover:ring-ocean/50"}`;

  return (
    <section id="planejar" ref={root} className="relative bg-sand-2 text-ocean" aria-labelledby="pl-title">
      <div className="gutter mx-auto grid max-w-[1400px] gap-12 py-24 md:py-32 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow mb-6 text-ocean/55">Capítulo VI · Planejador</p>
          <h2 id="pl-title" className="display text-[clamp(2.8rem,6vw,5.4rem)] leading-[0.95]">
            Vamos descobrir sua <em className="text-[#9c7a3f]">próxima viagem?</em>
          </h2>
          <p className="lede mt-6 max-w-[40ch] text-ocean/70">
            Em sete passos rápidos você monta seu roteiro e envia tudo pelo WhatsApp. A equipe da Beloti Travel responde com opções pensadas para você.
          </p>
          <p className="mt-6 max-w-[42ch] text-sm text-ocean/50">
            Este planejador organiza a sua solicitação — não é um sistema de reservas nem mostra preços em tempo real. Os dados ficam só no seu navegador até você decidir enviá-los.
          </p>
        </div>

        <div className="rounded-[28px] bg-sand p-5 shadow-[0_40px_80px_-50px_rgba(8,39,59,0.45)] ring-1 ring-ocean/8 sm:p-8 md:p-10">
          {/* Progresso */}
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-ocean/55">
              <span>{step <= STEP_COUNT ? `Passo ${step} de ${STEP_COUNT}` : "Resumo"}</span>
              {step > 1 && step <= STEP_COUNT && <button type="button" onClick={back} className="ulink normal-case tracking-normal text-ocean">← Voltar</button>}
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-ocean/10" role="progressbar" aria-label="Progresso do planejador" aria-valuemin={0} aria-valuemax={STEP_COUNT} aria-valuenow={Math.min(step - 1, STEP_COUNT)}>
              <div className="h-full origin-left rounded-full bg-gradient-to-r from-turquoise to-champagne transition-transform duration-700 ease-[var(--ease-cine)]" style={{ transform: `scaleX(${step > STEP_COUNT ? 1 : Math.max(progress, 0.04)})` }} />
            </div>
          </div>

          <form
            noValidate
            onSubmit={(e) => { e.preventDefault(); if (step <= STEP_COUNT) next(); else send(); }}
            aria-describedby={error ? "pl-error" : undefined}
          >
            <div ref={panel} key={step}>
              {step <= STEP_COUNT ? (
                <h3 ref={heading} tabIndex={-1} className="display mb-6 text-3xl leading-tight outline-none md:text-4xl">{TITLES[step - 1]}</h3>
              ) : (
                <h3 ref={heading} tabIndex={-1} className="display mb-2 text-3xl leading-tight outline-none md:text-4xl">Seu roteiro, {d.name.split(" ")[0]}.</h3>
              )}

              {step === 1 && (
                <fieldset>
                  <legend className="sr-only">Tipo de viagem</legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {TYPES.map((t) => {
                      const on = d.type === t.id;
                      return (
                        <label key={t.id} className={`pl-item group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-2xl ring-2 transition-[box-shadow,transform] duration-500 sm:aspect-[3/4] ${on ? "ring-champagne" : "ring-transparent"} ${t.id === "corporativa" ? "col-span-2 aspect-[2/1] sm:col-span-3 sm:aspect-[3/1]" : ""}`}>
                          <input type="radio" name="type" value={t.id} checked={on} onChange={() => set("type", t.id)} className="peer sr-only" />
                          <Img name={t.img} alt="" sizes="(min-width: 640px) 200px, 45vw" className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-cine)] ${on ? "scale-110" : "group-hover:scale-105"}`} />
                          <span className={`absolute inset-0 transition-colors duration-500 ${on ? "bg-ocean/35" : "bg-gradient-to-t from-abyss/85 via-abyss/20 to-transparent"}`} />
                          <span className="absolute inset-x-3 bottom-3 text-sand">
                            <span className="display block text-2xl leading-none">{TYPE_LABEL[t.id]}</span>
                            <span className="mt-1 block text-xs text-sand/80">{t.hint}</span>
                          </span>
                          <span className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-champagne text-abyss transition-all duration-500 ${on ? "scale-100 opacity-100" : "scale-50 opacity-0"}`} aria-hidden="true">
                            <svg width="12" height="10" viewBox="0 0 12 10"><path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                          </span>
                          <span className="pointer-events-none absolute inset-0 rounded-2xl peer-focus-visible:ring-4 peer-focus-visible:ring-turquoise" />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <label className="pl-item block">
                    <span className="mb-2 block text-sm font-semibold">Destino desejado</span>
                    <input className="field" value={d.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Ex.: Portugal, Maceió, Japão…" autoComplete="off" aria-invalid={!!error} />
                  </label>
                  <div className="pl-item flex flex-wrap gap-2" aria-label="Sugestões rápidas">
                    {DEST_CHIPS.map((c) => (
                      <button key={c} type="button" className={chip(d.destination === c)} aria-pressed={d.destination === c} onClick={() => set("destination", c)}>{c}</button>
                    ))}
                  </div>
                  <label className={`pl-item flex cursor-pointer items-center gap-4 rounded-2xl p-4 ring-1 transition-colors ${d.suggestions ? "bg-ocean text-sand ring-ocean" : "bg-white ring-ocean/15"}`}>
                    <input type="checkbox" checked={d.suggestions} onChange={(e) => set("suggestions", e.target.checked)} className="h-5 w-5 accent-[#d6b47a]" />
                    <span><span className="block font-semibold">Quero sugestões</span><span className="text-sm opacity-75">Ainda estou decidindo — me ajudem a escolher.</span></span>
                  </label>
                </div>
              )}

              {step === 3 && (
                <label className="pl-item block">
                  <span className="mb-2 block text-sm font-semibold">Cidade de saída</span>
                  <input className="field" list="origens" value={d.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Ex.: São Paulo" autoComplete="address-level2" aria-invalid={!!error} />
                  <datalist id="origens">{ORIGINS.map((o) => <option key={o} value={o} />)}</datalist>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {ORIGINS.slice(0, 4).map((o) => (
                      <button key={o} type="button" className={chip(d.origin === o)} aria-pressed={d.origin === o} onClick={() => set("origin", o)}>{o}</button>
                    ))}
                  </div>
                </label>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <div className="pl-item grid grid-cols-[1fr_auto] gap-3">
                    <label>
                      <span className="mb-2 block text-sm font-semibold">Mês</span>
                      <select className="field" value={month} onChange={(e) => set("month", e.target.value ? `${year || nextYearFor(e.target.value)}-${e.target.value}` : "")} aria-invalid={!!error}>
                        <option value="">Selecione</option>
                        {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="mb-2 block text-sm font-semibold">Ano</span>
                      <select className="field" value={year} onChange={(e) => set("month", `${e.target.value}-${month || "01"}`)}>
                        {!year && <option value="">—</option>}
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className={`pl-item flex cursor-pointer items-center gap-4 rounded-2xl p-4 ring-1 transition-colors ${d.flexible ? "bg-ocean text-sand ring-ocean" : "bg-white ring-ocean/15"}`}>
                    <input type="checkbox" checked={d.flexible} onChange={(e) => set("flexible", e.target.checked)} className="h-5 w-5 accent-[#d6b47a]" />
                    <span className="font-semibold">Minhas datas são flexíveis</span>
                  </label>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-3">
                  <div className="pl-item"><Stepper label="Adultos" value={d.adults} min={1} onChange={(n) => set("adults", n)} /></div>
                  <div className="pl-item"><Stepper label="Crianças" value={d.children} min={0} onChange={(n) => set("children", n)} /></div>
                  {d.children > 0 && <p className="pl-item text-sm text-ocean/60">Você poderá informar as idades das crianças na conversa com a equipe.</p>}
                </div>
              )}

              {step === 6 && (
                <fieldset>
                  <legend className="mb-4 text-sm text-ocean/60">Opcional · valor total aproximado para a viagem</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {BUDGETS.map((b) => (
                      <label key={b} className={`pl-item flex cursor-pointer items-center justify-between rounded-2xl p-4 ring-1 transition-colors ${d.budget === b ? "bg-ocean text-sand ring-ocean" : "bg-white ring-ocean/15 hover:ring-ocean/40"}`}>
                        <span className="font-semibold">{b}</span>
                        <input type="radio" name="budget" value={b} checked={d.budget === b} onChange={() => set("budget", b)} className="h-4 w-4 accent-[#d6b47a]" />
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {step === 7 && (
                <div className="space-y-5">
                  <label className="pl-item block">
                    <span className="mb-2 block text-sm font-semibold">Nome</span>
                    <input className="field" value={d.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" aria-invalid={!!error && d.name.trim().length < 2} />
                  </label>
                  <fieldset className="pl-item">
                    <legend className="mb-2 text-sm font-semibold">Prefere contato por</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {([["whatsapp", "WhatsApp"], ["email", "E-mail"], ["telefone", "Ligação"]] as const).map(([v, l]) => (
                        <label key={v} className={`flex cursor-pointer items-center justify-center rounded-xl py-3 text-sm font-semibold ring-1 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-turquoise ${d.contactPref === v ? "bg-ocean text-sand ring-ocean" : "bg-white ring-ocean/15"}`}>
                          <input type="radio" name="pref" className="sr-only" checked={d.contactPref === v} onChange={() => set("contactPref", v)} />{l}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="pl-item block">
                    <span className="mb-2 block text-sm font-semibold">{d.contactPref === "email" ? "E-mail" : "Telefone com DDD"}</span>
                    <input
                      className="field"
                      type={d.contactPref === "email" ? "email" : "tel"}
                      inputMode={d.contactPref === "email" ? "email" : "tel"}
                      autoComplete={d.contactPref === "email" ? "email" : "tel"}
                      value={d.contact}
                      onChange={(e) => set("contact", e.target.value)}
                      placeholder={d.contactPref === "email" ? "voce@email.com" : "(11) 90000-0000"}
                    />
                  </label>
                  <label className="pl-item block">
                    <span className="mb-2 block text-sm font-semibold">Observações <span className="font-normal text-ocean/50">(opcional)</span></span>
                    <textarea className="field min-h-[96px] resize-y" value={d.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Ocasião especial, preferências, idades das crianças…" />
                  </label>
                  <label className="pl-item flex cursor-pointer items-start gap-3 text-sm text-ocean/75">
                    <input type="checkbox" checked={d.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#08273b]" />
                    <span>Concordo em enviar estes dados à Beloti Travel pelo WhatsApp para receber atendimento sobre a minha viagem (LGPD).</span>
                  </label>
                </div>
              )}

              {step > STEP_COUNT && (
                <div>
                  <p className="mb-6 text-ocean/65">Confira as informações. Ao enviar, o WhatsApp abre com a mensagem pronta — é só tocar em enviar.</p>
                  <dl className="divide-y divide-ocean/10 rounded-2xl bg-white px-5 ring-1 ring-ocean/10">
                    {[
                      ["Tipo", d.type ? TYPE_LABEL[d.type] : ""],
                      ["Destino", d.suggestions ? `Quero sugestões${d.destination ? ` · ${d.destination}` : ""}` : d.destination],
                      ["Saída", d.origin],
                      ["Quando", whenText(d)],
                      ["Viajantes", `${d.adults} adulto(s)${d.children ? ` · ${d.children} criança(s)` : ""}`],
                      ["Orçamento", d.budget || "Prefiro conversar"],
                      ["Contato", `${d.name} · ${d.contact}`],
                    ].map(([k, v], i) => (
                      <div key={k} className="pl-item grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 py-3.5 text-sm">
                        <dt className="font-bold uppercase tracking-[0.14em] text-ocean/45">{k}</dt>
                        <dd className="font-semibold">{v}</dd>
                        <button type="button" onClick={() => { dir.current = -1; setStep(i + 1); }} className="ulink text-xs text-ocean/60">Editar<span className="sr-only"> {k}</span></button>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            <p id="pl-error" role="alert" className="mt-4 min-h-[1.5rem] text-sm font-semibold text-[#b4462f]">{error}</p>

            <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              {step > STEP_COUNT ? (
                <>
                  <button type="button" onClick={reset} className="ulink self-center text-sm font-semibold text-ocean/60 sm:self-auto">Recomeçar</button>
                  <a
                    ref={sendLink}
                    href={waLink(buildMessage(d))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("whatsapp_click", { location: "planejador" })}
                    className="btn btn-dark w-full sm:w-auto"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.1.1.7-.1 1.3z" /></svg>
                    Enviar meu roteiro para a Beloti Travel
                    <span className="sr-only"> (abre o WhatsApp em nova aba)</span>
                  </a>
                </>
              ) : (
                <>
                  <span className="hidden text-xs text-ocean/45 sm:block">{step === 6 ? "Você pode pular este passo." : "Pressione Enter para continuar"}</span>
                  <button type="submit" className="btn btn-dark w-full sm:w-auto">
                    {step === STEP_COUNT ? "Ver resumo" : step === 6 && !d.budget ? "Pular" : "Continuar"}
                    <svg className="btn-arrow" width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true"><path d="M1 6h15M11 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" /></svg>
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
