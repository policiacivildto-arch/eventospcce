// Lista de delegacias com o andamento do preenchimento
import { contagem } from "../../lib/regras.js";
import { Vazio } from "../../componentes/Comuns.jsx";

export default function ListaDelegacias({ porDel, atual, filtro, soAbertas, aoEscolher }) {
  if (!porDel.size) return <Vazio>Nenhuma vaga para este departamento neste evento. As vagas aparecem quando a necessidade de efetivo é lançada (as extras, depois da autorização do aporte).</Vazio>;
  const f = filtro.trim().toLowerCase();
  const itens = [...porDel.entries()].filter(([n, vs]) => (!f || n.toLowerCase().includes(f)) && (!soAbertas || contagem(vs).abertas > 0));
  if (!itens.length) return <p className="muted">Nenhuma delegacia com esse filtro.</p>;
  return itens.map(([n, vs]) => {
    const c = contagem(vs), pp = c.total ? c.nome / c.total * 100 : 0, ps = c.total ? c.sem / c.total * 100 : 0;
    return <button key={n} className="ditem" data-del={n} aria-current={n === atual} onClick={() => aoEscolher(n)}>
      <span className="n">{n}</span>
      <span className="prog" aria-hidden="true"><i className="p" style={{ width: pp + "%" }} /><i className="s" style={{ width: ps + "%" }} /></span>
      <span className="m"><span>{c.nome} de {c.total} com nome{c.sem ? ` · ${c.sem} sem servidor` : ""}</span>
        <span>{c.abertas ? <b style={{ color: "var(--danger)" }}>{c.abertas} em aberto</b> : <b style={{ color: "var(--ok)" }}>completa</b>}{c.fora ? <> · <b style={{ color: "var(--danger)" }}>{c.fora} fora</b></> : null}</span></span>
    </button>;
  });
}
