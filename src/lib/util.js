// Formatação de datas, números e arquivos
export const SERV = ["Ordinário", "Extra", "Extra sem aporte", "Diária", "Compensação de horário"];
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/* timestamps sem fuso vindos do banco ("2026-10-25T07:00:00") */
export function partes(ts) { const m = String(ts).match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/); return m ? { d: m[1] + "-" + m[2] + "-" + m[3], dd: m[3] + "/" + m[2], h: m[4] + ":" + m[5] } : { d: "", dd: "", h: "" }; }
export function diaBR(iso) { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); return DIAS[dt.getUTCDay()] + ", " + String(d).padStart(2, "0") + "/" + String(m).padStart(2, "0") + "/" + y; }
export function dataBR(iso) { if (!iso) return ""; const p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
export function dataHoraBR(iso) { return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
export const fmtR = v => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtN = v => (Number(v) || 0).toLocaleString("pt-BR");

/* milissegundos de um timestamp sem fuso, tratado como UTC para não depender do relógio do computador */
export function msTs(s) { const m = String(s).match(/(\d+)-(\d+)-(\d+)[T ](\d+):(\d+)/); return Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]); }
export function hhmm(ms) { const d = new Date(ms); return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0"); }
export function maisDia(iso, n) { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function lista(xs) { return xs.length <= 1 ? (xs[0] || "") : xs.slice(0, -1).join(", ") + " e " + xs[xs.length - 1]; }

/* CSV para Excel em português (separador ; e acentos) */
export function baixarCsv(nome, cab, linhas) {
  const csv = "﻿" + [cab, ...linhas].map(l => l.map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* guarda preferências do usuário (aba aberta, região...) sem quebrar se o navegador bloquear */
export function guardar(k, v) { try { localStorage.setItem(k, v); } catch { /* ignorado */ } }
export function ler(k) { try { return localStorage.getItem(k); } catch { return null; } }
