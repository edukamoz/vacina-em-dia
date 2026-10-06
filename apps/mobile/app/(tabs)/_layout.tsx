import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { EstadoCarregando, EstadoErro } from '../../src/components/estados';
import { Tela } from '../../src/components/tela';
import { useConsent } from '../../src/features/data/hooks';
import { useTheme } from '../../src/theme/theme-provider';
import { getThemeColors } from '../../src/theme/tokens';

const ABAS = [
  { name: 'index', titulo: 'Família', icone: '⌂' },
  { name: 'calendario', titulo: 'Calendário', icone: '▦' },
  { name: 'assistente', titulo: 'Assistente', icone: '✉' },
  { name: 'historico', titulo: 'Histórico', icone: '☰' },
  { name: 'conta', titulo: 'Conta', icone: '☺' },
] as const;

/**
 * Abas do app. Antes de mostrá-las, confere o consentimento (RF09): quem ainda não aceitou o termo
 * é levado à tela de consentimento.
 */
export default function TabsLayout() {
  const { theme } = useTheme();
  const consent = useConsent();
  const colors = getThemeColors(theme);

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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaria,
        tabBarInactiveTintColor: colors.textoSecundario,
        tabBarStyle: {
          backgroundColor: colors.superficie,
          borderTopColor: colors.borda,
          borderTopWidth: 2,
          minHeight: 64,
        },
        tabBarLabelStyle: { fontFamily: 'AtkinsonHyperlegible_700Bold', fontSize: 13 },
      }}
    >
      {ABAS.map(({ name, titulo, icone }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: titulo,
            tabBarAccessibilityLabel: titulo,
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>{icone}</Text>,
          }}
        />
      ))}
    </Tabs>
  );
}
