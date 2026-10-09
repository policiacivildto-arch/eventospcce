// Painel ao lado do mapa: dia e hora, legenda, cidade escolhida, abrangência e período analisado
import { useState } from "react";
import { sb, msgErro } from "../../lib/supabase.js";
import { useApp } from "../../lib/contexto.js";
import { dataBR, diaBR, hhmm } from "../../lib/util.js";
import { SIT, curto } from "../../lib/regras.js";
import { faixaDia, estadoHora } from "./logica.js";

export function Tempo({ modo, dias, dia, setDia, janela, t, setT }) {
  if (modo === "abr" || !dias.length) return null;
  const f = faixaDia(janela, dia);
  return <section className="panel noprint" id="cTempo">
    <div className="days" style={{ marginBottom: modo === "hora" ? 10 : 0 }}>{dias.map(d => <button key={d} data-dia={d} aria-selected={d === dia} onClick={() => setDia(d)}><b>{diaBR(d).split(",")[0]}</b><span>{dataBR(d)}</span></button>)}</div>
    {modo === "hora" && f && t !== null && <>
      <div className="hora"><b id="cHr">{hhmm(t)}</b><input type="range" id="cT" min={f[0]} max={f[1] - 18e5} step={1800000} value={t} onChange={e => setT(Number(e.target.value))} aria-label="Hora" /></div>
      <p className="hint">Arraste para ver quem atende cada cidade em cada hora.</p></>}
  </section>;
}

const Amostra = ({ v, t }) => <span><i className={v === "--c-sem" ? "hach" : ""} style={{ background: `var(${v})` }} />{t}</span>;

export function Legenda({ modo, cores, del, deps, contagem }) {
  const pls = [...cores.entries()].map(([id, cor]) => <span key={id}><i style={{ background: cor }} />{curto(del.get(id).nome)} <small className="muted">· {deps.get(del.get(id).departamento_id) || ""} · {contagem.get(id) || 0} cidades</small></span>);
  return <section className="panel"><h3>Legenda</h3><div className="leg" id="cLeg">
    {modo === "dia" && <>{SIT.map(([t, v]) => <Amostra key={t} v={v} t={t} />)}<p className="hint">Situação no dia inteiro (dentro do período analisado).</p></>}
    {modo === "hora" && <><Amostra v="--c-own" t="Delegacia da própria cidade aberta" /><Amostra v="--c-sem" t="Descoberta: sem delegacia aberta e sem plantonista" /><Amostra v="--c-fora" t="Fora do período analisado" />
      {pls.length > 0 && <><p className="hint" style={{ marginTop: 4 }}>Atendida pela plantonista (24h):</p><div className="leg pls">{pls}</div></>}</>}
    {modo === "abr" && <>{pls.length ? <div className="leg pls">{pls}</div> : <p className="muted">Nenhuma abrangência definida neste evento.</p>}<Amostra v="--c-fora" t="Sem plantonista" /><p className="hint">○ sede da plantonista.</p></>}
  </div></section>;
}

export function InfoCidade({ ibge, dados, modo, t, linha, aoFechar }) {
  const mu = dados.mun.get(ibge); if (!mu) return null;
  const pl = dados.abr.get(ibge), props = dados.proprias.get(ibge) || [];
  const e = t !== null ? estadoHora(ibge, t, dados.mapa, dados.abr) : null;
  return <section className="panel" id="cInfo">
    <div className="dhead" style={{ marginBottom: 6 }}><h3 style={{ margin: 0 }}>{mu.nome}</h3><button className="link" onClick={aoFechar}>fechar</button></div>
    <p className="hint">Delegacia na cidade: {props.length ? props.map(d => d.nome).join("; ") : "nenhuma"}</p>
    <p className="hint">Plantonista: {pl ? <><b>{dados.del.get(pl).nome}</b> ({dados.deps.get(dados.del.get(pl).departamento_id) || ""})</> : "não definida"}</p>
    {modo === "hora" && e && <p style={{ marginTop: 8 }}>Às <b>{hhmm(t)}</b>: {e.k === "own" ? "atendida pela própria delegacia (" + e.nomes.join("; ") + ")" : e.k === "pl" ? "atendida pela plantonista" : e.k === "sem" ? <><b style={{ color: "var(--danger)" }}>descoberta</b>: sem plantonista</> : "fora do período analisado"}</p>}
    {linha && <table style={{ marginTop: 8, fontSize: 13 }}><tbody>
      <tr><th>{dataBR(linha.dia)}</th><td><b>{linha.situacao}</b></td></tr>
      <tr><th>Própria</th><td>{linha.horario_proprio || "–"}</td></tr>
      <tr><th>Plantão</th><td>{linha.horario_plantao || "–"}</td></tr>
      <tr><th>Descoberta</th><td style={linha.minutos_descobertos ? { color: "var(--danger)", fontWeight: 700 } : null}>{linha.horario_descoberto || "–"}</td></tr>
    </tbody></table>}
  </section>;
}

/* edição da abrangência: escolhe a plantonista e clica nas cidades */
export function Abrangencia({ dados, editaveis, edit, setEdit, aoSalvar }) {
  const { ev, avisar } = useApp();
  const [salvando, setSalvando] = useState(false);
  const grupos = new Map(); editaveis.forEach(d => { const s = dados.deps.get(d.departamento_id) || "?"; if (!grupos.has(s)) grupos.set(s, []); grupos.get(s).push(d); });
  const escolher = id => {
    if (!id) return setEdit(null);
    const set = new Set([...dados.abr].filter(([, p]) => p === id).map(([i]) => i));
    setEdit({ pl: id, set, orig: [...set].sort().join() });
  };
  const d = edit && dados.del.get(edit.pl);
  const cid = edit ? [...edit.set].map(i => dados.mun.get(i)).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome)) : [];
  const mudou = edit && [...edit.set].sort().join() !== edit.orig;
  const tirar = i => setEdit(x => { const s = new Set(x.set); s.delete(i); return { ...x, set: s }; });
  const incluir = nome => { const mu = [...dados.mun.values()].find(m => m.nome.toLowerCase() === nome.trim().toLowerCase()); if (!mu) return avisar("Cidade não encontrada.", true); setEdit(x => ({ ...x, set: new Set([...x.set, mu.ibge]) })); };
  const salvar = async () => {
    setSalvando(true);
    const { data, error } = await sb.rpc("definir_abrangencia", { p_evento: ev.id, p_delegacia: edit.pl, p_municipios: [...edit.set] });
    setSalvando(false);
    if (error) return avisar(await msgErro(error), true);
    avisar("Abrangência salva: " + data + " cidade(s).");
    await aoSalvar();
    setEdit(x => x && ({ ...x, orig: [...x.set].sort().join() }));   /* continua aberta, já salva */
  };

  return <section className="panel noprint"><h3>Abrangência das plantonistas</h3>
    <label className="f">Plantonista<select id="cPl" value={edit ? edit.pl : ""} onChange={e => { if (mudou && !confirm("Descartar as mudanças não salvas?")) return; escolher(Number(e.target.value)); }}>
      <option value="">Escolha para ver ou editar…</option>
      {[...grupos.entries()].sort().map(([s, ds]) => <optgroup key={s} label={s}>{ds.map(x => <option key={x.id} value={x.id}>{curto(x.nome)}</option>)}</optgroup>)}
    </select></label>
    <div id="cEd" style={{ marginTop: 10 }}>{!edit ? <p className="hint">Escolha a plantonista e clique nas cidades do mapa para incluir ou tirar da abrangência dela.</p> : <>
      <p className="hint" style={{ marginBottom: 8 }}>Clique nas cidades do mapa para incluir ou tirar. {cid.length} cidade(s).</p>
      <div className="chips" id="cChips">{cid.length ? cid.map(m => { const o = dados.abr.get(m.ibge); return <button key={m.ibge} data-tira={m.ibge} title={"Tirar " + m.nome} onClick={() => tirar(m.ibge)}>{m.nome}{o && o !== edit.pl ? <small> (era de {curto(dados.del.get(o).nome)})</small> : null} ×</button>; }) : <span className="muted">Nenhuma cidade.</span>}</div>
      <div className="row" style={{ marginTop: 10 }}><label className="f">Incluir pelo nome<input type="text" id="cAdd" list="cMunList" placeholder="Digite a cidade" onChange={e => { const v = e.target.value; if ([...dados.mun.values()].some(m => m.nome.toLowerCase() === v.trim().toLowerCase())) { incluir(v); e.target.value = ""; } }} /></label></div>
      <datalist id="cMunList">{[...dados.mun.values()].map(m => <option key={m.ibge} value={m.nome} />)}</datalist>
      <p className="hint" style={{ marginTop: 6 }}>A plantonista funciona 24h e já cobre a própria cidade ({d && d.municipio_ibge ? dados.mun.get(d.municipio_ibge).nome : "–"}).</p>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" id="cSalvar" style={{ flex: "0 0 auto" }} disabled={!mudou || salvando} onClick={salvar}>Salvar abrangência</button>
        <button className="btn" id="cDesc" style={{ flex: "0 0 auto" }} onClick={() => { if (mudou && !confirm("Descartar as mudanças não salvas?")) return; setEdit(null); }}>Fechar</button></div>
    </>}</div>
  </section>;
}

/* DTO: período analisado e cópia da abrangência de outro evento */
export function PeriodoDTO({ aoMudar }) {
  const { ev, eventos, avisar, atualizarEvento } = useApp();
  const [ini, setIni] = useState(ev.cobertura_ini ? ev.cobertura_ini.slice(0, 16) : "");
  const [fim, setFim] = useState(ev.cobertura_fim ? ev.cobertura_fim.slice(0, 16) : "");
  const outros = eventos.filter(e => e.id !== ev.id);
  const [orig, setOrig] = useState(outros[0]?.id || "");
  const salvar = async () => {
    const { error } = await sb.rpc("definir_janela_cobertura", { p_evento: ev.id, p_ini: ini || null, p_fim: fim || null });
    if (error) return avisar(await msgErro(error), true);
    atualizarEvento({ cobertura_ini: ini || null, cobertura_fim: fim || null }); avisar("Período salvo."); aoMudar();
  };
  const copiar = async () => {
    if (!confirm("Copiar a abrangência do outro evento para este? As cidades que já têm plantonista aqui passam a seguir o outro evento.")) return;
    const { data, error } = await sb.rpc("copiar_abrangencia", { p_origem: orig, p_destino: ev.id });
    if (error) return avisar(await msgErro(error), true);
    avisar(data + " cidades copiadas."); aoMudar();
  };
  return <section className="panel noprint"><h3>Período analisado</h3>
    <div className="row"><label className="f">De<input type="datetime-local" id="cIni" value={ini} onChange={e => setIni(e.target.value)} /></label><label className="f">Até<input type="datetime-local" id="cFim" value={fim} onChange={e => setFim(e.target.value)} /></label></div>
    <div className="row" style={{ marginTop: 8 }}><button className="btn small" id="cJan" style={{ flex: "0 0 auto" }} onClick={salvar}>Salvar período</button><span className="hint">Vazio: do primeiro turno que abre ao último que fecha na necessidade de efetivo.</span></div>
    {outros.length > 0 && <><h3 style={{ marginTop: 14 }}>Copiar abrangência</h3>
      <div className="row"><label className="f">De outro evento<select id="cOrig" value={orig} onChange={e => setOrig(e.target.value)}>{outros.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></label>
        <button className="btn small" id="cCop" style={{ flex: "0 0 auto" }} onClick={copiar}>Copiar</button></div></>}
  </section>;
}
