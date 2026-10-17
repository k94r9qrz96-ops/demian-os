// Control de gasto: límites por tarea, por día y por mes, con alertas.
import { q } from '../db.js';
import { config } from '../config.js';
import { getSetting, setSetting, BlockedError } from './util.js';
import { emit } from './events.js';

export function priceFor(model) {
  return config.anthropic.prices[model] || { in: 4, out: 20 }; // conservador si el modelo no está tabulado
}

export function estimateUsd(model, tokensIn, tokensOut, webSearches = 0) {
  const p = priceFor(model);
  return (tokensIn * p.in + tokensOut * p.out) / 1e6 + (webSearches * config.anthropic.webSearchPer1k) / 1000;
}

export function periodSpend() {
  const day = q.get(`SELECT COALESCE(SUM(usd),0) s FROM spend_ledger WHERE ts >= datetime('now','start of day')`).s;
  const month = q.get(`SELECT COALESCE(SUM(usd),0) s FROM spend_ledger WHERE ts >= datetime('now','start of month')`).s;
  return { day, month };
}

export function limits() {
  return { ...config.limits, ...(getSetting('limits') || {}) };
}

// Se llama ANTES de cada llamada paga.
export function assertBudget(task, nextEstimateUsd = 0) {
  const l = limits();
  const { day, month } = periodSpend();
  const taskCap = task?.max_cost_usd ?? l.taskUsd;
  if (task && task.cost_usd + nextEstimateUsd > taskCap)
    throw new BlockedError(`Límite de gasto de la tarea alcanzado (US$ ${task.cost_usd.toFixed(3)} de US$ ${taskCap})`, { reason: 'task_budget' });
  if (day + nextEstimateUsd > l.dailyUsd) {
    pauseForBudget('diario', day, l.dailyUsd);
    throw new BlockedError(`Límite diario alcanzado (US$ ${day.toFixed(2)} de US$ ${l.dailyUsd})`, { reason: 'daily_budget' });
  }
  if (month + nextEstimateUsd > l.monthlyUsd) {
    pauseForBudget('mensual', month, l.monthlyUsd);
    throw new BlockedError(`Límite mensual alcanzado (US$ ${month.toFixed(2)} de US$ ${l.monthlyUsd})`, { reason: 'monthly_budget' });
  }
}

function pauseForBudget(period, spent, cap) {
  if (!getSetting('automations_paused')) {
    setSetting('automations_paused', true);
    emit('automations.paused', `Automatizaciones pausadas: se alcanzó el límite ${period} (US$ ${spent.toFixed(2)} / ${cap})`, { level: 'error' });
  }
}

export function recordSpend({ taskId = null, provider = 'anthropic', model = null, tokensIn = 0, tokensOut = 0, units = 0, usd }) {
  const before = periodSpend();
  q.run('INSERT INTO spend_ledger(task_id, provider, model, tokens_in, tokens_out, units, usd) VALUES (?,?,?,?,?,?,?)',
    taskId, provider, model, tokensIn, tokensOut, units, usd);
  if (taskId) q.run('UPDATE tasks SET cost_usd = cost_usd + ? WHERE id = ?', usd, taskId);
  const after = periodSpend();
  const l = limits();
  const crossed = (b, a, cap) => b < cap * l.alertRatio && a >= cap * l.alertRatio;
  if (crossed(before.day, after.day, l.dailyUsd))
    emit('spend.alert', `Consumo diario al ${Math.round((after.day / l.dailyUsd) * 100)}% del límite (US$ ${after.day.toFixed(2)})`, { level: 'warning' });
  if (crossed(before.month, after.month, l.monthlyUsd))
    emit('spend.alert', `Consumo mensual al ${Math.round((after.month / l.monthlyUsd) * 100)}% del límite (US$ ${after.month.toFixed(2)})`, { level: 'warning' });
}
