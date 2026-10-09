// Regras de negócio usadas nas telas (as mesmas do banco)
import { SERV, msTs, hhmm, maisDia, lista } from "./util.js";

/* Regiões: pelo departamento */
export const REGIOES = [["", "Todas as regiões"], ["CAP", "Capital"], ["RMF", "Região Metropolitana"], ["NORTE", "Interior Norte"], ["SUL", "Interior Sul"]];
export const REGIOES_REL = [...REGIOES, ["ESP", "Especializadas e outros"]];
export const REG_DEP = { "COPLAN": "CAP", "DPC": "CAP", "DPM": "RMF", "DPI NORTE": "NORTE", "DPI SUL": "SUL" };
export const regDep = sigla => REG_DEP[sigla] || "ESP";

const min = h => { const [a, b] = String(h || "00:00").split(":").map(Number); return a * 60 + b; };
const hm = m => String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");

/* Turnos de funcionamento de uma delegacia na necessidade de efetivo:
   abre = fecha é 24h; no último dia, "último dia até" corta o turno. Turnos encostados viram um só. */
export function turnos(p) {
  const out = []; const abre = min(p.abre), fecha = min(p.fecha), fim = p.data_fim || p.data_ini;
  for (let d = p.data_ini; d <= fim; d = maisDia(d, 1)) {
    let dur = abre === fecha ? 1440 : (fecha - abre + 1440) % 1440;
    if (d === fim && p.fim_ultimo_dia) { const c = min(p.fim_ultimo_dia) || 1440; if (abre >= c) continue; dur = Math.min(dur, c - abre); }
    const ini = msTs(d + "T" + hm(abre)), f = ini + dur * 6e4;
    const ult = out[out.length - 1]; if (ult && ult[1] === ini) ult[1] = f; else out.push([ini, f]);
  }
  return out;
}

/* "25/10 08:00 a 26/10 08:00" ou "24/10 e 25/10, 07:00–19:00" */
export function textoFuncionamento(p) {
  const fmt = ms => { const d = new Date(ms); return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0"); };
  const grupos = new Map();
  turnos(p).forEach(([a, b]) => {
    if (fmt(a) === fmt(b - 1)) { const k = hhmm(a) + "–" + (hhmm(b) === "00:00" ? "24:00" : hhmm(b)); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(fmt(a)); }
    else grupos.set(fmt(a) + " " + hhmm(a) + " a " + fmt(b) + " " + hhmm(b), null);
  });
  return [...grupos].map(([k, ds]) => ds ? lista(ds) + ", " + k : k).join("; ");
}

/* "3 OIP ordinário 24h + 1 DPC e 1 OIP extra 07:00–19:00" */
export function textoEfetivo(efs) {
  const ordem = c => c === "DPC" ? 0 : 1, partes = [];
  SERV.forEach(sv => {
    const doServ = (efs || []).filter(e => e.servico === sv); if (!doServ.length) return;
    const porHora = new Map();
    doServ.forEach(e => {
      const k = e.entrada.slice(0, 5) === e.saida.slice(0, 5) ? "24h" : e.entrada.slice(0, 5) + "–" + e.saida.slice(0, 5);
      if (!porHora.has(k)) porHora.set(k, new Map()); const m = porHora.get(k); m.set(e.cargo, (m.get(e.cargo) || 0) + e.qtd);
    });
    porHora.forEach((m, h) => partes.push(lista([...m].sort((a, b) => ordem(a[0]) - ordem(b[0])).map(([c, q]) => q + " " + c)) + " " + sv.toLowerCase() + " " + h));
  });
  return partes.join(" + ") || "sem efetivo";
}
export const porDia = (efs, cargo) => (efs || []).filter(e => e.cargo === cargo).reduce((s, e) => s + e.qtd, 0);
export function diasDe(p) {
  return [...new Set(turnos(p).flatMap(([a, b]) => { const r = []; for (let t = a; t < b; t += 864e5) r.push(new Date(t).toISOString().slice(0, 10)); return r; }))].length || 1;
}

/* Situações da cobertura e suas cores */
export const SIT = [
  ["Delegacia própria", "--c-own"], ["Própria + plantão", "--c-mix"], ["Plantão", "--c-pl"],
  ["Descoberta em parte", "--c-parc"], ["Sem abrangência", "--c-sem"]];
export const curto = n => String(n || "").replace(/^(\d+ª )?Delegacia de Polícia Civil d[aeo] /i, "$1DP ").replace(/^Unidade de Atendimento de /i, "UA ");

/* Vagas da escala: contagem por situação */
export function contagem(vs) {
  const at = vs.filter(v => v.ativa);
  return { total: at.length, nome: at.filter(v => v.matricula).length, sem: at.filter(v => v.sem_servidor).length,
    abertas: at.filter(v => !v.matricula && !v.sem_servidor).length, fora: vs.filter(v => !v.ativa).length, extra: at.filter(v => v.servico === "Extra").length };
}
