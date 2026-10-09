# Plantão Eleições

Sistema da Polícia Civil do Ceará para planejar operações (eleições, Carnaval e outros eventos):

- os departamentos lançam a **necessidade de efetivo** de cada delegacia;
- o DTO fecha **versões** com o custo e **autoriza o aporte**;
- os focais **escalam** os servidores nas vagas;
- todos acompanham a **cobertura** das 184 cidades no mapa e baixam **relatórios** em PDF e CSV.

## Como está organizado

| Pasta | O que tem |
|---|---|
| `src/App.jsx` | Casca do sistema: entrada, cabeçalho, evento e abas |
| `src/entrada/` | Login por matrícula + código no e-mail institucional |
| `src/modulos/necessidade/` | Necessidade de efetivo (lançar várias delegacias de uma vez) |
| `src/modulos/escala/` | Escala: nomes nas vagas, busca de servidor, conflito de horário |
| `src/modulos/resumo/` | Autorizado × escalado |
| `src/modulos/relatorio/` | Funcionamento e efetivo por delegacia, por versão; PDF e CSV |
| `src/modulos/cobertura/` | Mapa, abrangência das plantonistas, região, relatório de cobertura |
| `src/modulos/versoes/` | Versões e autorização do aporte (DTO) |
| `src/modulos/evento/` | Abrir/fechar recebimento e escala, criar evento (DTO) |
| `src/modulos/minhas/` | Escalas do próprio servidor |
| `src/lib/` | Conexão com o Supabase, formatação e regras de negócio compartilhadas |
| `supabase/migrations/` | Banco de dados: tabelas, regras e permissões, em ordem |
| `supabase/functions/` | Envio e conferência do código de acesso |
| `scripts/` | Geradores de carga (servidores, e-mails, abrangência, mapa) |
| `docs/` | Manual do usuário, regras de negócio, manual técnico e implantação |
| `teste/` | Testes no navegador com dados simulados |

## Rodar no computador

Precisa do Node.js 20 ou mais novo.

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm run build      # gera a pasta dist/ para publicar
```

O endereço e a chave pública do Supabase ficam em `.env`. A chave "anon" é pública: a segurança está nas regras do banco.

## Publicar

- **GitHub Pages:** já configurado em `.github/workflows/publicar.yml`. Ative em *Settings → Pages → Source: GitHub Actions*. Cada mudança na `main` é compilada e publicada sozinha.
- **Netlify:** ligue o repositório no Netlify; o `netlify.toml` já diz como compilar.
- **Servidor da PC-CE:** rode `npm run build` e copie a pasta `dist/` para qualquer servidor web.

Veja `docs/implantacao.md` para o banco, o e-mail e o passo a passo completo.

## Protótipo antigo

`prototipos/escala-policial.html` é o primeiro protótipo da escala (agosto/2026), guardado como referência.
