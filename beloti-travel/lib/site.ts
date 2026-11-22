// Dados verificados do negócio (fonte: belotitravel.com, nov/2026).
export const SITE = {
  name: "Beloti Travel",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://belotitravel.com",
  email: "jonathan@belotitravel.com",
  phoneDisplay: "+55 11 91671-5882",
  phoneE164: "+5511916715882",
  whatsapp: "5511916715882",
  address: "Centro, São Bernardo do Campo, SP, Brasil",
  city: "São Bernardo do Campo",
  region: "SP",
  hours: "9:00 – 22:00",
  instagram: "https://www.instagram.com/belotitravel",
  facebook: "https://www.facebook.com/belotitravel",
} as const;

/** Monta um link wa.me com a mensagem codificada corretamente. */
export function waLink(message: string): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message.trim())}`;
}

export const WA = {
  geral: "Olá, Beloti Travel! Vim pelo site e gostaria de planejar uma viagem.",
  hero: "Olá, Beloti Travel! Quero planejar minha próxima viagem. Podem me ajudar?",
  destino: (d: string) => `Olá, Beloti Travel! Tenho interesse em uma viagem para ${d}. Podem me enviar uma proposta?`,
  cruzeiro: "Olá, Beloti Travel! Quero descobrir opções de cruzeiro. Podem me orientar sobre navios, roteiros e datas?",
  servico: (s: string) => `Olá, Beloti Travel! Gostaria de uma cotação de ${s}.`,
  corporativo: "Olá, Beloti Travel! Gostaria de solicitar uma proposta para viagens corporativas da minha empresa.",
  regiao: (r: string) => `Olá, Beloti Travel! Quero explorar destinos em ${r}. Podem me enviar sugestões e uma cotação?`,
  fechamento: "Olá, Beloti Travel! Quero começar a planejar minha próxima viagem.",
};

export const mailLink = (subject: string, body = "") =>
  `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;
