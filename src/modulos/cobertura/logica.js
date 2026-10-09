// Regras da cobertura: quem atende cada cidade, a cada hora.
//   1) a delegacia da própria cidade, se estiver aberta na necessidade de efetivo;
//   2) senão, a plantonista que tem a cidade na abrangência (funciona sempre 24h);
//   3) senão, a cidade fica descoberta.
import { msTs } from "../../lib/util.js";
import { REG_DEP } from "../../lib/regras.js";

/* faixa de horas de um dia, dentro do período analisado */
export function faixaDia(janela, dia) {
  if (!janela || !janela.i || !dia) return null;
  const d0 = msTs(dia + "T00:00"), ini = Math.max(d0, msTs(janela.i)), fim = Math.min(d0 + 864e5, msTs(janela.f));
  return fim > ini ? [ini, fim] : null;
}
export function horaInicial(janela, dia, atual) {
  const f = faixaDia(janela, dia); if (!f) return null;
  if (atual !== null && atual >= f[0] && atual < f[1]) return atual;
  return Math.min(Math.max(f[0], msTs(dia + "T19:30")), f[1] - 18e5);
}

/* situação de uma cidade numa hora: own | pl | sem | fora */
export function estadoHora(ibge, t, mapa, abr) {
  const j = mapa.janela, m = mapa.municipios[ibge] || { o: [], pf: [], p: null };
  if (!j || !j.i || t === null || t < msTs(j.i) || t >= msTs(j.f)) return { k: "fora" };
  const own = m.o.filter(x => msTs(x.i) <= t && t < msTs(x.f));
  if (own.length) return { k: "own", nomes: [...new Set(own.map(x => x.d))] };
  const pl = abr.get(Number(ibge)) ?? m.p;
  return pl ? { k: "pl", pl } : { k: "sem" };
}

/* cores: plantonistas vizinhas nunca ficam com tons parecidos */
export function coresPlantonistas(ids, del, MP, escuro) {
  const lista = [...ids].filter(id => del.has(id)).sort((a, b) => del.get(a).nome.localeCompare(del.get(b).nome));
  const N = 12, sl = escuro ? ["50% 46%", "38% 34%"] : ["62% 62%", "48% 78%"];
  const pal = [...Array(N * 2)].map((_, i) => `hsl(${Math.round((i % N) * 360 / N + 15)} ${sl[i < N ? 0 : 1]})`);
  const hue = i => i % N, pos = id => { const d = del.get(id), m = d && MP.m[d.municipio_ibge]; return m ? m.c : [0, 0]; };
  const usado = new Map(), cor = new Map();
  lista.forEach(id => {
    const [x, y] = pos(id); let best = 0, nota = -1;
    pal.forEach((_, i) => {
      let perto = 1e9;
      usado.forEach((j, o) => { const [a, b] = pos(o), dh = Math.min(Math.abs(hue(i) - hue(j)), N - Math.abs(hue(i) - hue(j))); if (dh <= 1) perto = Math.min(perto, Math.hypot(a - x, b - y) * (dh + 1)); });
      const v = perto - [...usado.values()].filter(j => j === i).length * 50;
      if (v > nota) { nota = v; best = i; }
    });
    usado.set(id, best); cor.set(id, pal[best]);
  });
  return cor;
}

/* região da cidade: pelo departamento da plantonista; sem plantonista, pela delegacia da cidade;
   sem nenhuma das duas, pela cidade vizinha mais próxima */
export function calcularRegioes(MP, mun, abr, del, deps, proprias) {
  const direta = ibge => {
    const pl = abr.get(ibge);
    const ds = pl ? [del.get(pl).departamento_id] : (proprias.get(ibge) || []).map(d => d.departamento_id);
    for (const d of ds) { const r = REG_DEP[deps.get(d)]; if (r) return r; }
    return "";
  };
  const reg = new Map();
  mun.forEach((_, i) => reg.set(i, direta(i)));
  mun.forEach((_, i) => {
    if (reg.get(i)) return;
    const c = MP.m[i].c; let best = "", dist = 1e9;
    Object.entries(MP.m).forEach(([k, v]) => { const r = reg.get(Number(k)); if (!r) return; const dd = Math.hypot(v.c[0] - c[0], v.c[1] - c[1]); if (dd < dist) { dist = dd; best = r; } });
    reg.set(i, best);
  });
  return reg;
}
export const plDaRegiao = (id, reg, del, deps) => !reg || REG_DEP[deps.get((del.get(id) || {}).departamento_id)] === reg;

export function escuro() { const t = document.documentElement.dataset.theme; return t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); }
