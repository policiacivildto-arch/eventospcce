// Pedaços de tela usados em vários módulos
import { useApp } from "../lib/contexto.js";

export function Vazio({ children }) { return <div className="empty">{children}</div>; }
export function Carregando() { return <p className="muted">Carregando…</p>; }
export function Erro({ children }) { return children ? <p className="err" role="alert">{children}</p> : null; }

export function SelDepartamento({ valor, onChange, rotulo = "Departamento" }) {
  const { deps } = useApp();
  if (deps.length <= 1) return null;
  return <label className="f" style={{ minWidth: 200 }}>{rotulo}
    <select value={valor ?? ""} onChange={e => onChange(Number(e.target.value))}>{deps.map(d => <option key={d.id} value={d.id}>{d.sigla}</option>)}</select></label>;
}

export function BadgeServico({ s }) {
  if (s === "Extra") return <span className="bdg Extra">EXTRA</span>;
  if (s === "Extra sem aporte") return <span className="bdg semap">EXTRA SEM APORTE</span>;
  return <span className="bdg ord">{s.toUpperCase()}</span>;
}

export function Chip({ tipo, children, style }) { return <span className={"chip" + (tipo ? " " + tipo : "")} style={style}>{children}</span>; }
