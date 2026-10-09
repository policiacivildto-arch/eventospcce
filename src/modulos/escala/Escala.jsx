// Escala: o focal coloca nomes nas vagas geradas pela necessidade de efetivo
import { useCallback, useEffect, useMemo, useState } from "react";
import { sb, todos } from "../../lib/supabase.js";
import { useApp } from "../../lib/contexto.js";
import { partes, dataBR, baixarCsv } from "../../lib/util.js";
import { Vazio, Erro, SelDepartamento } from "../../componentes/Comuns.jsx";
import ListaDelegacias from "./ListaDelegacias.jsx";
import PainelDelegacia from "./PainelDelegacia.jsx";

export default function Escala() {
  const { perfil, deps, ev } = useApp();
  const [dep, setDep] = useState(deps[0]?.id);
  const [vagas, setVagas] = useState(null);
  const [erro, setErro] = useState("");
  const [del, setDel] = useState(null);
  const [outros, setOutros] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [soAbertas, setSoAbertas] = useState(false);

  const carregar = useCallback(async () => {
    try { setVagas(await todos(() => sb.from("escala_vagas").select("*").eq("evento_id", ev.id).eq("departamento_id", dep).order("delegacia_nome").order("inicio").order("vaga"))); }
    catch (e) { setErro(e.message); }
  }, [ev.id, dep]);
  useEffect(() => { if (dep) carregar(); }, [dep, carregar]);

  const porDel = useMemo(() => { const m = new Map(); (vagas || []).forEach(v => { if (!m.has(v.delegacia_nome)) m.set(v.delegacia_nome, []); m.get(v.delegacia_nome).push(v); }); return m; }, [vagas]);
  useEffect(() => { if (vagas && (!del || !porDel.has(del))) setDel(porDel.keys().next().value || null); }, [vagas, porDel, del]);

  if (!deps.length) return <Vazio>Você não é focal de nenhum departamento.</Vazio>;
  const sigla = (deps.find(d => d.id === dep) || {}).sigla || "";
  const fechada = !ev.escala_aberta;

  /* atualiza uma vaga depois de salvar (sem recarregar tudo) */
  const mudarVaga = (id, mud) => setVagas(vs => mud === null ? vs.filter(v => v.vaga_id !== id) : vs.map(v => v.vaga_id === id ? { ...v, ...mud } : v));

  const csv = () => baixarCsv("escala-" + sigla + ".csv",
    ["Data", "Delegacia", "Vaga", "Cargo", "Serviço", "Entrada", "Saída", "Matrícula", "Servidor", "Departamento do servidor", "Situação", "Valor"],
    (vagas || []).map(v => { const a = partes(v.inicio), b = partes(v.fim); return [dataBR(v.data), v.delegacia_nome, v.vaga, v.cargo, v.servico, a.dd + " " + a.h, b.dd + " " + b.h, v.matricula || "", v.servidor || "", v.departamento_servidor || "", !v.ativa ? "Fora da necessidade" : v.matricula ? "Escalado" : v.sem_servidor ? "Sem servidor" : "Em aberto", String(v.valor).replace(".", ",")]; }));

  return <>
    {fechada && <div className="banner warn">{perfil.dto ? "A escala deste evento está fechada para os departamentos. Como DTO você ainda pode alterar." : "A escala deste evento ainda não foi aberta pelo DTO. Você pode consultar, mas não alterar."}</div>}
    <div className="bar">
      <h2>Escala {sigla}</h2>
      <SelDepartamento valor={dep} onChange={d => { setDep(d); setDel(null); setVagas(null); }} />
      <label className="toggle"><input type="checkbox" id="cOutros" checked={outros} onChange={e => setOutros(e.target.checked)} /> Buscar servidor de outro departamento</label>
      <button className="btn small" id="bCsv" onClick={csv} disabled={!vagas}>Baixar CSV</button>
    </div>
    <Erro>{erro}</Erro>
    <div className="esc">
      <div>
        <input type="search" id="iFiltro" placeholder="Filtrar delegacia" aria-label="Filtrar delegacia" value={filtro} onChange={e => setFiltro(e.target.value)} style={{ marginBottom: 8 }} />
        <label className="toggle hint" style={{ marginBottom: 8 }}><input type="checkbox" id="cAbertas" checked={soAbertas} onChange={e => setSoAbertas(e.target.checked)} /> Só delegacias com vaga em aberto</label>
        <div className="dlist" id="dList">{vagas === null ? <p className="muted">Carregando…</p>
          : <ListaDelegacias porDel={porDel} atual={del} filtro={filtro} soAbertas={soAbertas} aoEscolher={n => { setDel(n); if (matchMedia("(max-width:900px)").matches) document.getElementById("dPanel")?.scrollIntoView({ block: "start" }); }} />}</div>
      </div>
      <section className="panel" id="dPanel">{del ? <PainelDelegacia key={del} nome={del} vagas={porDel.get(del) || []} dep={dep} sigla={sigla} outros={outros} podeEditar={ev.escala_aberta || perfil.dto} aoMudarVaga={mudarVaga} />
        : <p className="muted">Escolha uma delegacia.</p>}</section>
    </div>
  </>;
}
