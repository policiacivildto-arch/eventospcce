// Relatório: funcionamento e efetivo por delegacia, da necessidade atual ou de uma versão fechada; PDF e CSV
import { useEffect, useMemo, useRef, useState } from "react";
import { sb, todos, msgErro } from "../../lib/supabase.js";
import { useApp } from "../../lib/contexto.js";
import { baixarCsv, dataHoraBR } from "../../lib/util.js";
import { REGIOES_REL } from "../../lib/regras.js";
import { Vazio, Erro, Carregando } from "../../componentes/Comuns.jsx";
import { linhasRelatorio, totais, colunasTotais, agrupar } from "./dados.js";
import { gerarPdf } from "./pdf.js";

export default function Relatorio() {
  const { perfil, ev, avisar } = useApp();
  const [sig, setSig] = useState(null), [versoes, setVersoes] = useState([]);
  const [fonte, setFonte] = useState(""), [dados, setDados] = useState(null), [erro, setErro] = useState("");
  const [reg, setReg] = useState(""), [dep, setDep] = useState(""), [busca, setBusca] = useState("");
  const [gerando, setGerando] = useState(false);
  const cache = useRef(new Map());

  useEffect(() => { (async () => {
    const { data } = await sb.from("departamentos").select("id,sigla"); setSig(new Map((data || []).map(d => [d.id, d.sigla])));
    if (perfil.dto) { const { data: v } = await sb.from("versoes").select("id,numero,motivo,fechada_em,aporte_autorizado").eq("evento_id", ev.id).order("numero", { ascending: false }); setVersoes(v || []); }
  })(); }, [ev.id, perfil.dto]);

  /* fonte: necessidade atual (lida de novo) ou versão fechada (congelada, guardada) */
  useEffect(() => { (async () => {
    setDados(null); setErro("");
    try {
      if (!fonte) setDados(await todos(() => sb.from("pedido_delegacias").select("id,departamento_id,delegacia_nome,tipo,data_ini,data_fim,abre,fecha,fim_ultimo_dia,pedido_efetivo(cargo,qtd,servico,entrada,saida)").eq("evento_id", ev.id).order("delegacia_nome").order("data_ini")));
      else {
        if (!cache.current.has(fonte)) {
          const { data, error } = await sb.from("versoes").select("pedido").eq("id", fonte).maybeSingle(); if (error) throw error;
          cache.current.set(fonte, ((data && data.pedido) || []).map(d => ({ ...d, pedido_efetivo: d.efetivo || [] })));
        }
        setDados(cache.current.get(fonte));
      }
    } catch (e) { setErro(await msgErro(e)); }
  })(); }, [fonte, ev.id]);

  const versao = versoes.find(v => v.id === fonte);
  const nomeFonte = versao ? `Versão ${versao.numero} (fechada em ${dataHoraBR(versao.fechada_em)}${versao.aporte_autorizado ? ", aporte autorizado" : ""})` : "Necessidade de efetivo atual";
  const arqFonte = versao ? "versao-" + versao.numero : "necessidade-atual";
  const linhas = useMemo(() => dados && sig ? linhasRelatorio(dados, sig, { reg, dep, busca }) : [], [dados, sig, reg, dep, busca]);
  const depsNoPedido = useMemo(() => dados && sig ? [...new Set(dados.map(p => sig.get(p.departamento_id)))].filter(Boolean).sort() : [], [dados, sig]);
  const grupos = agrupar(linhas);

  const pdf = async () => {
    setGerando(true);
    try {
      const filtro = [reg ? REGIOES_REL.find(r => r[0] === reg)[1] : "", dep, busca ? "busca: " + busca : ""].filter(Boolean).join(" · ") || "Todas as delegacias";
      await gerarPdf({ linhas, evento: ev.nome, fonte: nomeFonte, filtro, usuario: perfil.nome,
        nomeArquivo: `funcionamento-efetivo-${arqFonte}-${(dep || reg || "todas").toLowerCase().replace(/\s+/g, "-")}.pdf` });
    } catch (e) { avisar("Não foi possível gerar o PDF: " + e.message, true); }
    setGerando(false);
  };
  const csv = () => baixarCsv(`funcionamento-efetivo-${arqFonte}.csv`, ["Fonte", "Departamento", "Delegacia", "Tipo", "Funcionamento", "Efetivo por dia", "DPC por dia", "OIP por dia"],
    linhas.map(l => [nomeFonte, l.dep, l.nome, l.tipo, l.func, l.ef, l.dpc, l.oip]));
  const linhaTot = (nome, t) => <tr key={nome}><td>{nome}</td>{colunasTotais(t).map((v, i) => <td key={i} className="n">{v}</td>)}</tr>;

  return <>
    <div className="bar"><h2>Funcionamento e efetivo por delegacia</h2>
      <button className="btn primary noprint" id="rPdf" disabled={gerando || !linhas.length} onClick={pdf}>{gerando ? "Gerando…" : "Baixar PDF"}</button>
      <button className="btn noprint" id="rCsv" disabled={!linhas.length} onClick={csv}>CSV</button></div>
    <div className="row noprint" style={{ marginBottom: 14 }}>
      {versoes.length > 0 && <label className="f" style={{ flex: "1 1 100%" }}>Fonte<select id="rFonte" value={fonte} onChange={e => setFonte(e.target.value)}>
        <option value="">Necessidade atual (como está agora)</option>
        {versoes.map(v => <option key={v.id} value={v.id}>Versão {v.numero}{v.aporte_autorizado ? " · aporte autorizado" : ""} · {new Date(v.fechada_em).toLocaleDateString("pt-BR")}{v.motivo ? " · " + v.motivo : ""}</option>)}</select></label>}
      <label className="f">Região<select id="rReg" value={reg} onChange={e => { setReg(e.target.value); setDep(""); }}>{REGIOES_REL.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
      <label className="f">Departamento<select id="rDep" value={dep} onChange={e => setDep(e.target.value)}><option value="">Todos</option>{depsNoPedido.map(d => <option key={d}>{d}</option>)}</select></label>
      <label className="f" style={{ flex: "2 1 200px" }}>Delegacia<input type="search" id="rBusca" placeholder="Filtrar pelo nome" value={busca} onChange={e => setBusca(e.target.value)} /></label>
    </div>
    <Erro>{erro}</Erro>
    <div id="rOut">{!dados || !sig ? (!erro && <Carregando />) : <>
      <p className="hint" style={{ margin: "-6px 0 10px" }}>Mostrando: <b>{nomeFonte}</b></p>
      {!linhas.length ? <Vazio>Nenhuma delegacia na necessidade de efetivo com esse filtro.</Vazio> : <>
        <div className="panel" style={{ marginBottom: 14 }}><h3 style={{ marginBottom: 8 }}>Resumo por departamento <small className="muted">(plantões no período: policiais × dias)</small></h3>
          <div className="scroll"><table><thead><tr><th>Departamento</th><th className="n">Delegacias</th><th className="n">Ord. DPC</th><th className="n">Ord. OIP</th><th className="n">Extra DPC</th><th className="n">Extra OIP</th><th className="n">Outros*</th></tr></thead>
            <tbody>{[...grupos].map(([d, l]) => linhaTot(d, totais(l)))}</tbody><tfoot>{linhaTot("Total", totais(linhas))}</tfoot></table></div>
          <p className="hint" style={{ marginTop: 6 }}>* Outros: extra sem aporte, diária e compensação de horário.</p></div>
        {[...grupos].map(([d, l]) => <div className="panel" style={{ marginBottom: 14 }} key={d}><h3 style={{ marginBottom: 8 }}>{d} <small className="muted">· {l.length} delegacia(s)</small></h3>
          <div className="scroll"><table><thead><tr><th>Delegacia</th><th>Funcionamento</th><th>Efetivo por dia</th><th className="n">DPC/dia</th><th className="n">OIP/dia</th></tr></thead>
            <tbody>{l.map((x, i) => <tr key={i}><td className="wrap"><b>{x.nome}</b></td><td className="wrap">{x.func}</td><td className="wrap">{x.ef}</td><td className="n">{x.dpc}</td><td className="n">{x.oip}</td></tr>)}</tbody></table></div></div>)}
      </>}
    </>}</div>
  </>;
}
