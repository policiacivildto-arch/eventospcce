// Testes no navegador (Playwright) com o Supabase simulado
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const dir = path.resolve(__dirname, "../dist-teste");
const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const srv = http.createServer((q, r) => { const f = path.join(dir, decodeURIComponent(q.url.split("?")[0]).replace(/^\/$/, "/index.html")); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { "Content-Type": tipos[path.extname(f)] || "application/octet-stream" }); r.end(d); } }); }).listen(8765);
const S = process.env.SCRATCH, OUT = process.env.OUT || S;
const espera = ms => new Promise(r => setTimeout(r, ms));
async function abrir(b, hash, vp) {
  const ctx = await b.newContext({ viewport: vp, acceptDownloads: true }); const p = await ctx.newPage(); const er = [];
  p.on("pageerror", e => er.push(e.message)); p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) er.push(m.text()); }); p.on("dialog", d => d.accept());
  await p.route("**/*", r => r.request().url().startsWith("http://localhost:8765") ? r.continue() : r.abort());
  await p.goto("http://localhost:8765/" + hash); await espera(300);
  await p.fill("#iMat", "11111111"); await p.click("#bMat"); await espera(200); await p.click("#bEnviar"); await espera(200);
  await p.fill("#iCod", "123456"); await p.click("#bCod"); await espera(700);
  return { p, er };
}
module.exports = { abrir, espera, fechar: () => srv.close(), OUT, S };
if (require.main === module) (async () => {
  const b = await chromium.launch();
  let { p, er } = await abrir(b, "", { width: 1360, height: 950 });
  console.log("abas:", (await p.locator("#tabs button").allTextContents()).join(", "), "| aberta:", await p.textContent("#tabs [aria-selected=true]"));
  console.log("título:", await p.textContent("main .bar h2"), "| situação/botão:", await p.textContent("#bEnviarPed"));
  console.log("lista:", await p.locator("#pLista .pcard").count(), "cards | opções:", await p.locator("#fMulti label").count(), "| já lançadas:", await p.locator("#fMulti .chip").count());
  await p.fill("#fBuscaDel", "ba"); await espera(100); console.log("filtro 'ba':", await p.locator("#fMulti label").count());
  await p.click("#fTodas"); await p.fill("#fBuscaDel", ""); await p.fill("#fOutra", "Delegacia Nova de Teste");
  console.log("contador:", await p.textContent("#fQtdSel"), "| botão:", await p.textContent("#fSalvar"));
  await p.fill("#fIni", "2026-10-25"); await p.fill("#fAbre", "07:00"); await p.fill("#fFecha", "19:00");
  await p.click("#fAddEf"); await p.locator("#fEf .efrow").nth(1).locator("[data-k=cargo]").selectOption("DPC");
  await p.screenshot({ path: OUT + "/r-nec.png" });
  await p.click("#fSalvar"); await espera(1000);
  const sv = await p.evaluate(() => window.__salvos || []);
  console.log("gravadas:", sv.length, "| iguais:", new Set(sv.map(x => JSON.stringify([x.abre, x.fecha, x.data_ini, x.efetivo]))).size === 1, "| efetivo:", JSON.stringify(sv[0] && sv[0].efetivo));
  console.log("aviso:", await p.textContent("#toast"), "| erro:", await p.textContent("#fErr"));
  await p.click("[data-ed] >> nth=0"); await espera(200); console.log("edição campo único:", await p.locator("#fNomeDel").count(), "| multi:", await p.locator("#fMulti").count(), "| grupos:", await p.locator("#fEf .efrow").count());
  // escala
  await p.click("[data-tab=escala]"); await espera(600);
  console.log("escala delegacias:", await p.locator("#dList .ditem").count(), "| vagas do dia:", await p.locator("#vRows .vrow").count());
  const inp = p.locator("#vRows .iNome").first(); await inp.fill("an"); await espera(500);
  console.log("sugestões:", await p.locator(".sug [role=option]").count()); await inp.press("Enter"); await espera(400);
  console.log("após escolher:", await p.locator("#vRows .vrow").first().locator(".msg").textContent(), "| classe:", await p.locator("#vRows .vrow").first().getAttribute("class"));
  await p.locator("#vRows .cSem").nth(1).check(); await espera(300); console.log("sem servidor:", await p.locator("#vRows .vrow").nth(1).getAttribute("class"));
  console.log("lista atualizada:", (await p.locator("#dList .ditem").first().textContent()).replace(/\s+/g, " "));
  await p.screenshot({ path: OUT + "/r-esc.png" });
  for (const t of ["resumo", "minhas"]) { await p.click(`[data-tab=${t}]`); await espera(400); console.log(t + ":", (await p.textContent("main")).replace(/\s+/g, " ").slice(0, 120)); }
  console.log("erros:", er);
  ({ p, er } = await abrir(b, "#dto", { width: 1360, height: 950 }));
  console.log("DTO abas:", (await p.locator("#tabs button").allTextContents()).join(", "));
  await p.click("[data-tab=versoes]"); await espera(400); console.log("versões:", await p.locator("#vTab tbody tr").count());
  await p.click("[data-tab=evento]"); await espera(400); console.log("evento:", (await p.textContent("main")).replace(/\s+/g, " ").slice(0, 160));
  await p.click("#eEsc"); await espera(300); console.log("toggle escala:", await p.isChecked("#eEsc"), await p.textContent("#toast"));
  console.log("erros DTO:", er);
  ({ p, er } = await abrir(b, "", { width: 390, height: 844 }));
  console.log("celular largura:", await p.evaluate(() => document.documentElement.scrollWidth), er);
  await b.close(); srv.close();
})();
