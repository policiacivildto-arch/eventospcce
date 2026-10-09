// Mapa do Ceará por município: cores por situação, zoom (roda, botões) e arrasto
import { memo, useEffect, useRef } from "react";

function Mapa({ MP, cores, apagadas, selecionada, sedes, vb, setVb, aoClicar }) {
  const svg = useRef(), arrasto = useRef(null);
  const k = vb[2] / MP.w;

  const zoom = (f, cx, cy) => {
    if (!f) return setVb([0, 0, MP.w, MP.h]);
    const [x, y, w, h] = vb, nw = Math.min(MP.w, Math.max(80, w / f)), nh = nw * MP.h / MP.w;
    cx = cx ?? x + w / 2; cy = cy ?? y + h / 2;
    setVb([cx - (cx - x) * nw / w, cy - (cy - y) * nh / h, nw, nh]);
  };
  const ponto = e => { const r = svg.current.getBoundingClientRect(); return [vb[0] + (e.clientX - r.left) / r.width * vb[2], vb[1] + (e.clientY - r.top) / r.height * vb[3]]; };

  /* a roda do mouse precisa de listener não passivo para não rolar a página */
  const zoomRef = useRef(); zoomRef.current = (e) => { e.preventDefault(); const [cx, cy] = ponto(e); zoom(e.deltaY < 0 ? 1.25 : 0.8, cx, cy); };
  useEffect(() => { const el = svg.current; const h = e => zoomRef.current(e); el.addEventListener("wheel", h, { passive: false }); return () => el.removeEventListener("wheel", h); }, []);

  const down = e => { arrasto.current = { x: e.clientX, y: e.clientY, vb: vb.slice(), moveu: false }; };
  const move = e => {
    const a = arrasto.current; if (!a) return;
    const dx = e.clientX - a.x, dy = e.clientY - a.y;
    if (!a.moveu && Math.hypot(dx, dy) < 5) return;
    if (!a.moveu) { a.moveu = true; svg.current.setPointerCapture(e.pointerId); svg.current.classList.add("arrasta"); }
    const r = svg.current.getBoundingClientRect();
    setVb([a.vb[0] - dx / r.width * a.vb[2], a.vb[1] - dy / r.height * a.vb[3], a.vb[2], a.vb[3]]);
  };
  const up = e => {
    const a = arrasto.current; arrasto.current = null; svg.current.classList.remove("arrasta");
    if (a && !a.moveu) { const p = e.target.closest && e.target.closest("path[data-ibge]"); if (p) aoClicar(Number(p.dataset.ibge)); }
  };

  return <div className="mapbox" id="cMap">
    <svg ref={svg} viewBox={vb.join(" ")} id="cSvg" role="img" aria-label="Mapa do Ceará por município"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { arrasto.current = null; }}>
      <defs><pattern id="hach" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="var(--c-fora)" /><rect width="3.2" height="7" fill="var(--c-fech)" /></pattern></defs>
      <Caminhos MP={MP} cores={cores} apagadas={apagadas} selecionada={selecionada} />
      <g id="cSedes">{sedes.map(v => <g key={v.n}><circle className="sede" cx={v.c[0]} cy={v.c[1]} r={6 * k} /><text x={v.c[0] + 9 * k} y={v.c[1] + 6 * k} style={{ fontSize: 17 * k, strokeWidth: 3 * k }}>{v.n}</text></g>)}</g>
    </svg>
    <div className="zoom noprint">
      <button className="btn" data-z="1.5" aria-label="Aproximar" onClick={() => zoom(1.5)}>+</button>
      <button className="btn" data-z="0.667" aria-label="Afastar" onClick={() => zoom(0.667)}>−</button>
      <button className="btn" data-z="0" aria-label="Ver o estado inteiro" style={{ fontSize: 13 }} onClick={() => zoom(0)}>⤢</button>
    </div>
  </div>;
}

/* os 184 contornos só redesenham quando as cores mudam, não a cada movimento do mapa */
const Caminhos = memo(function Caminhos({ MP, cores, apagadas, selecionada }) {
  return <g id="cPaths">{Object.entries(MP.m).map(([k, v]) => { const i = Number(k);
    return <path key={k} d={v.d} data-ibge={k} style={{ fill: cores.get(i) }} className={(selecionada === i ? "sel " : "") + (apagadas.has(i) ? "apaga" : "")}><title>{v.n}</title></path>; })}</g>;
});

export default memo(Mapa);
