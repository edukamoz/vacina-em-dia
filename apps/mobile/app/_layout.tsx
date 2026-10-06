import { Stack } from 'expo-router';

/** Layout raiz do app: navegação em pilha. Os temas e os componentes entram no design system. */
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
