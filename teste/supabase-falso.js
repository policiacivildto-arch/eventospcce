// Usado só nos testes: troca o Supabase de verdade por dados simulados
import "./mock-supabase.js";
export const createClient = (...a) => window.supabase.createClient(...a);
