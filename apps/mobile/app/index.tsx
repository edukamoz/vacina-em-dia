import { Text, View } from 'react-native';

/** Tela inicial provisória. As telas reais seguem o protótipo em `docs/04-design-system.md`. */
export default function Home() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '700' }}>
        Vacina em Dia
      </Text>
    </View>
  );
}
