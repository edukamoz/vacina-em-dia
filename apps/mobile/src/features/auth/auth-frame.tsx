import type { ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Texto } from '../../components/texto';
import { modoDeLayout } from '../../lib/layout';
import { Logo } from './logo';

/**
 * Moldura das telas de entrada (Entrar e Criar conta). No computador, duas colunas: a lateral com a
 * marca e a promessa do app, e o formulário ao lado. No celular e no tablet, uma coluna só, com a
 * marca no alto (`docs/04-design-system.md`, seção 2.5).
 *
 * @param props.titulo - Título da tela (cabeçalho para o leitor de tela).
 */
export function AuthFrame({ titulo, children }: { titulo: string; children: ReactNode }) {
  const router = useRouter();
  const expandido = modoDeLayout(useWindowDimensions().width) === 'expandido';

  const formulario = (
    <View className="w-full max-w-form gap-xl">
      <Texto variante="titulo1" accessibilityRole="header">
        {titulo}
      </Texto>
      {children}
    </View>
  );

  if (expandido) {
    return (
      <SafeAreaView className="flex-1 bg-fundo">
        <View className="flex-1 flex-row">
          <View className="w-lateral justify-center gap-xl border-r-padrao border-borda bg-primariaSuave p-[64px]">
            <Logo grande />
            <Texto variante="titulo2" className="max-w-sm">
              Suas vacinas e as da sua família, em dia.
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
