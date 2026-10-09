// Funções comuns ao login por matrícula + código no e-mail.
// O e-mail completo nunca sai daqui: a tela só recebe o e-mail mascarado.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resposta(corpo, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// cliente com a chave de serviço: lê a tabela de servidores (só aqui dentro)
const admin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

// cliente público: envia e confere o código como um login normal
const publico = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_ANON_KEY"),
  { auth: { persistSession: false } },
);

function limparMatricula(m) {
  return String(m || "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

async function buscarServidor(matricula) {
  const m = limparMatricula(matricula);
  if (!m) return null;
  const { data } = await admin
    .from("servidores")
    .select("matricula, nome, email, ativo")
    .eq("matricula", m)
    .maybeSingle();
  if (!data || !data.ativo || !data.email) return null;
  return data;
}

function mascarar(email) {
  const [usuario, dominio] = String(email).split("@");
  return usuario.slice(0, 2) + "*".repeat(Math.max(usuario.length - 2, 3)) + "@" + dominio;
}

const NAO_ENCONTRADO =
  "Matrícula não encontrada ou sem e-mail cadastrado. Procure o focal do seu departamento.";

// POST { matricula, enviar }
//   enviar = false -> devolve primeiro nome e e-mail mascarado (tela de confirmação)
//   enviar = true  -> envia o código de 6 dígitos para o e-mail cadastrado

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { matricula, enviar } = await req.json();
    const s = await buscarServidor(matricula);
    if (!s) return resposta({ erro: NAO_ENCONTRADO }, 404);

    // só o primeiro nome antes do código, para não expor a lista de servidores
    const primeiroNome = String(s.nome).trim().split(/\s+/)[0];
    const emailMascarado = mascarar(s.email);
    if (!enviar) return resposta({ primeiro_nome: primeiroNome, email: emailMascarado });

    const { error } = await publico.auth.signInWithOtp({
      email: s.email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      const espera = /rate|seconds|security purposes/i.test(error.message);
      return resposta({
        erro: espera
          ? "Um código acabou de ser enviado. Aguarde um minuto antes de pedir outro."
          : "Não foi possível enviar o código agora. Tente de novo em instantes.",
      }, espera ? 429 : 500);
    }
    return resposta({ enviado: true, email: emailMascarado });
  } catch (_e) {
    return resposta({ erro: "Pedido inválido." }, 400);
  }
});
