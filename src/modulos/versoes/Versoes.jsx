// Versões (DTO): fecha cópias congeladas da necessidade de efetivo e autoriza o aporte de uma delas
import { useCallback, useEffect, useState } from "react";
import { sb, msgErro } from "../../lib/supabase.js";
import { useApp } from "../../lib/contexto.js";
import { fmtN, fmtR, dataHoraBR } from "../../lib/util.js";
import { Vazio, Erro, Carregando, Chip } from "../../componentes/Comuns.jsx";

export default function Versoes() {
  const { ev, avisar } = useApp();
  const [lista, setLista] = useState(null), [erro, setErro] = useState(""), [motivo, setMotivo] = useState(""), [ocupado, setOcupado] = useState(false);
  const carregar = useCallback(async () => {
    const { data, error } = await sb.from("versoes").select("id,numero,motivo,fechada_em,fechada_por,delegacias,vagas,horas,custo,aporte_autorizado,autorizado_em,autorizado_por").eq("evento_id", ev.id).order("numero", { ascending: false });
    if (error) setErro(error.message); else setLista(data);
  }, [ev.id]);
  useEffect(() => { carregar(); }, [carregar]);

  const fechar = async () => {
    setOcupado(true);
    const { error } = await sb.rpc("fechar_versao", { p_evento: ev.id, p_motivo: motivo.trim() || null });
    setOcupado(false);
    if (error) avisar(await msgErro(error), true); else { avisar("Versão fechada."); setMotivo(""); carregar(); }
  };
  const autorizar = async v => {
    if (!confirm("Autorizar o aporte da Versão " + v.numero + "? As vagas Extra desta versão passam a aparecer para os departamentos. Se outra versão estava autorizada, ela deixa de valer.")) return;
    const { data: n, error } = await sb.rpc("autorizar_aporte", { p_versao: v.id });
    if (error) avisar(await msgErro(error), true); else { avisar("Aporte autorizado. " + fmtN(n) + " vagas ativas no evento."); carregar(); }
  };

  return <>
    <div className="bar"><h2>Versões e autorização do aporte</h2></div>
    <section className="panel" style={{ marginBottom: 14 }}>
      <div className="row"><label className="f" style={{ flex: 3 }}>Motivo desta versão<input type="text" id="vMotivo" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex.: Versão inicial / Ajuste após reunião com DPI Sul" /></label>
        <button className="btn primary" id="vFechar" style={{ flex: "0 0 auto" }} disabled={ocupado} onClick={fechar}>Fechar versão</button></div>
      <p className="hint" style={{ marginTop: 8 }}>Fecha uma cópia congelada da necessidade de efetivo atual de todos os departamentos, com o custo calculado. Depois, autorize o aporte da versão aprovada: só então as vagas Extra aparecem para os departamentos.</p>
    </section>
    <div className="panel"><div className="scroll" id="vTab">
      <Erro>{erro}</Erro>
      {!lista ? (!erro && <Carregando />) : !lista.length ? <Vazio>Nenhuma versão fechada ainda.</Vazio>
        : <table><thead><tr><th>Versão</th><th>Fechada em</th><th>Motivo</th><th className="n">Delegacias</th><th className="n">Vagas</th><th className="n">Horas</th><th className="n">Custo</th><th>Aporte</th><th></th></tr></thead>
          <tbody>{lista.map((v, i) => { const prox = lista[i + 1], dif = prox ? v.custo - prox.custo : null;
            return <tr key={v.id}><td><b>Versão {v.numero}</b></td><td>{dataHoraBR(v.fechada_em)}</td><td>{v.motivo || "–"}</td><td className="n">{v.delegacias}</td><td className="n">{fmtN(v.vagas)}</td><td className="n">{fmtN(v.horas)}</td>
              <td className="n">{fmtR(v.custo)}{dif !== null && Math.abs(dif) > .004 && <><br /><small style={{ color: dif > 0 ? "var(--danger)" : "var(--ok)" }}>{dif > 0 ? "+" : "−"}{fmtR(Math.abs(dif))}</small></>}</td>
              <td>{v.aporte_autorizado ? <><Chip tipo="ok">Autorizado</Chip><br /><small className="muted">{dataHoraBR(v.autorizado_em)}</small></> : "–"}</td>
              <td>{!v.aporte_autorizado && <button className="btn small" data-aut={v.id} onClick={() => autorizar(v)}>Autorizar aporte</button>}</td></tr>; })}</tbody></table>}
    </div></div>
  </>;
}
