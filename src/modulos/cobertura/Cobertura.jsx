// Cobertura das cidades: mapa, abrangência das plantonistas e relatório
import { useCallback, useEffect, useMemo, useState } from "react";
import { sb, todos, msgErro } from "../../lib/supabase.js";
import { useApp } from "../../lib/contexto.js";
import { guardar, ler } from "../../lib/util.js";
import { SIT, REGIOES } from "../../lib/regras.js";
import { estadoHora, horaInicial, coresPlantonistas, calcularRegioes, plDaRegiao, escuro } from "./logica.js";
import Mapa from "./Mapa.jsx";
import { Tempo, Legenda, InfoCidade, Abrangencia, PeriodoDTO } from "./Painel.jsx";
import RelatorioCobertura from "./RelatorioCobertura.jsx";

let MAPA_CACHE = null;
const carregarMapa = async () => MAPA_CACHE || (MAPA_CACHE = await (await fetch((import.meta.env.BASE_URL || "./") + "mapa-ce.json")).json());

export default function Cobertura() {
  const { perfil, ev } = useApp();
  const [MP, setMP] = useState(MAPA_CACHE);
  const [dados, setDados] = useState(null), [erro, setErro] = useState("");
  const [modo, setModo] = useState("hora"), [dia, setDia] = useState(null), [t, setT] = useState(null);
  const [reg, setReg] = useState(ler("pe-reg") || ""), [sel, setSel] = useState(null), [edit, setEdit] = useState(null);
  const [vb, setVb] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const [mapaCe, mun, del, deps, abr, mapa, rel] = await Promise.all([
        carregarMapa(),
        todos(() => sb.from("municipios").select("ibge,nome").order("nome")),
        todos(() => sb.from("delegacias").select("id,nome,departamento_id,municipio_ibge").order("nome")),
        sb.from("departamentos").select("id,sigla"),
        todos(() => sb.from("abrangencias").select("municipio_ibge,delegacia_id").eq("evento_id", ev.id)),
        sb.rpc("cobertura_mapa", { p_evento: ev.id }),
        todos(() => sb.rpc("cobertura", { p_evento: ev.id }))]);
      if (mapa.error) throw mapa.error;
      const d = { mun: new Map(mun.map(m => [m.ibge, m])), del: new Map(del.map(x => [x.id, x])), deps: new Map((deps.data || []).map(x => [x.id, x.sigla])),
        abr: new Map(abr.map(a => [a.municipio_ibge, a.delegacia_id])), mapa: mapa.data || { janela: null, municipios: {} }, rel, proprias: new Map() };
      del.forEach(x => { if (x.municipio_ibge) { if (!d.proprias.has(x.municipio_ibge)) d.proprias.set(x.municipio_ibge, []); d.proprias.get(x.municipio_ibge).push(x); } });
      d.dias = [...new Set(rel.map(r => r.dia))].sort();
      d.regiao = calcularRegioes(mapaCe, d.mun, d.abr, d.del, d.deps, d.proprias);
      setMP(mapaCe); setDados(d);
      setDia(x => d.dias.includes(x) ? x : d.dias[0] || null);
    } catch (e) { setErro(await msgErro(e)); }
  }, [ev.id]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { if (dados) setT(x => horaInicial(dados.mapa.janela, dia, x)); }, [dados, dia]);

  const naRegiao = useCallback(i => !reg || (dados && dados.regiao.get(Number(i)) === reg), [reg, dados]);
  const plNaRegiao = useCallback(id => dados ? plDaRegiao(id, reg, dados.del, dados.deps) : true, [reg, dados]);

  /* aproxima o mapa da região escolhida */
  useEffect(() => {
    if (!MP || !dados) return;
    if (!reg) return setVb([0, 0, MP.w, MP.h]);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    Object.entries(MP.m).forEach(([k, v]) => { if (dados.regiao.get(Number(k)) !== reg) return;
      for (const [, a, b] of v.d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)) { const x = +a, y = +b; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } });
    if (x1 < x0) return;
    const pad = 20, r = MP.w / MP.h; let w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
    if (w / h > r) h = w / r; else w = h * r;
    setVb([(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h]);
  }, [reg, MP, dados]);

  const cores = useMemo(() => {
    if (!dados || !MP) return { pl: new Map(), mapa: new Map() };
    const ids = new Set(dados.abr.values()); if (edit) ids.add(edit.pl);
    const pl = coresPlantonistas(ids, dados.del, MP, escuro());
    const linha = new Map(dados.rel.filter(r => r.dia === dia).map(r => [r.ibge, r]));
    const mapa = new Map();
    dados.mun.forEach((_, i) => {
      let c;
      if (modo === "abr") c = edit && edit.set.has(i) ? pl.get(edit.pl) : dados.abr.has(i) ? pl.get(dados.abr.get(i)) : "var(--c-fora)";
      else if (modo === "dia") { const r = linha.get(i), s = r && SIT.find(x => x[0] === r.situacao); c = s ? (s[1] === "--c-sem" ? "url(#hach)" : `var(${s[1]})`) : "var(--c-fora)"; }
      else { const e = estadoHora(i, t, dados.mapa, dados.abr); c = e.k === "own" ? "var(--c-own)" : e.k === "pl" ? pl.get(e.pl) : e.k === "sem" ? "url(#hach)" : "var(--c-fora)"; }
      mapa.set(i, c);
    });
    return { pl, mapa };
  }, [dados, MP, modo, dia, t, edit]);

  const apagadas = useMemo(() => { const s = new Set(); if (dados) dados.mun.forEach((_, i) => { if ((modo === "abr" && edit && !edit.set.has(i)) || !naRegiao(i)) s.add(i); }); return s; }, [dados, modo, edit, naRegiao]);
  const sedes = useMemo(() => {
    if (!dados || !MP) return [];
    const ids = new Set(dados.abr.values()); if (edit) ids.add(edit.pl);
    const m = new Map(); ids.forEach(id => { const d = dados.del.get(id); if (d && d.municipio_ibge && MP.m[d.municipio_ibge] && plNaRegiao(id)) m.set(d.municipio_ibge, MP.m[d.municipio_ibge]); });
    return [...m.values()];
  }, [dados, MP, edit, plNaRegiao]);
  const contagem = useMemo(() => { const c = new Map(); dados?.abr.forEach(p => c.set(p, (c.get(p) || 0) + 1)); return c; }, [dados]);
  const coresLegenda = useMemo(() => new Map([...cores.pl].filter(([id]) => plNaRegiao(id))), [cores, plNaRegiao]);

  const clicar = useCallback(i => {
    if (edit && modo === "abr") return setEdit(x => { const s = new Set(x.set); s.has(i) ? s.delete(i) : s.add(i); return { ...x, set: s }; });
    setSel(x => x === i ? null : i);
  }, [edit, modo]);

  if (erro) return <><div className="bar"><h2>Cobertura das cidades</h2></div><p className="err">{erro}</p></>;
  if (!dados || !MP || !vb) return <><div className="bar"><h2>Cobertura das cidades</h2></div><p className="muted">Carregando mapa…</p></>;

  const editaveis = [...dados.del.values()].filter(d => d.municipio_ibge && (perfil.dto || perfil.focal_de.some(f => f.id === d.departamento_id)) && plNaRegiao(d.id));
  return <>
    <div className="bar"><h2>Cobertura das cidades</h2>
      <label className="f noprint" style={{ minWidth: 200 }}>Região<select id="cReg" value={reg} onChange={e => { setReg(e.target.value); guardar("pe-reg", e.target.value); }}>{REGIOES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
      <div className="seg noprint" role="group" aria-label="O que o mapa mostra">
        {[["hora", "Quem atende"], ["dia", "Situação do dia"], ["abr", "Abrangência"]].map(([k, n]) => <button key={k} data-modo={k} aria-pressed={modo === k} onClick={() => setModo(k)}>{n}</button>)}</div>
    </div>
    {!(dados.mapa.janela && dados.mapa.janela.i) && <div className="banner warn">Ainda não há necessidade de efetivo com horário neste evento. O mapa mostra só a abrangência.</div>}
    <div className="cob">
      <Mapa MP={MP} cores={cores.mapa} apagadas={apagadas} selecionada={sel} sedes={sedes} vb={vb} setVb={setVb} aoClicar={clicar} />
      <div className="side">
        <Tempo modo={modo} dias={dados.dias} dia={dia} setDia={setDia} janela={dados.mapa.janela} t={t} setT={setT} />
        <Legenda modo={modo} cores={coresLegenda} del={dados.del} deps={dados.deps} contagem={contagem} />
        {sel && <InfoCidade ibge={sel} dados={dados} modo={modo} t={t} linha={dados.rel.find(r => r.ibge === sel && r.dia === dia)} aoFechar={() => setSel(null)} />}
        {editaveis.length > 0 && <Abrangencia dados={dados} editaveis={editaveis} edit={edit} setEdit={e => { setEdit(e); if (e) setModo("abr"); }}
          aoSalvar={carregar} />}
        {perfil.dto && <PeriodoDTO aoMudar={carregar} />}
      </div>
    </div>
    <RelatorioCobertura dados={dados} dia={dia} reg={reg} naRegiao={naRegiao} plNaRegiao={plNaRegiao} />
  </>;
}
