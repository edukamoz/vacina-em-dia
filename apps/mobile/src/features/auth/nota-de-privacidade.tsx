import { View } from 'react-native';
import { AzulejoDeMarca } from '../../components/azulejo-de-marca';
import { Texto } from '../../components/texto';

/**
 * Nota curta de privacidade das telas de entrada: os dados de saúde são só da pessoa e a conta
 * pode ser excluída quando ela quiser (RF09 e LGPD). O ícone é decorativo.
 */
export function NotaDePrivacidade() {
  return (
    <View className="flex-row items-start gap-md rounded-cartao bg-primariaSuave p-lg">
      <AzulejoDeMarca icone="info" />
      <Texto variante="apoio" className="min-w-0 flex-1">
        Seus dados de saúde são só seus. Você pode excluir a conta quando quiser.
      </Texto>
    </View>
  );
}
