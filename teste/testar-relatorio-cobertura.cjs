// Testes do Relatório (versões e PDF) e da Cobertura (mapa, região, abrangência)
const { chromium } = require("playwright"); const fs = require("fs");
const { abrir, espera, fechar, OUT } = require("./testar.cjs");
(async () => {
  const b = await chromium.launch();
  let { p, er } = await abrir(b, "#dto", { width: 1360, height: 950 });
  await p.click("[data-tab=relatorio]"); await espera(700);
  const aq = async () => (await p.locator("#rOut tr", { hasText: "Aquiraz" }).first().textContent()).replace(/\s+/g, " ");
  console.log("fontes:", (await p.locator("#rFonte option").allTextContents()).join(" | "));
  console.log("atual:", await aq());
  await p.selectOption("#rFonte", "v0"); await espera(400); console.log("v0:", await p.textContent("#rOut .hint"), "|", await aq());
  await p.selectOption("#rFonte", "v1"); await espera(400); console.log("v1:", await p.textContent("#rOut .hint"), "|", await aq());
  await p.selectOption("#rReg", "RMF"); await espera(300); console.log("RMF tabelas:", await p.locator("#rOut table").count(), "| totais:", (await p.locator("#rOut tfoot tr").textContent()).replace(/\s+/g, " "));
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#rPdf")]); const f = OUT + "/" + dl.suggestedFilename(); await dl.saveAs(f); console.log("pdf:", dl.suggestedFilename(), fs.statSync(f).size, "bytes");
  await p.selectOption("#rReg", "");
  const [dl2] = await Promise.all([p.waitForEvent("download"), p.click("#rPdf")]); const f2 = OUT + "/" + dl2.suggestedFilename(); await dl2.saveAs(f2); console.log("pdf todas:", dl2.suggestedFilename(), fs.statSync(f2).size, "bytes");
  // cobertura
  await p.click("[data-tab=cobertura]"); await espera(1200);
  console.log("cidades no mapa:", await p.locator("#cSvg path[data-ibge]").count(), "| hora:", await p.textContent("#cHr"));
  console.log("cards:", (await p.locator(".cards button").allTextContents()).join(" | "));
  await p.click('[data-dia="2026-10-25"]'); await espera(200);
  await p.$eval("#cT", el => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; s.call(el, String(Date.UTC(2026, 9, 25, 21, 0))); el.dispatchEvent(new Event("input", { bubbles: true })); }); await espera(200);
  console.log("hora 21h:", await p.textContent("#cHr"), "| cores distintas:", await p.$$eval("#cSvg path[data-ibge]", ps => new Set(ps.map(x => x.style.fill)).size));
  const sob = p.locator('path[data-ibge="2304350"]'); const bb = await sob.boundingBox(); await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await espera(200);
  console.log("info:", (await p.textContent("#cInfo")).replace(/\s+/g, " ").slice(0, 220));
  await p.screenshot({ path: OUT + "/r-cob1.png" });
  for (const r of ["CAP", "RMF", "NORTE", "SUL", ""]) { await p.selectOption("#cReg", r); await espera(250);
    console.log(r || "todas", "| no mapa:", await p.locator("#cSvg path[data-ibge]:not(.apaga)").count(), "| legenda:", await p.locator("#cLeg .pls span").count(), "| linhas:", await p.locator("#cRel table").first().locator("tbody tr").count(), "| plantonistas:", await p.locator("#cRel table").nth(1).locator("tbody tr").count(), "| viewBox:", (await p.getAttribute("#cSvg", "viewBox")).split(" ").map(x => Math.round(x)).join(" ")); }
  await p.selectOption("#cReg", "NORTE"); await espera(200); await p.click("[data-modo=abr]"); await p.screenshot({ path: OUT + "/r-cob2.png" }); await p.selectOption("#cReg", "");
  await p.selectOption("#cPl", "139"); await espera(200);
  console.log("editando: modo abr?", await p.getAttribute("[data-modo=abr]", "aria-pressed"), "| chips:", await p.locator("#cChips button").count());
  const pb = p.locator('path[data-ibge="2310506"]'); const bp = await pb.boundingBox(); await p.mouse.click(bp.x + bp.width / 2, bp.y + bp.height / 2); await espera(150);
  await p.fill("#cAdd", "Deputado Irapuan Pinheiro"); await espera(150);
  console.log("chips depois:", await p.locator("#cChips button").count(), "| salvar habilitado:", await p.isEnabled("#cSalvar"));
  await p.click("#cSalvar"); await espera(800);
  console.log("rpc:", JSON.stringify(await p.evaluate(() => window.__abr)), "| aviso:", await p.textContent("#toast"), "| salvar depois:", await p.isEnabled("#cSalvar"));
  // arrastar e zoom
  const vb0 = await p.getAttribute("#cSvg", "viewBox"); await p.click("[data-z='1.5']"); const box = await p.locator("#cSvg").boundingBox();
  await p.mouse.move(box.x + 300, box.y + 300); await p.mouse.down(); await p.mouse.move(box.x + 380, box.y + 360, { steps: 5 }); await p.mouse.up();
  console.log("zoom/arrasto mudou o mapa:", vb0 !== await p.getAttribute("#cSvg", "viewBox"));
  console.log("erros:", er);
  ({ p, er } = await abrir(b, "", { width: 390, height: 844 }));
  await p.click("[data-tab=cobertura]"); await espera(1200); console.log("celular cobertura largura:", await p.evaluate(() => document.documentElement.scrollWidth), "| plantonistas que o focal edita:", await p.locator("#cPl option").count() - 1, "| período (só DTO):", await p.locator("#cIni").count());
  await p.click("[data-tab=relatorio]"); await espera(600); console.log("celular relatório largura:", await p.evaluate(() => document.documentElement.scrollWidth), "| fonte (só DTO):", await p.locator("#rFonte").count());
  await p.screenshot({ path: OUT + "/r-cob-cel.png" });
  console.log("erros focal:", er);
  await b.close(); fechar();
})();
