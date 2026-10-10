import { Children, type ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Entrada } from '../../components/animacao';
import { LinkTexto } from '../../components/link-texto';
import { AtalhoDeMovimento } from '../../components/seletor-de-movimento';
import { Texto } from '../../components/texto';
import { modoDeLayout } from '../../lib/layout';
import { useVisual } from '../../theme/theme-provider';
import { Inclinar } from '../../components/inclinar';
import { Logo, Simbolo } from './logo';

/**
 * Moldura das telas de entrada (Entrar e Criar conta). No computador, duas colunas: a lateral em
 * gradiente com o símbolo da marca e a promessa do app, e o formulário ao lado. No celular e no tablet, uma coluna só, com a
 * marca no alto (`docs/04-design-system.md`, seção 2.5).
 *
 * @param props.titulo - Título da tela (cabeçalho para o leitor de tela).
 */
export function AuthFrame({ titulo, children }: { titulo: string; children: ReactNode }) {
  const router = useRouter();
  const expandido = modoDeLayout(useWindowDimensions().width) === 'expandido';
  const { gradienteMarca, altoContraste } = useVisual();

  // Cada bloco do formulário entra um depois do outro, como no protótipo; parado com "Reduzir movimento".
  const formulario = (
    <View className="w-full max-w-form gap-xl">
      {expandido ? (
        <Entrada>
          <LinkTexto titulo="Voltar" onPress={() => router.push('/apresentacao')} />
        </Entrada>
      ) : null}
      <Entrada indice={1}>
        <Texto variante="titulo1" accessibilityRole="header">
          {titulo}
        </Texto>
      </Entrada>
      {Children.toArray(children).map((filho, indice) => (
        <Entrada key={indice} indice={indice + 2}>
          {filho}
        </Entrada>
      ))}
      <Entrada indice={Children.count(children) + 2}>
        <AtalhoDeMovimento />
      </Entrada>
    </View>
  );

  if (expandido) {
    return (
      <SafeAreaView className="flex-1 bg-fundo">
        <View className="flex-1 flex-row">
          <View
            style={gradienteMarca}
            className={`w-lateral justify-center gap-xl bg-primaria p-[64px] ${
              altoContraste ? 'border-r-altoContraste border-borda' : ''
            }`}
          >
            <Inclinar>
              <Simbolo tamanho={132} invertido />
            </Inclinar>
            <Texto variante="exibicao" className="max-w-[420px] text-sobrePrimaria">
              As vacinas da sua família, em dia
            </Texto>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow items-center justify-center p-xxl"
          >
            {formulario}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-fundo">
      <ScrollView contentContainerClassName="items-center gap-xxl px-lg py-xl medio:p-xl">
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Vacina em Dia, voltar à apresentação"
          onPress={() => router.push('/apresentacao')}
          className="min-h-toque w-full max-w-form justify-center"
        >
          <Logo />
        </Pressable>
        {formulario}
      </ScrollView>
    </SafeAreaView>
  );
}
