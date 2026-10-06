import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvisoFonte } from '../src/components/aviso-fonte';
import { Botao } from '../src/components/botao';
import { Texto } from '../src/components/texto';
import { DoseCard } from '../src/features/doses/dose-card';
import { SAMPLE_DOSES, SAMPLE_SOURCE } from '../src/features/doses/sample-doses';
import { useTheme } from '../src/theme/theme-provider';
import { THEME_LABELS, THEME_NAMES } from '../src/theme/tokens';

/**
 * Tela provisória do esqueleto: doses de exemplo (calendário `FICTITIOUS`) e troca de tema.
 * As telas reais seguem o protótipo em `docs/04-design-system.md`.
 */
export default function Home() {
  const { theme, setPreference } = useTheme();
  return (
    <SafeAreaView className="flex-1 bg-fundo">
      <ScrollView contentContainerClassName="gap-lg p-lg medio:p-xl self-center w-full max-w-conteudo">
        <Texto variante="titulo1" accessibilityRole="header">
          Vacina em Dia
        </Texto>
        <Texto variante="titulo3" accessibilityRole="header">
          Doses de exemplo
        </Texto>
        {SAMPLE_DOSES.map((dose) => (
          <DoseCard key={dose.id} dose={dose} />
        ))}
        <AvisoFonte fonte={SAMPLE_SOURCE} />
        <View className="gap-sm">
          <Texto variante="rotulo">Aparência</Texto>
          {THEME_NAMES.map((name) => (
            <Botao
              key={name}
              titulo={THEME_LABELS[name]}
              variante={name === theme ? 'principal' : 'secundario'}
              accessibilityState={{ selected: name === theme }}
              onPress={() => setPreference(name)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
