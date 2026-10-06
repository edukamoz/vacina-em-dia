import { useLocalSearchParams } from 'expo-router';
import { EditMemberScreen } from '../../src/features/family/member-form-screen';

/** Tela Editar pessoa. */
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditMemberScreen id={id} />;
}
