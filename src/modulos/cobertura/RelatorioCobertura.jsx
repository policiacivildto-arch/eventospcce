// Relatório de cobertura (cidade por dia) e abrangência por plantonista; CSV e impressão
import { useState } from "react";
import { dataBR, diaBR, baixarCsv } from "../../lib/util.js";
import { SIT, REGIOES } from "../../lib/regras.js";
import { Vazio } from "../../componentes/Comuns.jsx";

export default function RelatorioCobertura({ dados, dia, reg, naRegiao, plNaRegiao }) {
  const [filtro, setFiltro] = useState(null), [busca, setBusca] = useState("");
  const nomeReg = reg ? REGIOES.find(r => r[0] === reg)[1] : "";
  const rows = dados.rel.filter(r => r.dia === dia && naRegiao(r.ibge));
  const todosReg = dados.rel.filter(r => naRegiao(r.ibge));
  const cont = new Map(SIT.map(([s]) => [s, 0])); rows.forEach(r => cont.set(r.situacao, (cont.get(r.situacao) || 0) + 1));
  const b = busca.trim().toLowerCase();
  const vis = rows.filter(r => (!filtro || r.situacao === filtro) && (!b || r.municipio.toLowerCase().includes(b) || (r.plantonista || "").toLowerCase().includes(b)));
  const porPl = new Map(); dados.abr.forEach((p, i) => { if (!plNaRegiao(p)) return; if (!porPl.has(p)) porPl.set(p, []); porPl.get(p).push(dados.mun.get(i).nome); });
  const plRows = [...porPl.entries()].map(([p, cs]) => ({ p, d: dados.del.get(p), dep: dados.deps.get(dados.del.get(p).departamento_id) || "", cs: cs.sort((a, c) => a.localeCompare(c)) }))
    .sort((a, c) => a.dep.localeCompare(c.dep) || a.d.nome.localeCompare(c.d.nome));
  const semPl = [...dados.mun.values()].filter(m => naRegiao(m.ibge) && !dados.abr.has(m.ibge) && !(dados.proprias.get(m.ibge) || []).length).map(m => m.nome);

  const cab = ["Data", "Cidade", "IBGE", "Situação", "Delegacia da cidade (horário)", "Minutos com delegacia própria", "Plantonista", "Departamento da plantonista", "Horário do plantão", "Minutos de plantão", "Horário descoberto", "Minutos descobertos"];
  const lin = r => [dataBR(r.dia), r.municipio, r.ibge, r.situacao, r.delegacias_proprias, r.minutos_proprios, r.plantonista, r.plantonista_departamento, r.horario_plantao, r.minutos_plantao, r.horario_descoberto, r.minutos_descobertos];
  const sufixo = reg ? reg.toLowerCase() + "-" : "";

  return <section style={{ marginTop: 18 }} id="cRel">
    <div className="bar"><h2>Relatório de cobertura{nomeReg ? " · " + nomeReg : ""}{dia ? " · " + diaBR(dia) : ""}</h2>
      <button className="btn small noprint" id="cCsvDia" disabled={!rows.length} onClick={() => baixarCsv("cobertura-" + sufixo + dia + ".csv", cab, rows.map(lin))}>CSV do dia</button>
      <button className="btn small noprint" id="cCsvTodos" disabled={!todosReg.length} onClick={() => baixarCsv("cobertura-todos-os-dias" + (reg ? "-" + reg.toLowerCase() : "") + ".csv", cab, todosReg.map(lin))}>CSV de todos os dias</button>
      <button className="btn small noprint" id="cCsvPl" onClick={() => baixarCsv("abrangencia-plantonistas.csv", ["Departamento", "Plantonista", "Cidade", "IBGE"],
        [...dados.abr.entries()].filter(([, p]) => plNaRegiao(p)).map(([i, p]) => [dados.deps.get(dados.del.get(p).departamento_id) || "", dados.del.get(p).nome, dados.mun.get(i).nome, i]).sort((a, c) => (a[0] + a[1] + a[2]).localeCompare(c[0] + c[1] + c[2])))}>CSV da abrangência</button>
      <button className="btn small noprint" id="cPrint" onClick={() => window.print()}>Imprimir</button></div>
    {rows.length ? <>
      <div className="cards">{SIT.map(([s, v]) => <button key={s} data-sit={s} aria-pressed={filtro === s} style={{ borderLeftColor: `var(${v})` }} onClick={() => setFiltro(f => f === s ? null : s)}><b>{cont.get(s)}</b><span>{s}</span></button>)}</div>
      <div className="panel"><input type="search" id="cBusca" className="noprint" placeholder="Filtrar cidade ou plantonista" value={busca} onChange={e => setBusca(e.target.value)} style={{ marginBottom: 10, maxWidth: 360 }} />
        <div className="scroll"><table><thead><tr><th>Cidade</th><th>Situação</th><th>Delegacia da cidade (horário)</th><th>Plantonista</th><th>Plantão</th><th>Descoberta</th></tr></thead>
          <tbody>{vis.length ? vis.map(r => { const s = SIT.find(x => x[0] === r.situacao); return <tr key={r.ibge}><td><b>{r.municipio}</b></td>
            <td><span className="chip" style={{ boxShadow: `inset 4px 0 0 var(${s ? (s[1] === "--c-sem" ? "--c-fech" : s[1]) : "--line"})` }}>{r.situacao}</span></td>
            <td className="wrap">{r.delegacias_proprias || "–"}</td><td className="wrap">{r.plantonista ? <>{r.plantonista} <small className="muted">{r.plantonista_departamento}</small></> : "–"}</td>
            <td>{r.horario_plantao || "–"}</td><td style={r.minutos_descobertos ? { color: "var(--danger)", fontWeight: 700 } : null}>{r.horario_descoberto || "–"}</td></tr>; })
            : <tr><td colSpan={6} className="muted">Nenhuma cidade com esse filtro.</td></tr>}</tbody></table></div></div>
    </> : <Vazio>Sem necessidade de efetivo com horário neste evento, ou fora do período analisado.</Vazio>}
    <div className="bar" style={{ marginTop: 18 }}><h2>Abrangência por plantonista{nomeReg ? " · " + nomeReg : ""}</h2></div>
    <div className="panel"><div className="scroll"><table><thead><tr><th>Departamento</th><th>Plantonista</th><th className="n">Cidades</th><th>Cidades na abrangência</th></tr></thead>
      <tbody>{plRows.length ? plRows.map(x => <tr key={x.p}><td>{x.dep}</td><td>{x.d.nome}</td><td className="n">{x.cs.length}</td><td className="wrap">{x.cs.join(", ")}</td></tr>) : <tr><td colSpan={4} className="muted">Nenhuma abrangência definida neste evento.</td></tr>}</tbody></table></div>
      {semPl.length > 0 && <p className="hint" style={{ marginTop: 10 }}><b>{semPl.length} cidades sem delegacia e sem plantonista:</b> {semPl.join(", ")}</p>}</div>
  </section>;
}
