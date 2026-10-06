import { useLocalSearchParams } from 'expo-router';
import { DoseDetailScreen } from '../../src/features/doses/dose-detail-screen';

/** Tela de detalhe da dose. */
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DoseDetailScreen id={id} />;
}
