// Entrada: matrícula -> confirma o e-mail -> código de 6 dígitos
import { useEffect, useRef, useState } from "react";
import { sb, msgErro } from "../lib/supabase.js";

export default function Entrada({ aoEntrar, erroInicial, avisar }) {
  const [passo, setPasso] = useState("mat");
  const [mat, setMat] = useState("");
  const [quem, setQuem] = useState({ nome: "", mail: "" });
  const [cod, setCod] = useState("");
  const [erro, setErro] = useState(erroInicial || "");
  const [ocupado, setOcupado] = useState(false);
  const [espera, setEspera] = useState(0);
  const refMat = useRef(), refCod = useRef();

  useEffect(() => { setErro(""); (passo === "mat" ? refMat : refCod).current?.focus(); }, [passo]);
  useEffect(() => { if (erroInicial) setErro(erroInicial); }, [erroInicial]);
  useEffect(() => { if (espera <= 0) return; const t = setTimeout(() => setEspera(espera - 1), 1000); return () => clearTimeout(t); }, [espera]);

  const continuar = async e => {
    e.preventDefault(); const m = mat.trim(); if (!m) return;
    setOcupado(true);
    const { data, error } = await sb.functions.invoke("enviar-codigo", { body: { matricula: m, enviar: false } });
    setOcupado(false);
    if (error) return setErro(await msgErro(error));
    setQuem({ nome: data.primeiro_nome, mail: data.email }); setPasso("conf");
  };
  const enviar = async () => {
    setOcupado(true);
    const { error } = await sb.functions.invoke("enviar-codigo", { body: { matricula: mat.trim(), enviar: true } });
    setOcupado(false);
    if (error) { setErro(await msgErro(error)); return false; }
    setEspera(60); return true;
  };
  const entrar = async e => {
    e.preventDefault();
    const codigo = cod.replace(/\D/g, "");
    if (codigo.length < 6) return setErro("Digite os 6 dígitos do código.");
    setOcupado(true);
    const { data, error } = await sb.functions.invoke("verificar-codigo", { body: { matricula: mat.trim(), codigo } });
    if (error) { setOcupado(false); return setErro(await msgErro(error)); }
    const r = await sb.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    setOcupado(false);
    if (r.error) return setErro("Não foi possível entrar. Tente de novo.");
    setCod(""); aoEntrar();
  };

  return <section className="login"><div className="card">
    <h1>Plantão Eleições</h1>
    <p className="muted" style={{ marginTop: 6 }}>Escala da Polícia Civil do Ceará. Entre com a sua matrícula; um código chega no seu e-mail institucional.</p>

    {passo === "mat" && <form className="stack" onSubmit={continuar} autoComplete="off">
      <label className="f">Matrícula<input ref={refMat} type="text" id="iMat" value={mat} onChange={e => setMat(e.target.value)} autoComplete="username" placeholder="Sua matrícula" required /></label>
      <button className="btn primary" type="submit" id="bMat" disabled={ocupado}>Continuar</button>
      <p className="err" role="alert" id="eMat">{erro}</p>
    </form>}

    {passo === "conf" && <div className="stack">
      <div className="ident"><p><b id="cNome">{quem.nome}</b></p><p className="muted">Código será enviado para <b>{quem.mail}</b></p></div>
      <button className="btn primary" type="button" id="bEnviar" disabled={ocupado} onClick={async () => { if (await enviar()) setPasso("cod"); }}>Enviar código para este e-mail</button>
      <button className="link" type="button" onClick={() => setPasso("mat")}>Não sou eu / voltar</button>
      <p className="err" role="alert">{erro}</p>
    </div>}

    {passo === "cod" && <form className="stack" onSubmit={entrar} autoComplete="off">
      <p className="muted">Digite o código de 6 dígitos enviado para <b>{quem.mail}</b>.</p>
      <input ref={refCod} type="text" id="iCod" className="code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="······" aria-label="Código de 6 dígitos" value={cod} onChange={e => setCod(e.target.value)} />
      <button className="btn primary" type="submit" id="bCod" disabled={ocupado}>Entrar</button>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button className="link" type="button" disabled={espera > 0} onClick={async () => { if (await enviar()) avisar("Novo código enviado."); }}>{espera > 0 ? `Reenviar código (${espera}s)` : "Reenviar código"}</button>
        <button className="link" type="button" onClick={() => setPasso("mat")}>Voltar</button>
      </div>
      <p className="err" role="alert">{erro}</p>
    </form>}
  </div></section>;
}
