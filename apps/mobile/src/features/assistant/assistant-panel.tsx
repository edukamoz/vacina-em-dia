import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Botao } from '../../components/botao';
import { Icone } from '../../components/icone';
import { Texto } from '../../components/texto';
import { useThemeColors, useVisual } from '../../theme/theme-provider';
import { Simbolo } from '../auth/logo';
import { OndaDaVoz, PontosEscrevendo } from '../../components/indicadores-animados';
import { ChatMessageView } from './chat-message';
import { useAssistantChat } from './use-assistant-chat';
import { MAX_RECORDING_SECONDS, VoiceError, type VoiceRecorder } from './voice-types';
import { isVoiceSupported, useVoiceRecorder } from './voice-recorder';

const MAX_LENGTH = 300;

type VoiceState = 'idle' | 'recording' | 'processing';

/** Alturas das barras da "onda" mostrada enquanto grava. */
const ONDA = [14, 26, 36, 22, 30, 16, 24] as const;

/**
 * Conteúdo da conversa com o assistente (RF06 e RF07): cabeçalho, mensagens, aviso e campo para
 * escrever ou falar, com o chatbot por regras (sem IA generativa). Cada resposta cita a fonte;
 * perguntas sobre saúde individual são encaminhadas a um profissional. A voz grava no aparelho, a
 * API transcreve com o Azure AI Speech e descarta o áudio; se o microfone não estiver disponível,
 * o campo de texto continua funcionando. Mostrado dentro de `JanelaDoAssistente`.
 *
 * @param props.aoFechar - Chamada pelo botão "Fechar o assistente" do cabeçalho.
 * @param props.ativo - Falso quando a janela está escondida: uma gravação em andamento é cancelada
 *   (o microfone nunca fica ligado com a janela fechada).
 */
export function AssistantPanel({
  aoFechar,
  ativo = true,
}: {
  aoFechar: () => void;
  ativo?: boolean;
}) {
  const chat = useAssistantChat();
  const cores = useThemeColors();
  const { altoContraste, gradienteMarca } = useVisual();
  const [texto, setTexto] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const voiceRecorder = useVoiceRecorder();
  const recorder = useRef<VoiceRecorder | null>(null);
  const scroll = useRef<ScrollView>(null);
  const voiceAvailable = isVoiceSupported();

  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [chat.messages.length, chat.thinking]);

  // Solta o microfone se a pessoa sair da tela no meio da gravação.
  useEffect(() => () => recorder.current?.cancel(), []);

  // Esconder a janela também solta o microfone.
  useEffect(() => {
    if (!ativo && recorder.current) cancelRecording();
  }, [ativo]);

  // Para sozinho ao chegar no tempo máximo.
  useEffect(() => {
    if (voiceState !== 'recording') return undefined;
    const timer = setInterval(() => setSegundos((atual) => atual + 1), 1000);
    return () => clearInterval(timer);
  }, [voiceState]);
  useEffect(() => {
    if (voiceState === 'recording' && segundos >= MAX_RECORDING_SECONDS) void finishRecording();
  }, [segundos]);

  function send(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa || chat.thinking) return;
    setVoiceError(null);
    chat.sendText(limpa);
    setTexto('');
  }

  async function startRecording() {
    chat.clearError();
    setVoiceError(null);
    try {
      recorder.current = voiceRecorder;
      await recorder.current.start();
      setSegundos(0);
      setVoiceState('recording');
    } catch (error) {
      recorder.current = null;
      setVoiceError(error instanceof VoiceError ? error.message : new VoiceError('FAILED').message);
    }
  }

  async function finishRecording() {
    const active = recorder.current;
    if (!active) return;
    setVoiceState('processing');
    try {
      const wav = await active.stop();
      chat.sendVoice(wav);
    } catch (error) {
      setVoiceError(error instanceof VoiceError ? error.message : new VoiceError('FAILED').message);
    } finally {
      recorder.current = null;
      setVoiceState('idle');
    }
  }

  function cancelRecording() {
    recorder.current?.cancel();
    recorder.current = null;
    setVoiceState('idle');
  }

  const falha = voiceError ?? chat.error;
  const podeEnviar = Boolean(texto.trim()) && !chat.thinking && voiceState === 'idle';

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-row items-center gap-md border-b-fina border-bordaSuave bg-superficie px-lg py-md">
        <View
          aria-hidden
          className="h-[44px] w-[44px] items-center justify-center rounded-selo bg-primariaSuave"
        >
          <Simbolo tamanho={28} />
        </View>
        <View className="flex-1">
          <Texto variante="titulo3" accessibilityRole="header">
            Assistente
          </Texto>
          <Texto variante="apoio" className="text-textoSecundario">
            Dúvidas sobre o aplicativo e o calendário
          </Texto>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar o assistente"
          onPress={aoFechar}
          className="h-[48px] w-[48px] items-center justify-center rounded-selo hover:bg-superficieSuave"
        >
          <Icone nome="fechar" cor={cores.texto} />
        </Pressable>
      </View>

      <ScrollView
        ref={scroll}
        className="flex-1"
        contentContainerClassName="gap-lg p-lg"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-lg" accessibilityLiveRegion="polite">
          {chat.messages.map((mensagem) => (
            <ChatMessageView
              key={mensagem.id}
              mensagem={mensagem}
              aoSugerir={send}
              desativado={chat.thinking}
            />
          ))}
          {chat.thinking ? (
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Entendendo a sua pergunta..."
              className="flex-row items-center gap-sm self-start rounded-[22px] border-fina border-bordaSuave bg-superficie px-lg py-md"
            >
              <PontosEscrevendo />
              <Texto
                variante="apoio"
                className="text-textoSecundario"
                importantForAccessibility="no"
              >
                Entendendo a sua pergunta...
              </Texto>
            </View>
          ) : null}
        </View>
        {falha ? (
          <View
            accessibilityRole="alert"
            className="flex-row gap-sm rounded-[16px] border-padrao border-erro bg-erroSuave p-md"
          >
            <Icone nome="info" cor={cores.erro} />
            <Texto className="flex-1">{falha}</Texto>
          </View>
        ) : null}
        <Texto variante="apoio" className="text-textoSecundario">
          O assistente não dá orientação médica e não substitui a caderneta oficial nem um
          profissional de saúde. Em emergência, ligue 192 (SAMU).
        </Texto>
      </ScrollView>

      <View className="gap-sm border-t-fina border-bordaSuave bg-superficie p-md">
        {voiceState === 'recording' ? (
          <View className="gap-sm">
            <OndaDaVoz alturas={ONDA} />
            <Texto variante="corpoNegrito" accessibilityLiveRegion="polite">
              {`Gravando... fale a sua pergunta (${segundos} s)`}
            </Texto>
            <Botao titulo="Parar e enviar" onPress={() => void finishRecording()} />
            <Botao titulo="Cancelar" variante="secundario" onPress={cancelRecording} />
          </View>
        ) : (
          <View className="gap-sm">
            <View className="flex-row items-center gap-sm">
              <TextInput
                accessibilityLabel="Sua pergunta"
                value={texto}
                onChangeText={setTexto}
                maxLength={MAX_LENGTH}
                placeholder="Escreva sua pergunta"
                placeholderTextColor={cores.textoSecundario}
                returnKeyType="send"
                onSubmitEditing={() => send(texto)}
                editable={voiceState === 'idle'}
                className="min-h-principal flex-1 rounded-selo border-padrao border-borda bg-superficie px-lg py-sm text-corpo font-regular text-texto"
              />
              {voiceAvailable ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    voiceState === 'processing' ? 'Enviando o áudio...' : 'Falar a pergunta'
                  }
                  disabled={chat.thinking || voiceState !== 'idle'}
                  onPress={() => void startRecording()}
                  className="h-[56px] w-[56px] items-center justify-center rounded-selo border-padrao border-borda bg-superficie"
                >
                  <Icone nome="voz" cor={cores.texto} />
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enviar"
                accessibilityState={{ disabled: !podeEnviar }}
                disabled={!podeEnviar}
                onPress={() => send(texto)}
                style={gradienteMarca}
                className={`h-[56px] w-[56px] items-center justify-center rounded-selo bg-primaria ${
                  altoContraste ? 'border-padrao border-borda' : ''
                } ${podeEnviar ? '' : 'opacity-50'}`}
              >
                <Icone nome="enviar" cor={cores.sobrePrimaria} />
              </Pressable>
            </View>
            {!voiceAvailable ? (
              <Texto variante="apoio" className="text-textoSecundario">
                A pergunta por voz não está disponível neste navegador (ela exige conexão segura e
                microfone). Digite a sua pergunta.
              </Texto>
            ) : null}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
