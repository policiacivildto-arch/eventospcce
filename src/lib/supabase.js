// Conexão com o Supabase (banco, login e regras de acesso ficam todos lá)
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const CHAVE = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const sb = createClient(URL, CHAVE, { auth: { persistSession: true, autoRefreshToken: true } });

/* erro de RPC/edge function em texto legível */
export async function msgErro(error) {
  if (!error) return "";
  try { if (error.context && typeof error.context.json === "function") { const j = await error.context.json(); if (j && j.erro) return j.erro; } } catch { /* sem corpo */ }
  return error.message || String(error);
}

/* busca paginada: o Supabase devolve no máximo 1000 linhas por vez */
export async function todos(montar) {
  const out = []; let i = 0;
  for (;;) { const { data, error } = await montar().range(i, i + 999); if (error) throw error; out.push(...data); if (data.length < 1000) break; i += 1000; }
  return out;
}
