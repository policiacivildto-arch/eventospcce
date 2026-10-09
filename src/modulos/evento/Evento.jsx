// Evento (DTO): abre e fecha o recebimento e a escala, acompanha os departamentos e cria eventos
import { useEffect, useState } from "react";
import { sb, msgErro } from "../../lib/supabase.js";
import { useApp } from "../../lib/contexto.js";
import { dataHoraBR } from "../../lib/util.js";
import { Chip } from "../../componentes/Comuns.jsx";

export default function Evento() {
  const { ev, avisar, carregarEventos, atualizarEvento } = useApp();
  const [deps, setDeps] = useState(null), [nome, setNome] = useState("");
  useEffect(() => { if (ev) sb.from("evento_departamentos").select("situacao,alterado_em,enviado_em,envios,departamentos(sigla)").eq("evento_id", ev.id).then(({ data }) => setDeps((data || []).sort((a, b) => a.departamentos.sigla.localeCompare(b.departamentos.sigla)))); }, [ev]);

  const definir = async (rec, esc) => {
    const { error } = await sb.rpc("definir_evento", { p_evento: ev.id, p_recebimento: rec, p_escala: esc });
    if (error) return avisar(await msgErro(error), true);
    atualizarEvento(rec !== null ? { recebimento_aberto: rec } : { escala_aberta: esc }); avisar("Evento atualizado.");
  };
  const criar = async () => {
    const { data, error } = await sb.rpc("criar_evento", { p_nome: nome });
    if (error) return avisar(await msgErro(error), true);
    setNome(""); await carregarEventos(data); avisar("Evento criado.");
  };

  return <>
    <div className="bar"><h2>Evento</h2></div>
    {ev && <>
      <section className="panel" style={{ marginBottom: 14 }}>
        <h3 style={{ marginBottom: 10 }}>{ev.nome}</h3>
        <label className="toggle"><input type="checkbox" id="eRec" checked={ev.recebimento_aberto} onChange={e => definir(e.target.checked, null)} /> Recebimento da necessidade de efetivo aberto (focais podem lançar e alterar)</label>
        <label className="toggle" style={{ marginTop: 8 }}><input type="checkbox" id="eEsc" checked={ev.escala_aberta} onChange={e => definir(null, e.target.checked)} /> Escala aberta (focais podem colocar nomes nas vagas)</label>
      </section>
      <section className="panel" style={{ marginBottom: 14 }}><h3 style={{ marginBottom: 10 }}>Situação dos departamentos</h3><div className="scroll" id="eDeps">
        {deps === null ? <p className="muted">Carregando…</p> : !deps.length ? <p className="muted">Nenhum departamento lançou necessidade de efetivo ainda.</p>
          : <table><thead><tr><th>Departamento</th><th>Situação</th><th>Última alteração</th><th>Enviado em</th><th className="n">Envios</th></tr></thead>
            <tbody>{deps.map((r, i) => <tr key={i}><td>{r.departamentos.sigla}</td><td><Chip tipo={r.situacao === "Enviado" ? "ok" : r.situacao === "Alterado após envio" ? "warn" : ""}>{r.situacao}</Chip></td>
              <td>{r.alterado_em ? dataHoraBR(r.alterado_em) : "–"}</td><td>{r.enviado_em ? dataHoraBR(r.enviado_em) : "–"}</td><td className="n">{r.envios}</td></tr>)}</tbody></table>}
      </div></section>
    </>}
    <section className="panel"><h3 style={{ marginBottom: 10 }}>Novo evento</h3>
      <div className="row"><label className="f" style={{ flex: 3 }}>Nome<input type="text" id="eNome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Carnaval 2027" /></label>
        <button className="btn primary" id="eCriar" style={{ flex: "0 0 auto" }} onClick={criar}>Criar evento</button></div>
    </section>
  </>;
}
