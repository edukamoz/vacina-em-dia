import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useThemeColors, useVisual, useMovimentoReduzido } from '../theme/theme-provider';
import { CURVA, DURACAO, USA_DRIVER_NATIVO, VistaAnimada } from './animacao';
import { Icone } from './icone';
import { Texto } from './texto';

/** Quanto tempo o aviso fica na tela antes de sair sozinho, em milissegundos. */
export const TEMPO_DO_AVISO = 2600;

/**
 * Aviso curto de confirmação ("Dose aplicada"), que sobe de baixo com fade e some sozinho. Abrir
 * leva 350 ms (`media`) e fechar 250 ms (`passo`): chegar é deliberado, sair é rápido. É uma região
 * de status para o leitor de tela e nunca pede ação. Com "Reduzir movimento" aparece e some sem
 * deslocamento.
 *
 * @param props.mensagem - Texto do aviso; `null` esconde o aviso.
 * @param props.aoSumir - Chamada quando o tempo acaba (a tela limpa a mensagem).
 */
export function AvisoDeConfirmacao({
  mensagem,
  aoSumir,
}: {
  mensagem: string | null;
  aoSumir: () => void;
}) {
  const cores = useThemeColors();
  const { sombra } = useVisual();
  const reduzido = useMovimentoReduzido();
  const valor = useRef(new Animated.Value(0)).current;
  const [texto, setTexto] = useState<string | null>(mensagem);

  useEffect(() => {
    if (mensagem) setTexto(mensagem);
    if (reduzido) {
      valor.setValue(mensagem ? 1 : 0);
      if (!mensagem) setTexto(null);
      return undefined;
    }
    const animacao = Animated.timing(valor, {
      toValue: mensagem ? 1 : 0,
      duration: mensagem ? DURACAO.media : DURACAO.passo,
      easing: CURVA.padrao,
      useNativeDriver: USA_DRIVER_NATIVO,
    });
    animacao.start(({ finished }) => {
      if (finished && !mensagem) setTexto(null);
    });
    return () => animacao.stop();
  }, [mensagem, reduzido, valor]);

  useEffect(() => {
    if (!mensagem) return undefined;
    const id = setTimeout(aoSumir, TEMPO_DO_AVISO);
    return () => clearTimeout(id);
  }, [mensagem, aoSumir]);

  if (!texto) return null;
  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 bottom-lg items-center px-lg"
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <VistaAnimada
        style={[
          sombra(3),
          {
            backgroundColor: cores.texto,
            opacity: valor,
            transform: [
              { translateY: valor.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              { scale: valor.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
            ],
          },
        ]}
        className="flex-row items-center gap-sm rounded-cartao px-lg py-md"
      >
        <Icone nome="aplicada" cor={cores.fundo} tamanho={22} />
        <Texto variante="corpoNegrito" style={{ color: cores.fundo }}>
          {texto}
        </Texto>
      </VistaAnimada>
    </View>
  );
}
