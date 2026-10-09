# Testes

Rodam o sistema num navegador (Playwright) com um Supabase simulado (`mock-supabase.js`), usando os dados do 2º turno.

```bash
SCRATCH=<pasta com jspdf> node teste/compilar.cjs    # compila em dist-teste/ com esbuild
OUT=<pasta> node teste/testar.cjs                    # entrada, necessidade, escala, resumo, DTO, celular
OUT=<pasta> node teste/testar-relatorio-cobertura.cjs # relatório (versões, PDF) e cobertura (mapa, região, abrangência)
```

O `compilar.cjs` usa o React e o esbuild já instalados na máquina de desenvolvimento. No GitHub, o build oficial é o `npm run build` (Vite).
