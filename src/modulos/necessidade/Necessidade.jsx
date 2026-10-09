// Necessidade de efetivo: o focal lança as delegacias, horários e efetivo do departamento
import { useCallback, useEffect, useState } from "react";
import { sb, msgErro } from "../../lib/supabase.js";
import { useApp } from "../../lib/contexto.js";
import { Vazio, Erro, Chip, SelDepartamento } from "../../componentes/Comuns.jsx";
import ListaNecessidade from "./ListaNecessidade.jsx";
import FormNecessidade from "./FormNecessidade.jsx";

export default function Necessidade() {
  const { perfil, deps, ev, avisar } = useApp();
  const [dep, setDep] = useState(deps[0]?.id);
  const [lista, setLista] = useState(null);
  const [cadastro, setCadastro] = useState([]);
  const [situacao, setSituacao] = useState(null);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");
  const bloqueado = !ev.recebimento_aberto && !perfil.dto;

  const carregar = useCallback(async () => {
    const [l, c, s] = await Promise.all([
      sb.from("pedido_delegacias").select("*, pedido_efetivo(*)").eq("evento_id", ev.id).eq("departamento_id", dep).order("delegacia_nome").order("data_ini"),
      sb.from("delegacias").select("id,nome").eq("departamento_id", dep).eq("ativa", true).order("nome"),
      sb.from("evento_departamentos").select("situacao,enviado_em,envios").eq("evento_id", ev.id).eq("departamento_id", dep).maybeSingle()]);
    if (l.error) return setErro(l.error.message);
    setLista(l.data || []); setCadastro(c.data || []); setSituacao(s.data || null);
  }, [ev.id, dep]);
  useEffect(() => { if (dep) carregar(); }, [dep, carregar]);

  if (!deps.length) return <Vazio>Você não é focal de nenhum departamento.</Vazio>;
  const sigla = (deps.find(d => d.id === dep) || {}).sigla || "";

  const enviar = async () => {
    const { error } = await sb.rpc("enviar_pedido", { p_evento: ev.id, p_dep: dep });
    if (error) avisar(await msgErro(error), true); else { avisar("Necessidade de efetivo enviada ao DTO."); carregar(); }
  };
  const sit = situacao ? situacao.situacao : "Aguardando";

  return <>
    {!ev.recebimento_aberto && <div className="banner warn">O recebimento da necessidade de efetivo deste evento foi encerrado pelo DTO.{perfil.dto ? " Como DTO você ainda pode alterar." : ""}</div>}
    <div className="bar">
      <h2>Necessidade de efetivo · {sigla}</h2>
      <SelDepartamento valor={dep} onChange={d => { setDep(d); setEditando(null); }} />
      <Chip tipo={sit === "Enviado" ? "ok" : sit === "Alterado após envio" ? "warn" : ""}>{sit}</Chip>
      <button className="btn primary small" id="bEnviarPed" disabled={bloqueado} onClick={enviar}>Enviar ao DTO</button>
    </div>
    <p className="hint" style={{ marginBottom: 12 }}>Vagas ordinárias, de compensação e extra sem aporte aparecem na escala assim que a necessidade é salva. As vagas <b>Extra</b> só aparecem depois que o DTO autoriza o aporte.</p>
    <Erro>{erro}</Erro>
    <div className="pgrid">
      <div id="pLista">{lista === null ? <p className="muted">Carregando…</p>
        : <ListaNecessidade lista={lista} aoEditar={d => { setEditando(d); document.getElementById("pForm")?.scrollIntoView({ block: "start" }); }} aoMudar={carregar} />}</div>
      <section className="panel" id="pForm">
        {lista !== null && <FormNecessidade key={editando ? editando.id : "novo"} d={editando} dep={dep} lista={lista} cadastro={cadastro} bloqueado={bloqueado}
          aoCancelar={() => setEditando(null)} aoSalvar={async () => { setEditando(null); await carregar(); }} />}
      </section>
    </div>
  </>;
}
