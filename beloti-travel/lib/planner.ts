// Lógica pura do planejador (testada em tests/planner.test.mjs).
export type TripType = "praia" | "aventura" | "cultura" | "cruzeiro" | "familia" | "romantica" | "corporativa";

export type PlannerData = {
  type: TripType | "";
  destination: string;
  suggestions: boolean;
  origin: string;
  month: string; // AAAA-MM
  flexible: boolean;
  adults: number;
  children: number;
  budget: string;
  name: string;
  contact: string;
  contactPref: "whatsapp" | "email" | "telefone";
  notes: string;
  consent: boolean;
};

export const EMPTY: PlannerData = {
  type: "", destination: "", suggestions: false, origin: "", month: "", flexible: false,
  adults: 2, children: 0, budget: "", name: "", contact: "", contactPref: "whatsapp", notes: "", consent: false,
};

export const TYPE_LABEL: Record<TripType, string> = {
  praia: "Praia", aventura: "Aventura", cultura: "Cultura", cruzeiro: "Cruzeiro",
  familia: "Família", romantica: "Romântica", corporativa: "Corporativa",
};

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function formatMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  if (!y || !mo || mo < 1 || mo > 12) return "";
  return `${MONTHS[mo - 1]} de ${y}`;
}

export function whenText(d: PlannerData): string {
  const m = formatMonth(d.month);
  if (m && d.flexible) return `${m} (datas flexíveis)`;
  if (m) return m;
  return d.flexible ? "Datas flexíveis" : "";
}

export const STEP_COUNT = 7;

/** Retorna a mensagem de erro do passo (1–7) ou null se válido. */
export function validateStep(step: number, d: PlannerData): string | null {
  switch (step) {
    case 1: return d.type ? null : "Escolha o tipo de viagem.";
    case 2: return d.suggestions || d.destination.trim().length >= 2 ? null : "Informe um destino ou escolha “Quero sugestões”.";
    case 3: return d.origin.trim().length >= 2 ? null : "Informe a cidade de saída.";
    case 4: return d.month || d.flexible ? null : "Escolha um mês aproximado ou marque datas flexíveis.";
    case 5: return d.adults >= 1 ? null : "Inclua pelo menos 1 adulto.";
    case 6: return null; // orçamento é opcional
    case 7: {
      if (d.name.trim().length < 2) return "Informe seu nome.";
      const c = d.contact.trim();
      if (d.contactPref === "email" ? !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c) : c.replace(/\D/g, "").length < 10) {
        return d.contactPref === "email" ? "Informe um e-mail válido." : "Informe um telefone com DDD.";
      }
      return d.consent ? null : "Confirme que deseja enviar estes dados à Beloti Travel.";
    }
    default: return null;
  }
}

export function buildMessage(d: PlannerData): string {
  const pax = [`${d.adults} adulto${d.adults === 1 ? "" : "s"}`];
  if (d.children) pax.push(`${d.children} criança${d.children === 1 ? "" : "s"}`);
  const pref = { whatsapp: "WhatsApp", email: "E-mail", telefone: "Ligação" }[d.contactPref];
  const lines = [
    "Olá, Beloti Travel! Montei meu roteiro pelo site:",
    "",
    `• Tipo de viagem: ${d.type ? TYPE_LABEL[d.type] : "-"}`,
    `• Destino: ${d.suggestions ? `Quero sugestões${d.destination.trim() ? ` (ideia: ${d.destination.trim()})` : ""}` : d.destination.trim()}`,
    `• Saída de: ${d.origin.trim()}`,
    `• Quando: ${whenText(d)}`,
    `• Viajantes: ${pax.join(" e ")}`,
    `• Orçamento aproximado: ${d.budget || "Prefiro conversar"}`,
    "",
    `• Nome: ${d.name.trim()}`,
    `• Contato (${pref}): ${d.contact.trim()}`,
  ];
  if (d.notes.trim()) lines.push(`• Observações: ${d.notes.trim()}`);
  lines.push("", "Aguardo o contato. Obrigado!");
  return lines.join("\n");
}
