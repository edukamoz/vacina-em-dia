import { useRouter } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { modoDeLayout } from '../lib/layout';
import { useMovimentoReduzido, useThemeColors, useVisual } from '../theme/theme-provider';
import { CURVA, DURACAO, USA_DRIVER_NATIVO, VistaAnimada } from './animacao';
import { Icone } from './icone';
import { Texto } from './texto';

/**
 * Janela por cima da tela de trás, no lugar de uma página inteira: no celular é uma folha que sobe
 * do rodapé; no tablet e no computador, um cartão centralizado. Um véu escurece o fundo e fecha ao
 * tocar fora; o botão "Fechar" e a tecla Esc (na web) também fecham. Tem papel de diálogo e nome
 * igual ao título, e a entrada (véu que aparece e janela que sobe) para com "Reduzir movimento".
 *
 * Fechar volta para a tela anterior; sem histórico (página aberta direto pelo endereço), vai ao
 * início.
 *
 * @param props.titulo - Título da janela (também é o nome do diálogo).
 * @param props.subtitulo - Frase de apoio abaixo do título.
 * @param props.acao - Ação principal (botão), mostrada abaixo do título.
 * @param props.abaixoDoTitulo - Conteúdo colado ao título.
 * @param props.largura - Largura a considerar; por padrão, a da janela (útil para testar).
 */
export function JanelaModal({
  titulo,
  subtitulo,
  acao,
  abaixoDoTitulo,
  largura,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
  abaixoDoTitulo?: ReactNode;
  largura?: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const cores = useThemeColors();
  const { altoContraste, sombra } = useVisual();
  const reduzido = useMovimentoReduzido();
  const janela = useWindowDimensions().width;
  const compacto = modoDeLayout(largura ?? janela) === 'compacto';
  const progresso = useRef(new Animated.Value(reduzido ? 1 : 0)).current;

  const fechar = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const fecharRef = useRef(fechar);
  fecharRef.current = fechar;

  useEffect(() => {
    if (reduzido) {
      progresso.setValue(1);
      return;
    }
    const animacao = Animated.timing(progresso, {
      toValue: 1,
      duration: DURACAO.enfatica,
      easing: CURVA.saida,
      useNativeDriver: USA_DRIVER_NATIVO,
    });
    animacao.start();
    return () => animacao.stop();
  }, [reduzido, progresso]);

  // Esc fecha a janela na web.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') fecharRef.current();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, []);

  const borda = altoContraste
    ? 'border-altoContraste border-borda'
    : 'border-fina border-bordaSuave';
  const subida = progresso.interpolate({
    inputRange: [0, 1],
    outputRange: [compacto ? 80 : 28, 0],
  });

  return (
    <View className="flex-1 items-center justify-end medio:justify-center">
      <VistaAnimada
        pointerEvents="box-none"
        style={{ opacity: progresso }}
        className="absolute inset-0"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar a janela"
          onPress={fechar}
          className={`absolute inset-0 ${altoContraste ? 'bg-black/80' : 'bg-black/50'}`}
        />
      </VistaAnimada>
      <VistaAnimada
        role="dialog"
        aria-modal
        aria-label={titulo}
        accessibilityViewIsModal
        style={[sombra(3), { opacity: progresso, transform: [{ translateY: subida }] }]}
        className={`w-full overflow-hidden bg-superficie ${borda} ${
          compacto ? 'max-h-[92%] rounded-t-folha' : 'max-h-[88%] max-w-[680px] rounded-folha'
        }`}
      >
        <View className="flex-row items-start gap-md border-b-fina border-bordaSuave px-lg py-md">
          <View className="flex-1 gap-xs">
            <Texto variante="titulo2" accessibilityRole="header">
              {titulo}
            </Texto>
            {subtitulo ? <Texto className="text-textoSecundario">{subtitulo}</Texto> : null}
            {abaixoDoTitulo}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={fechar}
            className="h-[48px] w-[48px] items-center justify-center rounded-selo hover:bg-superficieSuave"
          >
            <Icone nome="fechar" cor={cores.texto} />
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-lg p-lg"
          showsVerticalScrollIndicator={false}
        >
          {acao}
          {children}
        </ScrollView>
      </VistaAnimada>
    </View>
  );
}
