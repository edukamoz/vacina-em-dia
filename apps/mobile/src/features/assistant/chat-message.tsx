import { Pressable, View } from 'react-native';
import { Icone } from '../../components/icone';
import { Texto } from '../../components/texto';
import { useThemeColors, useVisual } from '../../theme/theme-provider';
import type { ChatMessage } from './use-assistant-chat';

/**
 * Uma mensagem do chat, em balões. A da pessoa fica à direita, em verde; a do assistente à
 * esquerda, com a fonte que embasa a resposta, o aviso (em azul, com ícone) quando a pergunta foi
 * encaminhada a um profissional de saúde e as perguntas sugeridas (que, ao tocar, são enviadas).
 *
 * @param props.mensagem - Mensagem a exibir.
 * @param props.aoSugerir - Chamada com a pergunta sugerida tocada.
 * @param props.desativado - Desliga as sugestões enquanto o assistente responde.
 */
export function ChatMessageView({
  mensagem,
  aoSugerir,
  desativado,
}: {
  mensagem: ChatMessage;
  aoSugerir: (pergunta: string) => void;
  desativado: boolean;
}) {
  const cores = useThemeColors();
  const { gradienteMarca, sombra, altoContraste } = useVisual();

  if (mensagem.role === 'user') {
    return (
      <View className="items-end">
        <View
          accessible
          accessibilityLabel={`${mensagem.spoken ? 'Você falou' : 'Você'}: ${mensagem.text}`}
          style={gradienteMarca}
          className={`max-w-[88%] flex-row items-center gap-sm rounded-[22px] rounded-br-[6px] bg-primaria px-lg py-md ${
            altoContraste ? 'border-padrao border-borda' : ''
          }`}
        >
          {mensagem.spoken ? <Icone nome="voz" cor={cores.sobrePrimaria} tamanho={20} /> : null}
          <Texto className="flex-shrink text-sobrePrimaria" importantForAccessibility="no">
            {mensagem.text}
          </Texto>
        </View>
      </View>
    );
  }

  const resposta = mensagem.reply;
  const mostrarFonte = resposta && resposta.intent !== 'saudacao' && !resposta.fallback;
  const cuidado = Boolean(resposta?.safety);
  return (
    <View className="items-start gap-sm">
      <View
        accessibilityLabel={`Assistente: ${mensagem.text}`}
        accessible
        style={cuidado ? undefined : sombra(1)}
        className={`max-w-[92%] gap-sm rounded-[22px] rounded-bl-[6px] px-lg py-md ${
          cuidado
            ? 'border-padrao border-agendada bg-agendadaSuave'
            : altoContraste
              ? 'border-altoContraste border-borda bg-superficie'
              : 'border-fina border-bordaSuave bg-superficie'
        }`}
      >
        {cuidado ? (
          <View className="flex-row items-center gap-sm">
            <Icone nome="info" cor={cores.agendada} tamanho={22} />
            <Texto variante="rotulo" className="text-agendada" importantForAccessibility="no">
              Converse com um profissional de saúde
            </Texto>
          </View>
        ) : null}
        <Texto importantForAccessibility="no">{mensagem.text}</Texto>
        {mostrarFonte ? (
          <View className="flex-row gap-sm border-t-fina border-bordaSuave pt-sm">
            <Icone nome="info" cor={cores.textoSecundario} tamanho={20} />
            <Texto
              variante="apoio"
              className="flex-1 text-textoSecundario"
              importantForAccessibility="no"
            >
              {`Fonte: ${resposta.source.name}${
                resposta.source.version ? `, versão ${resposta.source.version}` : ''
              }`}
            </Texto>
          </View>
        ) : null}
      </View>

      {mensagem.results && mensagem.results.length > 0 ? (
        <View className="max-w-[92%] gap-xs rounded-[16px] border-fina border-bordaSuave bg-superficieSuave p-md">
          <Texto variante="rotulo">Vacinas encontradas no calendário</Texto>
          {mensagem.results.map((hit) => (
            <View key={hit.vaccine} className="gap-xs">
              <Texto variante="corpoNegrito">{hit.vaccine}</Texto>
              <Texto variante="apoio" className="text-textoSecundario">
                {hit.indications.join(' · ')}
              </Texto>
            </View>
          ))}
        </View>
      ) : null}

      {resposta && resposta.suggestions.length > 0 ? (
        <View className="max-w-[92%] flex-row flex-wrap gap-sm">
          {resposta.suggestions.map((sugestao) => (
            <Pressable
              key={sugestao}
              accessibilityRole="button"
              accessibilityLabel={sugestao}
              accessibilityState={{ disabled: desativado }}
              disabled={desativado}
              onPress={() => aoSugerir(sugestao)}
              className={`min-h-toque justify-center rounded-selo border-padrao border-borda bg-superficie px-lg py-sm hover:bg-superficieSuave ${
                desativado ? 'opacity-50' : ''
              }`}
            >
              <Texto variante="apoio" className="text-texto" importantForAccessibility="no">
                {sugestao}
              </Texto>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
