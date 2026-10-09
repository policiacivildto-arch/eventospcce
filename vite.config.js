import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" para funcionar em qualquer endereço (GitHub Pages, Netlify ou servidor da PC-CE)
export default defineConfig({ plugins: [react()], base: "./" });
