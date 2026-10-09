// Delegacias já lançadas, com editar e excluir
import { sb, msgErro } from "../../lib/supabase.js";
import { useApp } from "../../lib/contexto.js";
import { dataBR } from "../../lib/util.js";
import { Vazio } from "../../componentes/Comuns.jsx";

function linhasEfetivo(efs) {
  return efs.slice().sort((a, b) => a.entrada.localeCompare(b.entrada)).map((e, i) =>
    <li key={i}>{e.qtd} {e.cargo} · {e.servico} · {e.entrada.slice(0, 5)}–{e.saida.slice(0, 5)}{e.entrada === e.saida ? " (24h)" : ""}</li>);
}

export default function ListaNecessidade({ lista, aoEditar, aoMudar }) {
  const { avisar } = useApp();
  if (!lista.length) return <Vazio>Nenhuma delegacia lançada. Use o formulário ao lado: dá para marcar várias de uma vez.</Vazio>;
  const tot = lista.reduce((s, d) => s + d.pedido_efetivo.reduce((a, e) => a + e.qtd, 0), 0);
  const excluir = async d => {
    if (!confirm("Excluir " + d.delegacia_nome + " da necessidade de efetivo? As vagas dela saem da escala (as que já têm nome ficam marcadas para o DTO).")) return;
    const { error } = await sb.rpc("excluir_pedido_delegacia", { p_id: d.id });
    if (error) avisar(await msgErro(error), true); else { avisar("Delegacia excluída."); aoMudar(); }
  };
  return <>
    <p className="hint" style={{ marginBottom: 8 }}>{lista.length} delegacia(s) · {tot} policiais por dia</p>
    {lista.map(d => <div className="pcard" key={d.id}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div><h4>{d.delegacia_nome} <span className={"bdg " + (d.tipo === "Extra" ? "Extra" : "ord")}>{d.tipo.toUpperCase()}</span></h4>
          <p className="hint">{dataBR(d.data_ini)}{d.data_fim ? " a " + dataBR(d.data_fim) : ""} · funciona {d.abre.slice(0, 5)}{d.abre === d.fecha ? " (24h)" : "–" + d.fecha.slice(0, 5)}{d.fim_ultimo_dia ? " · último dia até " + d.fim_ultimo_dia.slice(0, 5) : ""}</p></div>
        <div style={{ display: "flex", gap: 6, alignItems: "start" }}>
          <button className="btn small" data-ed={d.id} onClick={() => aoEditar(d)}>Editar</button>
          <button className="btn small danger" data-ex={d.id} onClick={() => excluir(d)}>Excluir</button></div>
      </div>
      <ul>{linhasEfetivo(d.pedido_efetivo)}</ul>
    </div>)}
  </>;
}
