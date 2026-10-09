# Implantação

## 1. Banco (Supabase)

1. Crie o projeto (região São Paulo).
2. No **SQL Editor**, rode os arquivos de `supabase/migrations/` na ordem dos nomes. Depois, rode as cargas de servidores e e-mails geradas pelos scripts. Elas ficam fora do repositório.
3. Em **Edge Functions**, publique `enviar-codigo` e `verificar-codigo`, as duas com "Verify JWT" ligado.

## 2. E-mail com o código

O e-mail padrão do Supabase só envia para a equipe do projeto. Para os servidores receberem o código:

1. Em **Authentication → SMTP Settings**, configure o envio. Para mandar como dto@pc.ce.gov.br pelo Office 365:

   | Campo | Valor |
   |---|---|
   | Servidor | `smtp.office365.com` |
   | Porta | 587 |
   | Usuário | dto@pc.ce.gov.br |
   | Observação | A TI precisa liberar o "SMTP AUTH" dessa caixa |

2. Em **Authentication → Emails**, troque os dois modelos, "Confirme a inscrição" e "Link mágico ou OTP", para mostrar o código. Exemplo:
   `Seu código de acesso ao Plantão Eleições é: {{ .Token }}`
3. Em **Authentication → Rate limits**, ajuste o limite de e-mails por hora para o volume esperado.

## 3. Site

**GitHub Pages**

1. Envie este projeto para o repositório.
2. Em *Settings → Pages*, escolha *Source: GitHub Actions*.
3. Cada mudança na branch `main` é compilada e publicada sozinha. O endereço aparece na aba *Actions*.

Em repositório **privado**, o GitHub Pages exige plano pago. No plano gratuito, use o Netlify.

**Netlify**

1. Em *Add new site → Import from Git*, escolha o repositório.
2. O `netlify.toml` já diz como compilar.

**Servidor próprio**

1. Rode `npm install` e `npm run build`.
2. Copie a pasta `dist/` para o servidor web.

## 4. Acessos

- Os papéis ficam na tabela `papeis`:
  - DTO: `papel = 'dto'`, sem departamento;
  - focal: `papel = 'focal'`, com o `departamento_id`.
- O servidor só entra se tiver e-mail cadastrado em `servidores.email`.
- Use o modelo `supabase/acessos.exemplo.sql`. Os acessos reais (matrículas e e-mails) ficam fora do repositório, porque ele é público.
