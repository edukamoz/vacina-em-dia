import { Redirect, Tabs } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { BalaoAssistente } from '../../src/components/balao-assistente';
import { ABAS, BarraDeNavegacao } from '../../src/components/barra-de-navegacao';
import { EstadoCarregando, EstadoErro } from '../../src/components/estados';
import { Tela } from '../../src/components/tela';
import { AssistenteProvider } from '../../src/features/assistant/assistente-contexto';
import { JanelaDoAssistente } from '../../src/features/assistant/janela-do-assistente';
import { useConsent } from '../../src/features/data/hooks';
import { modoDeLayout, posicaoDaBarra } from '../../src/lib/layout';
import { useThemeColors } from '../../src/theme/theme-provider';

/**
 * Abas do app (Doses, Família, Histórico e Conta) com a navegação própria de `BarraDeNavegacao` (embaixo no celular, lateral no
 * computador). Antes de mostrá-las, confere o consentimento (RF09): quem ainda não aceitou o termo
 * é levado à tela de consentimento.
 */
export default function TabsLayout() {
  const largura = useWindowDimensions().width;
  const consent = useConsent();
  const cores = useThemeColors();

  if (consent.isPending) {
    return (
      <Tela titulo="Vacina em Dia">
        <EstadoCarregando rotulo="Abrindo o aplicativo" />
      </Tela>
    );
  }
  if (consent.error) {
    return (
      <Tela titulo="Vacina em Dia">
        <EstadoErro
          mensagem={consent.error.message}
          onTentarDeNovo={() => void consent.refetch()}
        />
      </Tela>
    );
  }
  if (!consent.data.accepted) return <Redirect href="/consentimento" />;

  return (
    <AssistenteProvider>
      <View className="flex-1">
        <Tabs
          tabBar={() => <BarraDeNavegacao />}
          screenOptions={{
            headerShown: false,
            // O fundo padrão do navegador é um cinza claro fixo; sem isto ele aparece nos temas Escuro e Alto contraste.
            sceneStyle: { backgroundColor: cores.fundo },
            // Celular: barra embaixo. Tablet e computador: barra lateral (design system, seção 2.5).
            tabBarPosition: posicaoDaBarra(modoDeLayout(largura)),
          }}
        >
          {ABAS.map(({ name, titulo }) => (
            <Tabs.Screen key={name} name={name} options={{ title: titulo }} />
          ))}
        </Tabs>
        <BalaoAssistente />
        <JanelaDoAssistente />
      </View>
    </AssistenteProvider>
  );
}
