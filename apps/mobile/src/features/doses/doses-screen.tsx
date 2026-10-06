import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvisoFonte } from '../../components/aviso-fonte';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { SeletorDeTema } from '../../components/seletor-de-tema';
import { Texto } from '../../components/texto';
import { DoseCard } from './dose-card';
import { useDoses } from './use-doses';

/**
 * Tela provisória do esqueleto: doses vindas da API (calendário `FICTITIOUS`) e troca de tema.
 * As telas reais seguem o protótipo em `docs/04-design-system.md`.
 */
export function DosesScreen() {
  const { data, error, isPending, refetch } = useDoses();

  return (
    <SafeAreaView className="flex-1 bg-fundo">
      <ScrollView contentContainerClassName="gap-lg p-lg medio:p-xl self-center w-full max-w-conteudo">
        <Texto variante="titulo1" accessibilityRole="header">
          Vacina em Dia
        </Texto>
        <Texto variante="titulo3" accessibilityRole="header">
          Doses de exemplo
        </Texto>
        {isPending && <EstadoCarregando rotulo="Carregando as doses" />}
        {error && <EstadoErro mensagem={error.message} onTentarDeNovo={() => void refetch()} />}
        {data && data.items.length === 0 && (
          <EstadoVazio
            titulo="Nenhuma dose por aqui"
            descricao="Quando houver doses, elas aparecem nesta lista."
          />
        )}
        {data?.items.map((dose) => (
          <DoseCard key={dose.id} dose={dose} />
        ))}
        {data && <AvisoFonte fonte={data.source} />}
        <SeletorDeTema />
      </ScrollView>
    </SafeAreaView>
  );
}
