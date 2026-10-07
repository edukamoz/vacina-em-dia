import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { EstadoCarregando } from '../src/components/estados';
import { Tela } from '../src/components/tela';
import '../global.css';
import { createQueryClient } from '../src/api/query-client';
import { SessionProvider, useSession } from '../src/session/session-provider';
import { ThemeProvider } from '../src/theme/theme-provider';

/**
 * Rotas conforme o login: sem sessão, só a apresentação, "Entrar" e "Criar conta"; com sessão, o
 * app (abas, consentimento, membros e doses). O `Stack.Protected` tira do mapa as rotas que a
 * situação atual não permite, então uma URL de dentro do app nunca abre para quem não entrou.
 */
function Rotas() {
  const { status } = useSession();
  if (status === 'loading') {
    return (
      <Tela titulo="Vacina em Dia">
        <EstadoCarregando rotulo="Abrindo o aplicativo" />
      </Tela>
    );
  }
  const entrou = status === 'authenticated';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={entrou}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="consentimento" />
        <Stack.Screen name="dose/[id]" />
        <Stack.Screen name="membro/[id]" />
        <Stack.Screen name="membro/novo" />
      </Stack.Protected>
      <Stack.Protected guard={!entrou}>
        <Stack.Screen name="apresentacao" />
        <Stack.Screen name="entrar" />
        <Stack.Screen name="criar-conta" />
      </Stack.Protected>
    </Stack>
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
