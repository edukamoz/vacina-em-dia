import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme/theme-provider';
import { getThemeColors } from '../theme/tokens';
import { Texto } from './texto';

/**
 * Campo de texto do design system: rótulo sempre visível acima do campo (nunca só o texto de
 * exemplo), altura mínima de 48 dp, borda de 2 px e mensagem de erro colada ao campo.
 *
 * @param props.rotulo - Texto do rótulo (também é o rótulo de acessibilidade).
 * @param props.erro - Mensagem de erro; quando existe, a borda muda e o leitor de tela a anuncia.
 * @param props.ajuda - Dica curta abaixo do campo, por exemplo o formato esperado.
 */
export function CampoTexto({
  rotulo,
  erro,
  ajuda,
  ...rest
}: Omit<TextInputProps, 'accessibilityLabel'> & {
  rotulo: string;
  erro?: string | undefined;
  ajuda?: string;
}) {
  const { theme } = useTheme();
  return (
    <View className="gap-sm">
      <Texto variante="rotulo">{rotulo}</Texto>
      <TextInput
        accessibilityLabel={rotulo}
        placeholderTextColor={getThemeColors(theme).textoSecundario}
        className={`min-h-principal rounded-campo border-padrao bg-superficie px-lg py-sm text-corpo font-regular text-texto ${
          erro ? 'border-erro' : 'border-borda'
        }`}
        {...rest}
      />
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
