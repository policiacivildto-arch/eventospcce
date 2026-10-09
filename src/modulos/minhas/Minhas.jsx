// Minhas escalas: o servidor vê onde e quando está escalado
import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase.js";
import { useApp } from "../../lib/contexto.js";
import { partes, diaBR } from "../../lib/util.js";
import { Vazio, Erro, BadgeServico } from "../../componentes/Comuns.jsx";

export default function Minhas() {
  const { perfil } = useApp();
  const [lista, setLista] = useState(null), [erro, setErro] = useState("");
  useEffect(() => { sb.from("escala_vagas").select("*").eq("matricula", perfil.matricula).order("inicio").then(({ data, error }) => error ? setErro(error.message) : setLista(data)); }, [perfil.matricula]);
  return <>
    <div className="bar"><h2>Minhas escalas</h2></div>
    <div id="mLista"><Erro>{erro}</Erro>
      {!lista ? (!erro && <p className="muted">Carregando…</p>) : !lista.length ? <Vazio>Você ainda não foi escalado(a) em nenhum evento.</Vazio>
        : lista.map(v => { const a = partes(v.inicio), b = partes(v.fim); return <div className="pcard" key={v.vaga_id}>
          <div className="badges"><span className={"bdg " + v.cargo}>{v.cargo}</span><BadgeServico s={v.servico} /></div>
          <h4>{diaBR(v.data)} · {a.h} → {b.h}{b.d !== a.d ? ` (sai ${b.dd})` : ""}</h4>
          <p>{v.delegacia_nome} · <span className="muted">{v.departamento}</span></p></div>; })}
    </div>
  </>;
}
