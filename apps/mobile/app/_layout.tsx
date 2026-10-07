import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible';
import { QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider as NavigationTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { EstadoCarregando } from '../src/components/estados';
import { Tela } from '../src/components/tela';
import '../global.css';
import { createQueryClient } from '../src/api/query-client';
import { SessionProvider, useSession } from '../src/session/session-provider';
import { ThemeProvider, useThemeColors } from '../src/theme/theme-provider';

/**
 * Rotas conforme o login: sem sessão, só a apresentação, "Entrar", "Criar conta" e os textos legais (Termos e Privacidade, abertos também a quem entrou); com sessão, o
 * app (abas, consentimento, membros e doses). O `Stack.Protected` tira do mapa as rotas que a
 * situação atual não permite, então uma URL de dentro do app nunca abre para quem não entrou.
 */
function Rotas() {
  const { status } = useSession();
  const cores = useThemeColors();
  if (status === 'loading') {
    return (
      <Tela titulo="Vacina em Dia">
        <EstadoCarregando rotulo="Abrindo o aplicativo" />
      </Tela>
    );
  }
  const entrou = status === 'authenticated';
  return (
    <NavigationTheme
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, background: cores.fundo, card: cores.fundo },
      }}
    >
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}>
        <Stack.Protected guard={entrou}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="consentimento" />
          <Stack.Screen name="dose/nova" />
          <Stack.Screen name="dose/[id]" />
          <Stack.Screen name="membro/[id]" />
          <Stack.Screen name="membro/novo" />
        </Stack.Protected>
        <Stack.Protected guard={!entrou}>
          <Stack.Screen name="apresentacao" />
          <Stack.Screen name="entrar" />
          <Stack.Screen name="criar-conta" />
          <Stack.Screen name="esqueci-senha" />
          <Stack.Screen name="redefinir-senha" />
        </Stack.Protected>
        <Stack.Screen name="termos" />
        <Stack.Screen name="privacidade" />
      </Stack>
    </NavigationTheme>
  );
}

/**
 * Layout raiz: carrega a fonte Atkinson Hyperlegible, cria o cliente de dados, guarda a sessão,
 * aplica o tema e monta a navegação em pilha (as abas ficam em `(tabs)`).
 */
export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
  });

  // Sem a fonte o app ainda funciona com a fonte do sistema; só espera enquanto carrega.
  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <Rotas />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
