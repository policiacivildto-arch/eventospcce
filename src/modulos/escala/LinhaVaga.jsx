// Uma vaga: busca o servidor (nome ou matrícula), "sem servidor" e limpar. Salva na hora.
import { useEffect, useRef, useState } from "react";
import { sb, msgErro } from "../../lib/supabase.js";
import { partes, fmtR } from "../../lib/util.js";
import { BadgeServico } from "../../componentes/Comuns.jsx";

export default function LinhaVaga({ v, dep, sigla, outros, podeEditar, aoMudar }) {
  const [texto, setTexto] = useState(v.servidor || "");
  const [itens, setItens] = useState(null);       // null = lista fechada
  const [sel, setSel] = useState(-1);
  const [msg, setMsg] = useState(null);           // {tipo, texto}
  const timer = useRef();
  useEffect(() => { setTexto(v.servidor || ""); }, [v.servidor]);
  const a = partes(v.inicio), b = partes(v.fim);
  const cls = !v.ativa ? "off" : v.matricula ? "done" : v.sem_servidor ? "sem" : "";

  const buscar = async t => {
    if (t.trim().length < 2) { setItens(null); return; }
    const { data, error } = await sb.rpc("buscar_servidores", { p_texto: t.trim(), p_cargo: v.cargo, p_dep: dep, p_outros: outros });
    if (error) { setMsg({ tipo: "err", texto: await msgErro(error) }); return; }
    setItens(data || []); setSel((data || []).length ? 0 : -1);
  };
  const salvar = async (mat, semServ) => {
    setMsg({ tipo: "", texto: "Salvando…" });
    const { error } = await sb.rpc("escalar", { p_vaga: v.vaga_id, p_matricula: mat, p_sem_servidor: semServ });
    if (error) { setMsg({ tipo: "err", texto: await msgErro(error) }); setTexto(v.servidor || ""); return false; }
    return true;
  };
  const escolher = async s => {
    setItens(null); setTexto(s.nome);
    if (await salvar(s.matricula, false)) {
      const outro = s.departamento !== sigla;
      aoMudar(v.vaga_id, { matricula: s.matricula, servidor: s.nome, sem_servidor: false, departamento_servidor: s.departamento, de_outro_departamento: outro });
      setMsg({ tipo: "ok", texto: "Salvo", outro: outro ? s.departamento : null });
    }
  };
  const marcarSem = async marcado => {
    if (await salvar(null, marcado)) { aoMudar(v.vaga_id, { matricula: null, servidor: null, sem_servidor: marcado, de_outro_departamento: false }); setMsg({ tipo: "ok", texto: "Salvo" }); }
  };
  const limpar = async () => {
    if (await salvar(null, false)) {
      if (!v.ativa) aoMudar(v.vaga_id, null);
      else { aoMudar(v.vaga_id, { matricula: null, servidor: null, sem_servidor: false, de_outro_departamento: false }); setMsg({ tipo: "ok", texto: "Salvo" }); }
    }
  };
  const tecla = e => {
    if (!itens) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s + 1, itens.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && sel >= 0) { e.preventDefault(); escolher(itens[sel]); }
    else if (e.key === "Escape") { setItens(null); setTexto(v.servidor || ""); }
  };

  let rodape;
  if (!v.ativa) rodape = <div className="msg err">Esta vaga saiu da necessidade de efetivo ou da autorização. Limpe o nome.</div>;
  else if (msg) rodape = <div className={"msg " + msg.tipo}>{msg.outro && <><span className="bdg outro">DE {msg.outro}</span> </>}{msg.texto}</div>;
  else if (v.de_outro_departamento) rodape = <div className="msg"><span className="bdg outro">DE {v.departamento_servidor}</span></div>;
  else rodape = <div className="msg">{v.matricula && <span className="muted">Mat. {v.matricula}</span>}</div>;

  return <div className={"vrow " + cls} data-id={v.vaga_id}>
    <div>
      <div className="badges"><span className={"bdg " + v.cargo}>{v.cargo}</span><BadgeServico s={v.servico} /></div>
      <div className="when">{a.h} → {b.h}{b.d !== a.d && <small> (sai {b.dd})</small>}</div>
      <div className="hint">{v.vaga}{v.servico === "Extra" ? " · " + fmtR(v.valor) : ""}</div>
    </div>
    <div className="who-cell">
      <input type="text" className="iNome" value={texto} autoComplete="off" disabled={!podeEditar || v.sem_servidor}
        placeholder={v.sem_servidor ? "SEM SERVIDOR" : "Nome do servidor (" + v.cargo + ")"} aria-label={"Servidor da vaga " + v.vaga}
        onChange={e => { setTexto(e.target.value); setMsg(null); clearTimeout(timer.current); const t = e.target.value; timer.current = setTimeout(() => buscar(t), 250); }}
        onKeyDown={tecla} onBlur={() => setTimeout(() => { setItens(null); setTexto(t => t !== (v.servidor || "") ? (v.servidor || "") : t); }, 150)} />
      {rodape}
      {itens && <div className="sug" role="listbox">
        {itens.length ? itens.map((s, k) => <button key={s.matricula} type="button" role="option" data-k={k} aria-selected={k === sel} onMouseDown={e => { e.preventDefault(); escolher(s); }}>
          {s.nome}<small>{s.matricula} · {s.cargo} · {s.departamento || ""}{s.lotacao ? " · " + s.lotacao : ""}</small></button>)
          : <div style={{ padding: 10 }} className="hint">Nenhum {v.cargo} encontrado{outros ? "" : " no departamento. Marque “Buscar servidor de outro departamento” para ampliar."}</div>}
      </div>}
    </div>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <label className="sem-chk"><input type="checkbox" className="cSem" checked={!!v.sem_servidor} disabled={!podeEditar} onChange={e => marcarSem(e.target.checked)} /> Sem servidor</label>
      {podeEditar && (v.matricula || v.sem_servidor) && <button className="btn small bLimpar" title="Limpar vaga" aria-label="Limpar vaga" onClick={limpar}>Limpar</button>}
    </div>
  </div>;
}
