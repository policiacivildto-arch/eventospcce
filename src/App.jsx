// Casca do sistema: entrada, cabeçalho, escolha do evento e abas.
// Cada aba é um módulo independente em src/modulos/.
import { useCallback, useEffect, useMemo, useState } from "react";
import { sb } from "./lib/supabase.js";
import { Contexto } from "./lib/contexto.js";
import { guardar, ler } from "./lib/util.js";
import { useAviso } from "./componentes/Aviso.jsx";
import { Vazio } from "./componentes/Comuns.jsx";
import Entrada from "./entrada/Entrada.jsx";
import Necessidade from "./modulos/necessidade/Necessidade.jsx";
import Escala from "./modulos/escala/Escala.jsx";
import Resumo from "./modulos/resumo/Resumo.jsx";
import Relatorio from "./modulos/relatorio/Relatorio.jsx";
import Cobertura from "./modulos/cobertura/Cobertura.jsx";
import Versoes from "./modulos/versoes/Versoes.jsx";
import Evento from "./modulos/evento/Evento.jsx";
import Minhas from "./modulos/minhas/Minhas.jsx";

/* [chave, título, componente, quem vê] */
const ABAS = [
  ["pedido", "Necessidade de efetivo", Necessidade, "gestor"],
  ["escala", "Escala", Escala, "gestor"],
  ["resumo", "Resumo", Resumo, "gestor"],
  ["relatorio", "Relatório", Relatorio, "gestor"],
  ["cobertura", "Cobertura", Cobertura, "gestor"],
  ["versoes", "Versões e aporte", Versoes, "dto"],
  ["evento", "Evento", Evento, "dto"],
  ["minhas", "Minhas escalas", Minhas, "todos"],
];

export default function App() {
  const [avisar, aviso] = useAviso();
  const [estado, setEstado] = useState("carregando");   // carregando | fora | dentro
  const [erroEntrada, setErroEntrada] = useState("");
  const [perfil, setPerfil] = useState(null);
  const [deps, setDeps] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [evId, setEvId] = useState(null);
  const [aba, setAba] = useState(null);

  const carregarEventos = useCallback(async preferido => {
    const { data } = await sb.from("eventos").select("*").order("criado_em", { ascending: false });
    const lista = data || []; setEventos(lista);
    const salvo = preferido || ler("pe-ev");
    setEvId((lista.find(e => e.id === salvo) || lista[0] || {}).id || null);
  }, []);

  const iniciar = useCallback(async () => {
    const { data: s } = await sb.auth.getSession();
    if (!s.session) { setEstado("fora"); return; }
    const { data: p, error } = await sb.rpc("meu_perfil");
    if (error || !p) { await sb.auth.signOut(); setErroEntrada("Seu e-mail não está ligado a um servidor ativo. Procure o DTO."); setEstado("fora"); return; }
    setPerfil(p);
    if (p.dto) { const { data } = await sb.from("departamentos").select("id,sigla").order("sigla"); setDeps(data || []); }
    else setDeps(p.focal_de);
    await carregarEventos();
    setEstado("dentro");
  }, [carregarEventos]);

  useEffect(() => { iniciar(); const r = sb.auth.onAuthStateChange(ev => { if (ev === "SIGNED_OUT") setEstado("fora"); }); return () => r?.data?.subscription?.unsubscribe?.(); }, [iniciar]);

  const ev = eventos.find(e => e.id === evId) || null;
  const abas = useMemo(() => {
    if (!perfil) return [];
    const gestor = perfil.dto || perfil.focal_de.length > 0;
    return ABAS.filter(([, , , q]) => q === "todos" || (q === "gestor" && gestor) || (q === "dto" && perfil.dto));
  }, [perfil]);
  useEffect(() => { if (abas.length && !abas.some(a => a[0] === aba)) { const s = ler("pe-tab"); setAba(abas.some(a => a[0] === s) ? s : abas[0][0]); } }, [abas, aba]);

  const atualizarEvento = useCallback(mudanca => setEventos(es => es.map(e => e.id === evId ? { ...e, ...mudanca } : e)), [evId]);
  const ctx = useMemo(() => ({ perfil, deps, eventos, ev, avisar, carregarEventos, atualizarEvento }), [perfil, deps, eventos, ev, avisar, carregarEventos, atualizarEvento]);

  if (estado === "carregando") return <>{aviso}</>;
  if (estado === "fora") return <><Entrada aoEntrar={() => { setErroEntrada(""); iniciar(); }} erroInicial={erroEntrada} avisar={avisar} />{aviso}</>;

  const Tela = (abas.find(a => a[0] === aba) || [])[2];
  const semEvento = !ev && aba !== "evento" && aba !== "minhas";
  return <Contexto.Provider value={ctx}>
    <div id="vApp">
      <header className="band"><div className="in">
        <h1>Plantão Eleições</h1>
        <label className="f" style={{ color: "inherit", minWidth: 220 }}>Evento
          <select id="sEv" aria-label="Evento" value={evId || ""} onChange={e => { setEvId(e.target.value); guardar("pe-ev", e.target.value); }}>
            {eventos.length ? eventos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>) : <option value="">Nenhum evento</option>}
          </select></label>
        <div className="who"><b id="uNome">{perfil.nome}</b><br /><span id="uPapel">{perfil.dto ? "DTO · acesso total" : perfil.focal_de.length ? "Focal · " + perfil.focal_de.map(d => d.sigla).join(", ") : perfil.cargo + " · " + (perfil.departamento || "")}</span></div>
        <button className="btn small" id="bSair" onClick={async () => { await sb.auth.signOut(); setEstado("fora"); }}>Sair</button>
      </div></header>
      <nav className="tabs"><div className="in" role="tablist" id="tabs">
        {abas.map(([k, t]) => <button key={k} role="tab" data-tab={k} aria-selected={k === aba} onClick={() => { setAba(k); guardar("pe-tab", k); }}>{t}</button>)}
      </div></nav>
      <main id="main">
        {semEvento ? <Vazio>Nenhum evento criado ainda.{perfil.dto ? " Crie o primeiro na aba Evento." : ""}</Vazio>
          : Tela && <Tela key={aba + (ev ? ev.id : "")} />}
      </main>
    </div>
    {aviso}
  </Contexto.Provider>;
}
