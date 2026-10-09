// Compila o projeto para teste sem npm: React e esbuild já instalados na máquina; Supabase simulado
const path = require("path"), fs = require("fs");
const esbuild = require("/opt/npm-tools/node_modules/esbuild");
const raiz = path.resolve(__dirname, ".."), saida = path.join(raiz, "dist-teste");
const S = process.env.SCRATCH;
const alias = {
  "react": "/opt/npm-tools/node_modules/react", "react-dom": "/opt/npm-tools/node_modules/react-dom",
  "@supabase/supabase-js": path.join(__dirname, "supabase-falso.js"),
  "jspdf": S + "/jsp/a/dist/jspdf.umd.min.js", "jspdf-autotable": S + "/jsp/b/dist/jspdf.plugin.autotable.min.js",
};
fs.rmSync(saida, { recursive: true, force: true }); fs.mkdirSync(saida);
esbuild.build({
  entryPoints: [path.join(raiz, "src/main.jsx")], bundle: true, format: "esm", splitting: true, outdir: saida,
  jsx: "automatic", alias, logLevel: "warning",
  define: { "import.meta.env.VITE_SUPABASE_URL": '"https://teste"', "import.meta.env.VITE_SUPABASE_ANON_KEY": '"x"', "process.env.NODE_ENV": '"development"', "import.meta.env.BASE_URL": '"./"' },
}).then(() => {
  let html = fs.readFileSync(path.join(raiz, "index.html"), "utf8").replace('<script type="module" src="/src/main.jsx"></script>', '<link rel="stylesheet" href="main.css"><script type="module" src="main.js"></script>');
  fs.writeFileSync(path.join(saida, "index.html"), html);
  fs.copyFileSync(path.join(raiz, "public/mapa-ce.json"), path.join(saida, "mapa-ce.json"));
  console.log("compilado:", fs.readdirSync(saida).join(", "));
}).catch(() => process.exit(1));
