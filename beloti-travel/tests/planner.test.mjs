// Executar com: npm test  (Node >= 22.18 remove os tipos do .ts nativamente)
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY, buildMessage, validateStep, formatMonth } from "../lib/planner.ts";
import { waLink, SITE } from "../lib/site.ts";

const full = {
  ...EMPTY, type: "romantica", destination: "Portugal", origin: "São Bernardo do Campo", month: "2027-05",
  flexible: true, adults: 2, children: 1, budget: "R$ 10 mil a R$ 20 mil", name: "Ana Souza",
  contact: "(11) 98888-7777", contactPref: "whatsapp", notes: "Aniversário de casamento & lua de mel", consent: true,
};

test("valida cada passo", () => {
  assert.match(validateStep(1, EMPTY), /tipo/);
  assert.match(validateStep(2, EMPTY), /destino/);
  assert.equal(validateStep(2, { ...EMPTY, suggestions: true }), null);
  assert.match(validateStep(3, EMPTY), /cidade/);
  assert.match(validateStep(4, EMPTY), /mês/);
  assert.equal(validateStep(4, { ...EMPTY, flexible: true }), null);
  assert.equal(validateStep(6, EMPTY), null);
  assert.match(validateStep(7, { ...full, contact: "123" }), /telefone/);
  assert.match(validateStep(7, { ...full, contactPref: "email", contact: "x@y" }), /e-mail/);
  assert.match(validateStep(7, { ...full, consent: false }), /Confirme/);
  for (let s = 1; s <= 7; s++) assert.equal(validateStep(s, full), null, `passo ${s}`);
});

test("formata mês em português", () => {
  assert.equal(formatMonth("2027-03"), "março de 2027");
  assert.equal(formatMonth("x"), "");
});

test("mensagem inclui todos os campos", () => {
  const m = buildMessage(full);
  for (const s of ["Romântica", "Portugal", "São Bernardo do Campo", "maio de 2027 (datas flexíveis)", "2 adultos e 1 criança", "R$ 10 mil a R$ 20 mil", "Ana Souza", "(11) 98888-7777", "lua de mel"]) {
    assert.ok(m.includes(s), s);
  }
});

test("link wa.me usa o número real e codifica a mensagem", () => {
  const url = waLink(buildMessage(full));
  assert.ok(url.startsWith("https://wa.me/5511916715882?text="));
  assert.equal(SITE.whatsapp, "5511916715882");
  const decoded = decodeURIComponent(url.split("?text=")[1]);
  assert.equal(decoded, buildMessage(full).trim());
  assert.ok(!url.split("?text=")[1].includes(" ") && !url.includes("&notes"), "sem espaços/caracteres crus");
  assert.ok(url.includes("%26"), "& codificado");
});
