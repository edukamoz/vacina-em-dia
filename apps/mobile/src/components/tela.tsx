import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao } from './botao';
import { Texto } from './texto';

/**
 * Moldura de toda tela: área segura, rolagem e largura máxima de leitura, com o título da tela
 * como cabeçalho (para o leitor de tela) e, nas telas secundárias, um botão "Voltar".
 *
 * @param props.titulo - Título da tela.
 * @param props.subtitulo - Frase de apoio abaixo do título.
 * @param props.voltar - Mostra o botão "Voltar" (telas fora das abas).
 * @param props.acao - Ação principal da tela (botão). No computador fica à direita do título; no
 *   celular, logo abaixo dele, em largura total.
 * @param props.abaixoDoTitulo - Conteúdo colado ao título, como o link "Trocar pessoa".
 * @param props.reservaBalao - Deixa espaço no fim para o balão do assistente não cobrir o conteúdo
 *   (telas das abas).
 */
export function Tela({
  titulo,
  subtitulo,
  voltar = false,
  acao,
  abaixoDoTitulo,
  reservaBalao = false,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  voltar?: boolean;
  acao?: ReactNode;
  abaixoDoTitulo?: ReactNode;
  reservaBalao?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-fundo">
      <ScrollView
        contentContainerClassName={`gap-xl p-lg medio:p-xl expandido:gap-xxl expandido:p-xxl self-center w-full max-w-conteudoComMargem ${
          reservaBalao ? 'pb-[96px]' : ''
        }`}
      >
        {voltar ? (
          <Botao
            titulo="Voltar"
            variante="secundario"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        ) : null}
        <View className="gap-md expandido:flex-row expandido:items-start expandido:justify-between expandido:gap-xl">
          <View className="expandido:flex-1">
            <Texto variante="titulo1" accessibilityRole="header">
              {titulo}
            </Texto>
            {subtitulo ? <Texto className="text-textoSecundario">{subtitulo}</Texto> : null}
            {abaixoDoTitulo}
          </View>
          {acao}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
