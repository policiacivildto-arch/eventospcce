// Vagas de uma delegacia, dia a dia
import { useState } from "react";
import { contagem } from "../../lib/regras.js";
import { dataBR, diaBR } from "../../lib/util.js";
import LinhaVaga from "./LinhaVaga.jsx";

export default function PainelDelegacia({ nome, vagas, dep, sigla, outros, podeEditar, aoMudarVaga }) {
  const dias = [...new Set(vagas.map(v => v.data))].sort();
  const [dia, setDia] = useState(dias[0]);
  const d = dias.includes(dia) ? dia : dias[0];
  const i = dias.indexOf(d), c = contagem(vagas);
  return <>
    <div className="dhead"><h3>{nome}</h3><span className="hint">{c.nome}/{c.total} com nome · {c.sem} sem servidor · {c.abertas} em aberto{c.extra ? ` · ${c.extra} extra` : ""}</span></div>
    <div className="days" role="tablist">{dias.map((x, k) => { const cd = contagem(vagas.filter(v => v.data === x)); return <button key={x} role="tab" data-dia={x} aria-selected={x === d} onClick={() => setDia(x)}>
      <b>Dia {k + 1} de {dias.length} · {dataBR(x).slice(0, 5)}</b><span>{diaBR(x).split(",")[0]} · {cd.abertas ? cd.abertas + " em aberto" : "completo"}</span></button>; })}</div>
    <p className="hint" style={{ marginBottom: 10 }}>Digite o nome ou a matrícula e escolha na lista. Salva na hora. Cargo, horário e tipo de serviço vêm da necessidade de efetivo{c.extra ? " e da autorização do aporte" : ""}.</p>
    <div id="vRows">{vagas.filter(v => v.data === d).map(v => <LinhaVaga key={v.vaga_id} v={v} dep={dep} sigla={sigla} outros={outros} podeEditar={podeEditar} aoMudar={aoMudarVaga} />)}</div>
    <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
      <button className="btn" id="bAnt" disabled={i <= 0} onClick={() => setDia(dias[i - 1])}>← Dia anterior</button>
      <button className="btn primary" id="bProx" disabled={i >= dias.length - 1} onClick={() => setDia(dias[i + 1])}>Próximo dia →</button>
    </div>
  </>;
}
