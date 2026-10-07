import { Redirect, Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { ABAS, BarraDeNavegacao } from '../../src/components/barra-de-navegacao';
import { EstadoCarregando, EstadoErro } from '../../src/components/estados';
import { Tela } from '../../src/components/tela';
import { useConsent } from '../../src/features/data/hooks';
import { modoDeLayout, posicaoDaBarra } from '../../src/lib/layout';

/**
 * Abas do app, com a navegação própria de `BarraDeNavegacao` (embaixo no celular, lateral no
 * computador). Antes de mostrá-las, confere o consentimento (RF09): quem ainda não aceitou o termo
 * é levado à tela de consentimento.
 */
export default function TabsLayout() {
  const largura = useWindowDimensions().width;
  const consent = useConsent();

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
    <Tabs
      tabBar={() => <BarraDeNavegacao />}
      screenOptions={{
        headerShown: false,
        // Celular: barra embaixo. Tablet e computador: barra lateral (design system, seção 2.5).
        tabBarPosition: posicaoDaBarra(modoDeLayout(largura)),
      }}
    >
      {ABAS.map(({ name, titulo }) => (
        <Tabs.Screen key={name} name={name} options={{ title: titulo }} />
      ))}
    </Tabs>
  );
}
