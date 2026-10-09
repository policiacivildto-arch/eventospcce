// Monta as linhas do relatório de funcionamento e efetivo
import { textoFuncionamento, textoEfetivo, porDia, diasDe, regDep } from "../../lib/regras.js";

export function linhasRelatorio(dados, sig, { reg, dep, busca }) {
  const b = busca.trim().toLowerCase();
  return dados.map(p => ({ p, dep: sig.get(p.departamento_id) || "?" }))
    .filter(x => (!reg || regDep(x.dep) === reg) && (!dep || x.dep === dep) && (!b || x.p.delegacia_nome.toLowerCase().includes(b)))
    .map(({ p, dep }) => ({ dep, nome: p.delegacia_nome, tipo: p.tipo, func: textoFuncionamento(p), ef: textoEfetivo(p.pedido_efetivo),
      dpc: porDia(p.pedido_efetivo, "DPC"), oip: porDia(p.pedido_efetivo, "OIP"), dias: diasDe(p), efs: p.pedido_efetivo || [] }))
    .sort((a, b) => a.dep.localeCompare(b.dep) || a.nome.localeCompare(b.nome));
}

/* plantões no período (policiais × dias) por serviço e cargo */
export function totais(ls) {
  const t = { del: new Set(), "Ordinário|DPC": 0, "Ordinário|OIP": 0, "Extra|DPC": 0, "Extra|OIP": 0, "Outros|DPC": 0, "Outros|OIP": 0 };
  ls.forEach(l => { t.del.add(l.nome); l.efs.forEach(e => { const s = e.servico === "Ordinário" || e.servico === "Extra" ? e.servico : "Outros"; t[s + "|" + e.cargo] += e.qtd * l.dias; }); });
  return t;
}
export const colunasTotais = t => [t.del.size, t["Ordinário|DPC"], t["Ordinário|OIP"], t["Extra|DPC"], t["Extra|OIP"], t["Outros|DPC"] + t["Outros|OIP"]];

export function agrupar(ls) { const m = new Map(); ls.forEach(l => { if (!m.has(l.dep)) m.set(l.dep, []); m.get(l.dep).push(l); }); return m; }
