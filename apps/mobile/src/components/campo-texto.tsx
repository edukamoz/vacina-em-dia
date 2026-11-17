import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, TextInput, View, type TextInputProps } from 'react-native';
import { useMovimentoReduzido, useTheme } from '../theme/theme-provider';
import { getThemeColors } from '../theme/tokens';
import { CURVA, DURACAO, VistaAnimada } from './animacao';
import { useRolarParaCampo } from './rolagem-com-teclado';
import { Texto } from './texto';

/**
 * Campo de texto do design system: rótulo sempre visível acima do campo (nunca só o texto de
 * exemplo), altura mínima de 48 dp, borda de 2 px e mensagem de erro colada ao campo.
 *
 * @param props.rotulo - Texto do rótulo (também é o rótulo de acessibilidade).
 * @param props.erro - Mensagem de erro; quando existe, a borda muda, o leitor de tela a anuncia e o
 *   campo balança uma vez (350 ms; parado com "Reduzir movimento").
 * @param props.ajuda - Dica curta abaixo do campo, por exemplo o formato esperado.
 * @param props.aoLado - Ação curta dentro do campo, à direita (por exemplo "Mostrar" na senha); o
 *   texto digitado ganha espaço para ela.
 */
export function CampoTexto({
  rotulo,
  erro,
  ajuda,
  aoLado,
  onFocus,
  onBlur,
  ...rest
}: Omit<TextInputProps, 'accessibilityLabel'> & {
  rotulo: string;
  erro?: string | undefined;
  ajuda?: string;
  aoLado?: ReactNode;
}) {
  const { theme } = useTheme();
  const campo = useRef<TextInput>(null);
  const [focado, setFocado] = useState(false);
  const rolarParaCampo = useRolarParaCampo();
  const reduzido = useMovimentoReduzido();
  const balanco = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!erro || reduzido) return;
    balanco.setValue(0);
    Animated.timing(balanco, {
      toValue: 1,
      duration: DURACAO.media,
      easing: CURVA.padrao,
      useNativeDriver: false,
    }).start();
  }, [erro, reduzido, balanco]);
  return (
    <View className="gap-sm">
      <Texto variante="rotulo">{rotulo}</Texto>
      <VistaAnimada
        className="relative justify-center"
        style={{
          transform: [
            {
              translateX: balanco.interpolate({
                inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                outputRange: [0, -8, 7, -5, 3, 0],
              }),
            },
          ],
        }}
      >
        <TextInput
          ref={campo}
          onFocus={(evento) => {
            // Com o teclado aberto, rola a tela até o campo para a pessoa ver o que digita.
            rolarParaCampo?.(campo.current);
            setFocado(true);
            onFocus?.(evento);
          }}
          onBlur={(evento) => {
            setFocado(false);
            onBlur?.(evento);
          }}
          accessibilityLabel={rotulo}
          placeholderTextColor={getThemeColors(theme).textoSecundario}
          className={`min-h-principal rounded-campo border-padrao bg-superficie py-sm pl-lg text-corpo font-regular text-texto ${
            aoLado ? 'pr-[112px]' : 'pr-lg'
          } ${erro ? 'border-erro' : focado ? 'border-primaria' : 'border-borda'}`}
          {...rest}
        />
        {aoLado ? <View className="absolute right-xs">{aoLado}</View> : null}
      </VistaAnimada>
      {ajuda && !erro ? (
        <Texto variante="apoio" className="text-textoSecundario">
          {ajuda}
        </Texto>
      ) : null}
      {erro ? (
        <Texto variante="apoio" className="text-erro" accessibilityLiveRegion="polite">
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}
