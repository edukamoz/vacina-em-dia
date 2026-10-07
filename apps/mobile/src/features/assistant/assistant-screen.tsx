import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao } from '../../components/botao';
import { CampoTexto } from '../../components/campo-texto';
import { Texto } from '../../components/texto';
import { ChatMessageView } from './chat-message';
import { useAssistantChat } from './use-assistant-chat';
import { MAX_RECORDING_SECONDS, VoiceError, type VoiceRecorder } from './voice-types';
import { isVoiceSupported, useVoiceRecorder } from './voice-recorder';

const MAX_LENGTH = 300;

type VoiceState = 'idle' | 'recording' | 'processing';

/**
 * Aba "Assistente" (RF06 e RF07): chat por texto ou por voz com o chatbot por regras (sem IA
 * generativa). Cada resposta cita a fonte; perguntas sobre saúde individual são encaminhadas a um
 * profissional. A voz grava no aparelho, a API transcreve com o Azure AI Speech e descarta o
 * áudio; se o microfone não estiver disponível, o campo de texto continua funcionando.
 */
export function AssistantScreen() {
  const chat = useAssistantChat();
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

  return (
    <SafeAreaView className="flex-1 bg-fundo">
      <KeyboardAvoidingView
        className="w-full max-w-conteudo flex-1 self-center"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          contentContainerClassName="gap-lg p-lg medio:p-xl"
          keyboardShouldPersistTaps="handled"
        >
          <Texto variante="titulo1" accessibilityRole="header">
            Assistente
          </Texto>
          <Texto className="text-textoSecundario">
            Tire dúvidas sobre o aplicativo e sobre o Calendário Nacional de Vacinação.
          </Texto>
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
              <Texto className="text-textoSecundario" accessibilityRole="progressbar">
                Entendendo a sua pergunta...
              </Texto>
            ) : null}
          </View>
          {falha ? (
            <View
              accessibilityRole="alert"
              className="gap-sm rounded-cartao border-padrao border-erro bg-erroSuave p-md"
            >
              <Texto>{falha}</Texto>
            </View>
          ) : null}
          <Texto variante="apoio" className="text-textoSecundario">
            O assistente não dá orientação médica e não substitui a caderneta oficial nem um
            profissional de saúde. Em emergência, ligue 192 (SAMU).
          </Texto>
        </ScrollView>

        <View className="gap-sm border-t-padrao border-borda bg-superficie p-md">
          {voiceState === 'recording' ? (
            <View className="gap-sm">
              <Texto variante="corpoNegrito" accessibilityLiveRegion="polite">
                {`Gravando... fale a sua pergunta (${segundos} s)`}
              </Texto>
              <Botao titulo="Parar e enviar" onPress={() => void finishRecording()} />
              <Botao titulo="Cancelar" variante="secundario" onPress={cancelRecording} />
            </View>
          ) : (
            <View className="gap-sm">
              <CampoTexto
                rotulo="Sua pergunta"
                value={texto}
                onChangeText={setTexto}
                maxLength={MAX_LENGTH}
                placeholder="Digite aqui"
                returnKeyType="send"
                onSubmitEditing={() => send(texto)}
                editable={voiceState === 'idle'}
              />
              <View className="gap-sm medio:flex-row">
                <View className="medio:flex-1">
                  <Botao
                    titulo="Enviar"
                    disabled={!texto.trim() || chat.thinking || voiceState !== 'idle'}
                    onPress={() => send(texto)}
                  />
                </View>
                {voiceAvailable ? (
                  <View className="medio:flex-1">
                    <Botao
                      titulo={
                        voiceState === 'processing' ? 'Enviando o áudio...' : 'Falar a pergunta'
                      }
                      variante="secundario"
                      disabled={chat.thinking || voiceState !== 'idle'}
                      onPress={() => void startRecording()}
                    />
                  </View>
                ) : null}
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
    </SafeAreaView>
  );
}
