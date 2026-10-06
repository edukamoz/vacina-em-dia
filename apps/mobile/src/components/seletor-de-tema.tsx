import { View } from 'react-native';
import { useTheme } from '../theme/theme-provider';
import { THEME_LABELS, THEME_NAMES } from '../theme/tokens';
import { Botao } from './botao';
import { Texto } from './texto';

/** Escolha da aparência: Claro, Escuro ou Alto contraste. O tema em uso aparece como selecionado. */
export function SeletorDeTema() {
  const { theme, setPreference } = useTheme();
  return (
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
  );
}
