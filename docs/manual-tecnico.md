# Manual técnico

## Arquitetura

- **Frontend:** React 19 + Vite. Gera um site estático (pasta `dist/`), sem servidor próprio.
- **Backend:** Supabase.
  - Postgres 17 com todas as regras no banco: RLS, funções `security definer` e restrições.
  - Login por código no e-mail (Supabase Auth).
  - Duas Edge Functions, que acham o e-mail pela matrícula sem expô-lo.
- O navegador fala direto com o Supabase usando a chave pública "anon". **Nenhuma regra de segurança depende do frontend:** quem tenta burlar a tela esbarra nas políticas do banco.

## Frontend

- `src/App.jsx` controla a sessão, o perfil (`meu_perfil`), o evento escolhido e as abas. O estado compartilhado vai pelo contexto em `src/lib/contexto.js`.
- Cada aba é um módulo em `src/modulos/<nome>/`. Para criar uma nova aba:
  1. faça o módulo;
  2. inclua o módulo na lista `ABAS` de `App.jsx`, com o perfil que pode vê-lo.
- As regras usadas na tela ficam em `src/lib/regras.js`. São turnos, textos de funcionamento e efetivo, regiões e situações.
- `src/modulos/cobertura/logica.js` decide quem atende cada cidade numa hora, as cores das plantonistas e as regiões.
- O PDF usa `jspdf` e `jspdf-autotable`, que só são carregados quando o usuário clica em "Baixar PDF".
- O mapa vem de `public/mapa-ce.json`: os contornos do IBGE já simplificados e projetados. Ele é gerado por `scripts/gerar_mapa.py`.

## Banco (supabase/migrations)

Aplique na ordem dos nomes.

**Tabelas principais**

| Grupo | Tabelas |
|---|---|
| Cadastro | `departamentos`, `delegacias` (com `municipio_ibge`), `servidores`, `papeis` (focal/dto) |
| Evento | `eventos`, `evento_departamentos` |
| Necessidade de efetivo | `pedido_delegacias`, `pedido_efetivo` |
| Versões | `versoes` (cópia em `pedido` jsonb), `versao_vagas` |
| Escala | `vagas`, `escalas` (com `exclude using gist`, que impede choque de horário) |
| Cobertura | `municipios`, `abrangencias` |

**Funções (RPC)**

| Assunto | Funções |
|---|---|
| Necessidade de efetivo | `salvar_pedido_delegacia`, `excluir_pedido_delegacia`, `enviar_pedido` |
| Versões e aporte | `fechar_versao`, `autorizar_aporte` |
| Evento | `definir_evento`, `criar_evento` |
| Escala | `escalar`, `buscar_servidores`, `meu_perfil` |
| Cobertura | `cobertura`, `cobertura_mapa`, `definir_abrangencia`, `copiar_abrangencia`, `definir_janela_cobertura`, `definir_municipio_delegacia` |

**Views:** `escala_vagas` e `resumo_escala`, as duas `security_invoker`.

As funções internas (`vagas_do_pedido`, `faixas_pedido`, `janela_evento`) não podem ser chamadas pelos usuários.

Os nomes das tabelas ainda usam "pedido". Na tela, aparecem como "necessidade de efetivo".

## Testes

`teste/` compila o projeto com esbuild e roda o navegador (Playwright) com um Supabase simulado e os dados reais do 2º turno. Ele confere:

- a entrada;
- a necessidade de efetivo lançada em várias delegacias;
- a escala;
- o relatório com versões e o PDF;
- a cobertura, por região e com edição da abrangência;
- a tela do celular.

Testes não substituem a conferência no banco: as permissões são testadas simulando cada papel no próprio Postgres.

## Cargas

| Arquivo | Para quê |
|---|---|
| `scripts/gerar_importacao.py` | Lista de lotação → departamentos, unidades e servidores |
| `scripts/gerar_emails.py` | E-mails de quem pode entrar |
| `scripts/gerar_abrangencia.py` | Tabela "Departamento / Municípios / Plantonista" → abrangência de um evento |
| `scripts/gerar_mapa.py` | Mapa a partir do GeoJSON do IBGE |

Os arquivos com dados pessoais dos servidores **não** vão para o repositório. A pasta `dados/` está no `.gitignore`.
