// Gera o PDF do relatório (A4 deitado). As bibliotecas só carregam quando alguém clica em "Baixar PDF".
import { agrupar, totais, colunasTotais } from "./dados.js";

export async function gerarPdf({ linhas, evento, fonte, filtro, usuario, nomeArquivo }) {
  /* aceita tanto o formato do npm (ESM) quanto o UMD */
  const mj = await import("jspdf"), ma = await import("jspdf-autotable");
  const jsPDF = mj.jsPDF || (mj.default && (mj.default.jsPDF || mj.default));
  const autoTable = [ma.default, ma.default && ma.default.default, ma.autoTable].find(f => typeof f === "function");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const tabela = opts => (typeof autoTable === "function" ? autoTable(doc, opts) : doc.autoTable(opts));
  const W = doc.internal.pageSize.getWidth(), azul = [19, 35, 58];
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("Funcionamento e efetivo por delegacia", 14, 16);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(evento + "  ·  " + fonte + "  ·  " + filtro, 14, 22);
  doc.setFontSize(8.5); doc.setTextColor(100);
  doc.text("Gerado em " + new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) + " por " + usuario, 14, 27); doc.setTextColor(0);

  const grupos = agrupar(linhas);
  tabela({ startY: 31, head: [["Departamento", "Delegacias", "Ord. DPC", "Ord. OIP", "Extra DPC", "Extra OIP", "Outros*"]],
    body: [...grupos].map(([d, l]) => [d, ...colunasTotais(totais(l))]), foot: [["Total", ...colunasTotais(totais(linhas))]],
    theme: "grid", styles: { fontSize: 9, cellPadding: 1.6 }, headStyles: { fillColor: azul }, footStyles: { fillColor: [230, 234, 239], textColor: 20 },
    didParseCell: d => { if (d.column.index > 0) d.cell.styles.halign = "right"; }, tableWidth: 170 });
  doc.setFontSize(8); doc.text("Plantões no período = policiais × dias. * Outros: extra sem aporte, diária e compensação de horário.", 14, doc.lastAutoTable.finalY + 4);

  let y = doc.lastAutoTable.finalY + 10;
  grupos.forEach((l, d) => {
    if (y > 180) { doc.addPage(); y = 16; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(d + "  (" + l.length + " delegacia" + (l.length > 1 ? "s" : "") + ")", 14, y);
    tabela({ startY: y + 2, head: [["Delegacia", "Funcionamento", "Efetivo por dia", "DPC/dia", "OIP/dia"]],
      body: l.map(x => [x.nome, x.func, x.ef, x.dpc, x.oip]), theme: "striped", styles: { fontSize: 8.5, cellPadding: 1.5, valign: "middle" }, headStyles: { fillColor: azul },
      columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" }, 1: { cellWidth: 62 }, 2: { cellWidth: "auto" }, 3: { cellWidth: 16, halign: "right" }, 4: { cellWidth: 16, halign: "right" } } });
    y = doc.lastAutoTable.finalY + 9;
  });
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(110); doc.text("Página " + i + " de " + n, W - 14, doc.internal.pageSize.getHeight() - 6, { align: "right" }); doc.setTextColor(0); }
  doc.save(nomeArquivo);
}
