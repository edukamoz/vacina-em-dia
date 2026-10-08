import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/** O que o resto do app pode fazer com a janela do assistente. */
export interface AssistenteContextoValor {
  /** Se a janela do assistente está aberta. */
  readonly aberto: boolean;
  /** Abre a janela do assistente. */
  readonly abrir: () => void;
  /** Fecha (minimiza) a janela; a conversa continua guardada enquanto o app estiver aberto. */
  readonly fechar: () => void;
}

const AssistenteContexto = createContext<AssistenteContextoValor | null>(null);

/**
 * Guarda se a janela do assistente está aberta (Context API, ADR-006). O botão flutuante e o item
 * do menu abrem a janela; o botão "Fechar" a minimiza.
 *
 * @param props.inicialmenteAberto - Estado inicial; útil nos testes.
 */
export function AssistenteProvider({
  children,
  inicialmenteAberto = false,
}: {
  children: ReactNode;
  inicialmenteAberto?: boolean;
}) {
  const [aberto, setAberto] = useState(inicialmenteAberto);
  const valor = useMemo(
    () => ({ aberto, abrir: () => setAberto(true), fechar: () => setAberto(false) }),
    [aberto],
  );
  return <AssistenteContexto.Provider value={valor}>{children}</AssistenteContexto.Provider>;
}

/**
 * Lê o estado da janela do assistente.
 *
 * @throws Error se usado fora do `AssistenteProvider`.
 */
export function useAssistente(): AssistenteContextoValor {
  const contexto = useContext(AssistenteContexto);
  if (!contexto) throw new Error('useAssistente deve ser usado dentro do AssistenteProvider.');
  return contexto;
}
