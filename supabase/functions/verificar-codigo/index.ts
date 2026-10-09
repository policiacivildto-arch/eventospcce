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

// POST { matricula, codigo } -> { access_token, refresh_token }
// A tela chama supabase.auth.setSession() com o que voltar daqui.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { matricula, codigo } = await req.json();
    const s = await buscarServidor(matricula);
    if (!s) return resposta({ erro: NAO_ENCONTRADO }, 404);

    const token = String(codigo || "").replace(/\D/g, "");
    if (token.length < 6) return resposta({ erro: "Digite o código de 6 dígitos que chegou no e-mail." }, 400);

    const { data, error } = await publico.auth.verifyOtp({ email: s.email, token, type: "email" });
    if (error || !data.session) {
      return resposta({ erro: "Código errado ou vencido. Confira o e-mail ou peça um novo código." }, 401);
    }
    return resposta({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (_e) {
    return resposta({ erro: "Pedido inválido." }, 400);
  }
});
