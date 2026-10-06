import { View } from 'react-native';
import { Botao } from '../../components/botao';
import { Texto } from '../../components/texto';
import type { ChatMessage } from './use-assistant-chat';

/**
 * Uma mensagem do chat. A da pessoa fica à direita; a do assistente à esquerda, com a fonte que
 * embasa a resposta, o aviso quando a pergunta foi encaminhada a um profissional de saúde e as
 * perguntas sugeridas (que, ao tocar, são enviadas).
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
  if (mensagem.role === 'user') {
    return (
      <View className="items-end">
        <View
          accessible
          accessibilityLabel={`${mensagem.spoken ? 'Você falou' : 'Você'}: ${mensagem.text}`}
          className="max-w-[88%] rounded-cartao border-padrao border-primaria bg-primariaSuave p-md"
        >
          <Texto importantForAccessibility="no">
            {mensagem.spoken ? `🎤 ${mensagem.text}` : mensagem.text}
          </Texto>
        </View>
      </View>
    );
  }

  const resposta = mensagem.reply;
  const mostrarFonte = resposta && resposta.intent !== 'saudacao' && !resposta.fallback;
  return (
    <View className="items-start gap-sm">
      <View
        accessibilityLabel={`Assistente: ${mensagem.text}`}
        accessible
        className={`max-w-[92%] gap-sm rounded-cartao border-padrao bg-superficie p-md ${
          resposta?.safety ? 'border-pendente' : 'border-borda'
        }`}
      >
        {resposta?.safety ? (
          <Texto variante="rotulo" className="text-pendente" importantForAccessibility="no">
            ⚠ Converse com um profissional de saúde
          </Texto>
        ) : null}
        <Texto importantForAccessibility="no">{mensagem.text}</Texto>
        {mostrarFonte ? (
          <Texto variante="apoio" className="text-textoSecundario" importantForAccessibility="no">
            {`Fonte: ${resposta.source.name}${
              resposta.source.version ? `, versão ${resposta.source.version}` : ''
            }`}
          </Texto>
        ) : null}
      </View>

      {mensagem.results && mensagem.results.length > 0 ? (
        <View className="max-w-[92%] gap-xs rounded-cartao border-padrao border-borda bg-fundo p-md">
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
        <View className="max-w-[92%] gap-sm">
          {resposta.suggestions.map((sugestao) => (
            <Botao
              key={sugestao}
              titulo={sugestao}
              variante="secundario"
              disabled={desativado}
              onPress={() => aoSugerir(sugestao)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
