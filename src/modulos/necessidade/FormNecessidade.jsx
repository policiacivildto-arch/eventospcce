// Formulário: lança uma ou várias delegacias com o mesmo funcionamento e efetivo, ou edita uma
import { useMemo, useState } from "react";
import { sb, msgErro } from "../../lib/supabase.js";
import { useApp } from "../../lib/contexto.js";
import { SERV } from "../../lib/util.js";

const novoGrupo = (b) => b ? { ...b } : { cargo: "OIP", qtd: 1, servico: "Ordinário", entrada: "08:00", saida: "20:00" };

export default function FormNecessidade({ d, dep, lista, cadastro, bloqueado, aoCancelar, aoSalvar }) {
  const { ev, avisar } = useApp();
  const [nome, setNome] = useState(d ? d.delegacia_nome : "");
  const [marcadas, setMarcadas] = useState(new Set());
  const [busca, setBusca] = useState("");
  const [outra, setOutra] = useState("");
  const [f, setF] = useState({ tipo: d ? d.tipo : "Ordinária", ini: d ? d.data_ini : "", fim: d && d.data_fim ? d.data_fim : "",
    abre: d ? d.abre.slice(0, 5) : "08:00", fecha: d ? d.fecha.slice(0, 5) : "08:00", ult: d && d.fim_ultimo_dia ? d.fim_ultimo_dia.slice(0, 5) : "" });
  const [grupos, setGrupos] = useState(d ? d.pedido_efetivo.map(e => ({ ...e, entrada: e.entrada.slice(0, 5), saida: e.saida.slice(0, 5) })) : [novoGrupo()]);
  const [erro, setErro] = useState("");
  const [gravando, setGravando] = useState("");

  const visiveis = useMemo(() => { const t = busca.trim().toLowerCase(); return cadastro.filter(c => !t || c.nome.toLowerCase().includes(t)); }, [cadastro, busca]);
  const jaLancada = c => lista.filter(x => x.delegacia_id === c.id || x.delegacia_nome === c.nome).length;
  const n = marcadas.size + (outra.trim() ? 1 : 0);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const setG = (i, k, v) => setGrupos(gs => gs.map((g, j) => j === i ? { ...g, [k]: k === "qtd" ? parseInt(v) : v } : g));

  const salvar = async () => {
    setErro("");
    let alvos;
    if (d) {
      if (!nome.trim()) return setErro("Informe a delegacia.");
      const cad = cadastro.find(c => c.nome.toLowerCase() === nome.trim().toLowerCase());
      alvos = [{ id: cad ? cad.id : null, nome: cad ? cad.nome : nome.trim() }];
    } else {
      alvos = cadastro.filter(c => marcadas.has(c.id)).map(c => ({ id: c.id, nome: c.nome }));
      const o = outra.trim();
      if (o && !alvos.some(a => a.nome.toLowerCase() === o.toLowerCase())) { const cad = cadastro.find(c => c.nome.toLowerCase() === o.toLowerCase()); alvos.push({ id: cad ? cad.id : null, nome: cad ? cad.nome : o }); }
      if (!alvos.length) return setErro("Marque pelo menos uma delegacia.");
    }
    if (!f.ini) return setErro("Informe a data inicial.");
    if (f.fim && f.fim < f.ini) return setErro("A data final é anterior à inicial.");
    if (grupos.some(x => !(x.qtd >= 1) || !x.entrada || !x.saida)) return setErro("Preencha quantidade, entrada e saída de todos os grupos.");
    if (!d && alvos.length > 1 && !confirm("Lançar o mesmo funcionamento e efetivo em " + alvos.length + " delegacias?")) return;

    const base = { evento_id: ev.id, departamento_id: dep, tipo: f.tipo, data_ini: f.ini, data_fim: f.fim && f.fim !== f.ini ? f.fim : "",
      abre: f.abre || "08:00", fecha: f.fecha || "08:00", fim_ultimo_dia: f.ult || "", efetivo: grupos };
    const falhas = [];
    for (let i = 0; i < alvos.length; i++) {
      setGravando(alvos.length > 1 ? `Gravando ${i + 1} de ${alvos.length}…` : "Gravando…");
      const p = { ...base, id: d ? d.id : undefined, delegacia_id: alvos[i].id, delegacia_nome: alvos[i].nome };
      const { error } = await sb.rpc("salvar_pedido_delegacia", { p });
      if (error) falhas.push(alvos[i].nome + ": " + await msgErro(error));
    }
    setGravando("");
    if (falhas.length === alvos.length) return setErro(falhas.join(" · "));
    avisar(d ? "Delegacia atualizada." : `${alvos.length - falhas.length} delegacia(s) lançada(s).` + (falhas.length ? ` ${falhas.length} com erro.` : ""), !!falhas.length);
    if (falhas.length) setErro("Não gravadas: " + falhas.join(" · "));
    await aoSalvar();
  };

  return <>
    <h3 style={{ marginBottom: 12 }}>{d ? "Editando " + d.delegacia_nome : "Lançar delegacias"}</h3>
    <fieldset style={{ border: 0, padding: 0, margin: 0 }} disabled={bloqueado || !!gravando}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {d ? <label className="f">Delegacia<input type="text" id="fNomeDel" list="dlCad" value={nome} onChange={e => setNome(e.target.value)} autoComplete="off" />
          <datalist id="dlCad">{cadastro.map(c => <option key={c.id} value={c.nome} />)}</datalist></label>
          : <div className="f">Delegacias <span className="hint" id="fQtdSel" style={{ fontWeight: 600 }}>{n ? n + " marcada(s)" : "nenhuma marcada"}</span>
            <div className="row" style={{ gap: 6 }}>
              <input type="search" id="fBuscaDel" placeholder="Filtrar delegacias" value={busca} onChange={e => setBusca(e.target.value)} style={{ flex: "1 1 160px" }} />
              <button type="button" className="btn small" id="fTodas" style={{ flex: "0 0 auto" }} onClick={() => setMarcadas(s => new Set([...s, ...visiveis.map(c => c.id)]))}>Marcar visíveis</button>
              <button type="button" className="btn small" id="fNenhuma" style={{ flex: "0 0 auto" }} onClick={() => setMarcadas(new Set())}>Limpar</button></div>
            <div className="multi" id="fMulti">
              {visiveis.map(c => { const ja = jaLancada(c); return <label key={c.id}>
                <input type="checkbox" value={c.id} checked={marcadas.has(c.id)} onChange={e => setMarcadas(s => { const x = new Set(s); e.target.checked ? x.add(c.id) : x.delete(c.id); return x; })} />
                <span>{c.nome}</span>{ja ? <small className="chip warn">já lançada{ja > 1 ? " " + ja + "x" : ""}</small> : null}</label>; })}
              {!cadastro.length && <p className="muted" style={{ padding: 8 }}>Nenhuma delegacia cadastrada neste departamento.</p>}
            </div>
            <label className="f" style={{ marginTop: 4 }}>Outra delegacia (não está na lista)<input type="text" id="fOutra" placeholder="Digite o nome, se precisar" value={outra} onChange={e => setOutra(e.target.value)} autoComplete="off" /></label>
          </div>}
        <div className="row">
          <label className="f">Tipo<select id="fTipo" value={f.tipo} onChange={e => set("tipo", e.target.value)}><option>Ordinária</option><option>Extra</option></select></label>
          <label className="f">Data inicial<input type="date" id="fIni" value={f.ini} onChange={e => set("ini", e.target.value)} /></label>
          <label className="f">Data final<input type="date" id="fFim" value={f.fim} onChange={e => set("fim", e.target.value)} /></label>
        </div>
        <div className="row">
          <label className="f">Abre<input type="time" id="fAbre" value={f.abre} onChange={e => set("abre", e.target.value)} /></label>
          <label className="f">Fecha<input type="time" id="fFecha" value={f.fecha} onChange={e => set("fecha", e.target.value)} /></label>
          <label className="f">Último dia até<input type="time" id="fUlt" value={f.ult} onChange={e => set("ult", e.target.value)} /></label>
        </div>
        <p className="hint">Abre igual a fecha = 24h. "Último dia até" corta todos os turnos do último dia nesse horário.</p>
        <h4 style={{ margin: "6px 0 0" }}>Efetivo por dia</h4>
        <div id="fEf">{grupos.map((g, i) => <div className="efrow" key={i}>
          <label className="f">Cargo<select data-k="cargo" value={g.cargo} onChange={e => setG(i, "cargo", e.target.value)}><option>OIP</option><option>DPC</option></select></label>
          <label className="f">Qtd.<input type="number" min="1" max="200" data-k="qtd" value={Number.isNaN(g.qtd) ? "" : g.qtd} onChange={e => setG(i, "qtd", e.target.value)} /></label>
          <label className="f">Serviço<select data-k="servico" value={g.servico} onChange={e => setG(i, "servico", e.target.value)}>{SERV.map(s => <option key={s}>{s}</option>)}</select></label>
          <div className="ef2">
            <label className="f">Entrada<input type="time" data-k="entrada" value={g.entrada} onChange={e => setG(i, "entrada", e.target.value)} /></label>
            <label className="f">Saída<input type="time" data-k="saida" value={g.saida} onChange={e => setG(i, "saida", e.target.value)} /></label>
            <button type="button" className="btn small danger" data-rm onClick={() => grupos.length > 1 && setGrupos(gs => gs.filter((_, j) => j !== i))}>Remover</button></div>
        </div>)}</div>
        <button type="button" className="btn small" id="fAddEf" style={{ alignSelf: "start" }} onClick={() => setGrupos(gs => [...gs, novoGrupo(gs[gs.length - 1])])}>+ Grupo de policiais</button>
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn primary" id="fSalvar" style={{ flex: "0 0 auto" }} onClick={salvar}>{gravando || (d ? "Salvar alterações" : n > 1 ? `Lançar nas ${n} delegacias` : "Lançar")}</button>
          {d && <button className="btn" id="fCancelar" style={{ flex: "0 0 auto" }} onClick={aoCancelar}>Cancelar</button>}
        </div>
        <p className="err" id="fErr" role="alert">{erro}</p>
      </div>
    </fieldset>
  </>;
}
