import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
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
 */
export function Tela({
  titulo,
  subtitulo,
  voltar = false,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  voltar?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-fundo">
      <ScrollView contentContainerClassName="gap-lg p-lg medio:p-xl expandido:p-xxl self-center w-full max-w-conteudo">
        {voltar ? (
          <Botao
            titulo="Voltar"
            variante="secundario"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        ) : null}
        <Texto variante="titulo1" accessibilityRole="header">
          {titulo}
        </Texto>
        {subtitulo ? <Texto className="text-textoSecundario">{subtitulo}</Texto> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
