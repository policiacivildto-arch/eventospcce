// Resumo: vagas autorizadas × escaladas, por departamento, serviço e cargo
import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase.js";
import { useApp } from "../../lib/contexto.js";
import { fmtN, fmtR } from "../../lib/util.js";
import { Vazio, Erro, Carregando } from "../../componentes/Comuns.jsx";

const CAMPOS = ["vagas", "preenchidas", "sem_servidor", "em_aberto", "escalados_sem_vaga", "valor_autorizado", "valor_escalado"];

export default function Resumo() {
  const { ev } = useApp();
  const [dados, setDados] = useState(null), [erro, setErro] = useState("");
  useEffect(() => { sb.from("resumo_escala").select("*").eq("evento_id", ev.id).order("departamento").order("servico").order("cargo").then(({ data, error }) => error ? setErro(error.message) : setDados(data)); }, [ev.id]);
  const T = Object.fromEntries(CAMPOS.map(k => [k, (dados || []).reduce((s, r) => s + (Number(r[k]) || 0), 0)]));
  return <>
    <div className="bar"><h2>Resumo: autorizado × escalado</h2></div>
    <div className="panel"><div className="scroll" id="rTab">
      <Erro>{erro}</Erro>
      {!dados ? (!erro && <Carregando />) : !dados.length ? <Vazio>Ainda não há vagas neste evento.</Vazio>
        : <table><thead><tr><th>Departamento</th><th>Serviço</th><th>Cargo</th><th className="n">Vagas</th><th className="n">Com nome</th><th className="n">Sem servidor</th><th className="n">Em aberto</th><th className="n">Fora da necessidade</th><th className="n">Valor autorizado</th><th className="n">Valor escalado</th></tr></thead>
          <tbody>{dados.map((r, i) => <tr key={i}><td>{r.departamento}</td><td>{r.servico}</td><td>{r.cargo}</td><td className="n">{fmtN(r.vagas)}</td><td className="n">{fmtN(r.preenchidas)}</td><td className="n">{fmtN(r.sem_servidor)}</td>
            <td className="n" style={r.em_aberto > 0 ? { color: "var(--danger)", fontWeight: 700 } : null}>{fmtN(r.em_aberto)}</td><td className="n">{fmtN(r.escalados_sem_vaga)}</td><td className="n">{fmtR(r.valor_autorizado)}</td><td className="n">{fmtR(r.valor_escalado)}</td></tr>)}</tbody>
          <tfoot><tr><td colSpan={3}>Total</td>{CAMPOS.map(k => <td key={k} className="n">{k.startsWith("valor") ? fmtR(T[k]) : fmtN(T[k])}</td>)}</tr></tfoot></table>}
    </div></div>
  </>;
}
