import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { modoDeLayout } from '../../lib/layout';
import { useVisual } from '../../theme/theme-provider';
import { AssistantPanel } from './assistant-panel';
import { useAssistente } from './assistente-contexto';

/**
 * Janela de conversa do assistente, como o chat de uma rede social: no computador e no tablet é
 * uma janela fixa no canto inferior direito; no celular, uma folha que sobe cobrindo a tela, com
 * um véu que fecha ao tocar fora. A conversa é montada na primeira abertura e continua guardada
 * enquanto o app estiver aberto (fechar só esconde a janela); a gravação de voz, ao contrário, é
 * cancelada ao fechar. A janela tem papel de diálogo, nome "Assistente" e o botão "Fechar".
 *
 * @param props.largura - Largura a considerar; por padrão, a da janela (útil para testar).
 */
export function JanelaDoAssistente({ largura }: { largura?: number }) {
  const { aberto, fechar } = useAssistente();
  const { altoContraste, sombra } = useVisual();
  const janela = useWindowDimensions().width;
  const compacto = modoDeLayout(largura ?? janela) === 'compacto';
  // Só monta a conversa depois da primeira abertura, e a mantém montada ao fechar.
  const [montada, setMontada] = useState(aberto);
  if (aberto && !montada) setMontada(true);
  if (!montada) return null;

  const borda = altoContraste
    ? 'border-altoContraste border-borda'
    : 'border-fina border-bordaSuave';
  return (
    <View
      pointerEvents={aberto ? 'box-none' : 'none'}
      style={{ display: aberto ? 'flex' : 'none' }}
      className="absolute inset-0 z-10"
    >
      {compacto ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar o assistente"
          onPress={fechar}
          className={`absolute inset-0 ${altoContraste ? '' : 'bg-black/40'}`}
        />
      ) : null}
      <View
        role="dialog"
        aria-modal
        aria-label="Assistente"
        accessibilityViewIsModal
        style={sombra(3)}
        className={`absolute overflow-hidden bg-superficie ${borda} ${
          compacto
            ? 'inset-x-0 bottom-0 top-[56px] rounded-t-folha'
            : 'bottom-xl right-xl h-[620px] max-h-[88%] w-[400px] max-w-[92%] rounded-folha'
        }`}
      >
        <AssistantPanel aoFechar={fechar} ativo={aberto} />
      </View>
    </View>
  );
}
