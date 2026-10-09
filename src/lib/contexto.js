// Estado compartilhado por todas as telas: quem está logado, evento escolhido, departamentos e avisos
import { createContext, useContext } from "react";

export const Contexto = createContext(null);
export const useApp = () => useContext(Contexto);
