// Aviso rápido no rodapé ("Salvo", erros)
import { useCallback, useRef, useState } from "react";

export function useAviso() {
  const [aviso, setAviso] = useState(null);
  const t = useRef();
  const avisar = useCallback((texto, ruim = false) => {
    setAviso({ texto, ruim }); clearTimeout(t.current);
    t.current = setTimeout(() => setAviso(null), ruim ? 5000 : 2400);
  }, []);
  const elemento = <div className={"toast" + (aviso ? " on" : "") + (aviso && aviso.ruim ? " bad" : "")} role="status" id="toast">{aviso ? aviso.texto : ""}</div>;
  return [avisar, elemento];
}
