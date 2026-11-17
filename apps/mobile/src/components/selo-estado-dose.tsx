import type { DoseStatus } from '@vacina/shared';
import { View } from 'react-native';
import { useThemeColors, useVisual } from '../theme/theme-provider';
import { Icone, type NomeDoIcone } from './icone';
import { Texto } from './texto';

interface EstiloSelo {
  readonly rotulo: string;
  readonly icone: NomeDoIcone;
  readonly cor: 'pendente' | 'agendada' | 'atrasada' | 'aplicada' | 'cancelada';
  readonly caixa: string;
  readonly texto: string;
  /** Fundo suave do estado (selo e azulejo). */
  readonly fundo: string;
  /** Borda do estado, usada só no Alto contraste (nos outros temas o selo não tem contorno). */
  readonly borda: string;
}

/** Rótulo, ícone e cores de cada estado (`docs/04-design-system.md`, seção 3). */
export const SELO_POR_ESTADO: Readonly<Record<DoseStatus, EstiloSelo>> = {
  PENDING: {
    rotulo: 'Pendente',
    icone: 'pendente',
    cor: 'pendente',
    caixa: 'bg-pendenteSuave border-pendente',
    texto: 'text-pendente',
    fundo: 'bg-pendenteSuave',
    borda: 'border-pendente',
  },
  SCHEDULED: {
    rotulo: 'Agendada',
    icone: 'agendada',
    cor: 'agendada',
    caixa: 'bg-agendadaSuave border-agendada',
    texto: 'text-agendada',
    fundo: 'bg-agendadaSuave',
    borda: 'border-agendada',
  },
  OVERDUE: {
    rotulo: 'Atrasada',
    icone: 'atrasada',
    cor: 'atrasada',
    caixa: 'bg-atrasadaSuave border-atrasada',
    texto: 'text-atrasada',
    fundo: 'bg-atrasadaSuave',
    borda: 'border-atrasada',
  },
  APPLIED: {
    rotulo: 'Aplicada',
    icone: 'aplicada',
    cor: 'aplicada',
    caixa: 'bg-aplicadaSuave border-aplicada',
    texto: 'text-aplicada',
    fundo: 'bg-aplicadaSuave',
    borda: 'border-aplicada',
  },
  CANCELLED: {
    rotulo: 'Cancelada',
    icone: 'cancelada',
    cor: 'cancelada',
    caixa: 'bg-canceladaSuave border-cancelada',
    texto: 'text-cancelada',
    fundo: 'bg-canceladaSuave',
    borda: 'border-cancelada',
  },
};

/**
 * Selo do estado da dose. Nunca depende só da cor: leva ícone e texto, e o rótulo de
 * acessibilidade diz "Dose atrasada", "Dose aplicada" etc. Sem contorno nos temas Claro e Escuro
 * (o fundo suave basta); no Alto contraste leva borda na cor do estado.
 *
 * @param props.status - Estado da dose (define cor e ícone).
 * @param props.rotulo - Texto próprio no lugar do nome do estado, por exemplo "2 doses atrasadas".
 */
export function SeloEstadoDose({ status, rotulo }: { status: DoseStatus; rotulo?: string }) {
  const selo = SELO_POR_ESTADO[status];
  const cores = useThemeColors();
  const { altoContraste } = useVisual();
  return (
    <View
      accessible
      accessibilityLabel={rotulo ?? `Dose ${selo.rotulo.toLowerCase()}`}
      className={`flex-row items-center gap-sm self-start rounded-selo border-padrao px-md py-xs ${selo.fundo} ${
        altoContraste ? selo.borda : 'border-transparent'
      }`}
    >
      <Icone nome={selo.icone} cor={cores[selo.cor]} />
      <Texto variante="rotulo" className={selo.texto} importantForAccessibility="no">
        {rotulo ?? selo.rotulo}
      </Texto>
    </View>
  );
}

/**
 * Azulejo do estado: quadrado arredondado com o ícone do estado sobre o fundo suave, para abrir
 * o cartão de uma dose. Complementa o selo de texto (que continua obrigatório ao lado) e é
 * decorativo para o leitor de tela.
 *
 * @param props.status - Estado da dose (define cor e ícone).
 * @param props.tamanho - Lado em dp; 56 por padrão (48 nas listas compactas).
 */
export function AzulejoDeEstado({
  status,
  tamanho = 56,
}: {
  status: DoseStatus;
  tamanho?: 48 | 56;
}) {
  const selo = SELO_POR_ESTADO[status];
  const cores = useThemeColors();
  const { altoContraste } = useVisual();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      className={`items-center justify-center rounded-quadro border-padrao ${selo.fundo} ${
        altoContraste ? selo.borda : 'border-transparent'
      }`}
      style={{ width: tamanho, height: tamanho }}
    >
      <Icone nome={selo.icone} cor={cores[selo.cor]} tamanho={tamanho === 56 ? 28 : 24} />
    </View>
  );
}
