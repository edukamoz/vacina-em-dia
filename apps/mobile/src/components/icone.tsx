import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

/** Nomes dos ícones do app (desenho em `design-vacina-em-dia`, traço de 2 px em grade de 24). */
export type NomeDoIcone =
  | 'doses'
  | 'familia'
  | 'historico'
  | 'conta'
  | 'assistente'
  | 'mais'
  | 'info'
  | 'sair'
  | 'lembrete'
  | 'bebe'
  | 'pessoa'
  | 'bengala'
  | 'coracao'
  | 'frasco'
  | 'curativo'
  | 'celula'
  | 'local'
  | 'voz'
  | 'seta'
  | 'enviar'
  | 'fechar'
  | 'pendente'
  | 'agendada'
  | 'atrasada'
  | 'aplicada'
  | 'cancelada';

function Desenho({ nome }: { nome: NomeDoIcone }) {
  switch (nome) {
    case 'doses':
      return (
        <G transform="rotate(45 12 12)">
          <Rect x="9" y="6" width="6" height="11" rx="1.5" />
          <Path d="M12 17v4M12 6V3M9.5 3h5M9 10h2.5M9 13h2.5" />
        </G>
      );
    case 'familia':
      return (
        <>
          <Circle cx="9" cy="8" r="3.2" />
          <Path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <Circle cx="17" cy="9" r="2.5" />
          <Path d="M16.5 14.2c2.6.3 4.5 2.6 4.5 5.8" />
        </>
      );
    case 'historico':
      return <Path d="M4 12a8 8 0 1 0 2.6-5.9M6.8 2.8v3.5H3.3M12 8v4.5l3 1.8" />;
    case 'conta':
      return (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Circle cx="12" cy="10" r="3" />
          <Path d="M6.2 18.4c1.2-2.1 3.3-3.4 5.8-3.4s4.6 1.3 5.8 3.4" />
        </>
      );
    case 'assistente':
      return (
        <>
          <Path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z" />
          <Path d="M8.5 8.5h7M8.5 11.5h4" />
        </>
      );
    case 'info':
      return (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M12 11v5.5M12 7.8v.1" />
        </>
      );
    case 'mais':
      return <Path d="M12 5v14M5 12h14" />;
    case 'sair':
      return (
        <Path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9M15 8l4 4-4 4M19 12H9" />
      );
    case 'bebe':
      return (
        <>
          <Circle cx="12" cy="9" r="4.5" />
          <Path d="M10.5 5c.3-1.2 1.8-1.7 2.7-.8M6.5 20c.3-2.9 2.6-5 5.5-5s5.2 2.1 5.5 5" />
        </>
      );
    case 'pessoa':
      return (
        <>
          <Circle cx="12" cy="7" r="3.5" />
          <Path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
        </>
      );
    case 'bengala':
      return (
        <>
          <Circle cx="10" cy="6.5" r="3" />
          <Path d="M4.5 20c0-3.6 2.4-6.5 5.5-6.5 1.6 0 3 .7 4 1.9M17 20v-7.5a1.8 1.8 0 0 1 3.6 0" />
        </>
      );
    case 'coracao':
      return (
        <Path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20zM7.5 12.5h2.3l1.4-2.5 1.9 4.6 1.4-2.1h2" />
      );
    case 'frasco':
      return (
        <>
          <Rect x="8" y="3" width="8" height="3.5" rx="1" />
          <Path d="M9 6.5V9l-1.5 1.5V19a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-8.5L15 9V6.5M7.5 14h9" />
        </>
      );
    case 'curativo':
      return (
        <G transform="rotate(-45 12 12)">
          <Rect x="3" y="8" width="18" height="8" rx="4" />
          <Path d="M9 8v8M15 8v8M12 11v.1M12 13v.1" />
        </G>
      );
    case 'celula':
      return (
        <>
          <Circle cx="12" cy="12" r="4" />
          <Circle cx="12" cy="3.5" r="1.5" />
          <Circle cx="19.4" cy="7.8" r="1.5" />
          <Circle cx="19.4" cy="16.2" r="1.5" />
          <Circle cx="12" cy="20.5" r="1.5" />
          <Circle cx="4.6" cy="16.2" r="1.5" />
          <Circle cx="4.6" cy="7.8" r="1.5" />
        </>
      );
    case 'lembrete':
      return <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 21.5h4" />;
    case 'local':
      return (
        <>
          <Path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
          <Circle cx="12" cy="10" r="2.3" />
        </>
      );
    case 'voz':
      return (
        <>
          <Rect x="9" y="3" width="6" height="11" rx="3" />
          <Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
        </>
      );
    case 'seta':
      return <Path d="M9 5l7 7-7 7" />;
    case 'enviar':
      return <Path d="M4 12h15M13 6l6 6-6 6" />;
    case 'fechar':
      return <Path d="M6 6l12 12M18 6L6 18" />;
    case 'pendente':
      return (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M12 7v5l3 2" />
        </>
      );
    case 'agendada':
      return (
        <>
          <Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <Path d="M3.5 10h17M8 3v4M16 3v4" />
        </>
      );
    case 'atrasada':
      return <Path d="M12 3.5 L21.5 20 H2.5 Z M12 10v4.5M12 17.2v.1" />;
    case 'aplicada':
      return (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M8 12.2l2.8 2.8L16 9.5" />
        </>
      );
    case 'cancelada':
      return (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M9 9l6 6M15 9l-6 6" />
        </>
      );
  }
}

/**
 * Ícone do app. É sempre decorativo: o significado vem do texto ao lado (o leitor de tela ignora o
 * desenho), então nunca use um ícone sozinho como único rótulo.
 *
 * @param props.nome - Qual ícone desenhar.
 * @param props.cor - Cor do traço (use uma cor do tema atual).
 * @param props.tamanho - Lado em pixels; 24 por padrão.
 */
export function Icone({
  nome,
  cor,
  tamanho = 24,
}: {
  nome: NomeDoIcone;
  cor: string;
  tamanho?: number;
}) {
  return (
    <Svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <Desenho nome={nome} />
    </Svg>
  );
}
