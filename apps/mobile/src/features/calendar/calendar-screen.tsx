import type { DoseResponse } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { AvisoFonte } from '../../components/aviso-fonte';
import { Botao } from '../../components/botao';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { SeletorDeMembro } from '../../components/seletor-de-membro';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { useMemberDoses } from '../data/hooks';
import { DoseCard } from '../doses/dose-card';
import { useSelectedMember } from './use-selected-member';

const SECOES: readonly { status: DoseResponse['status']; titulo: string }[] = [
  { status: 'OVERDUE', titulo: 'Atrasadas' },
  { status: 'SCHEDULED', titulo: 'Agendadas' },
  { status: 'PENDING', titulo: 'A fazer' },
];

/** Resumo em uma frase, por exemplo "2 atrasadas, 1 agendada, 30 a fazer". */
export function resumoDoses(doses: readonly Pick<DoseResponse, 'status'>[]): string {
  const conta = (status: DoseResponse['status']) =>
    doses.filter((dose) => dose.status === status).length;
  const atrasadas = conta('OVERDUE');
  const agendadas = conta('SCHEDULED');
  return [
    `${atrasadas} ${atrasadas === 1 ? 'atrasada' : 'atrasadas'}`,
    `${agendadas} ${agendadas === 1 ? 'agendada' : 'agendadas'}`,
    `${conta('PENDING')} a fazer`,
  ].join(', ');
}

/**
 * Aba "Calendário" (RF03 e RF04): as doses da pessoa escolhida, separadas em atrasadas, agendadas
 * e a fazer, sempre com a fonte e a versão do calendário oficial. As doses já aplicadas ou
 * canceladas ficam no Histórico.
 */
export function CalendarScreen() {
  const router = useRouter();
  const { members, items, selected, selectMember } = useSelectedMember();
  const doses = useMemberDoses(selected?.id ?? null);

  if (members.isPending) {
    return (
      <Tela titulo="Calendário de vacinas">
        <EstadoCarregando rotulo="Carregando a família" />
      </Tela>
    );
  }
  if (members.error) {
    return (
      <Tela titulo="Calendário de vacinas">
        <EstadoErro
          mensagem={members.error.message}
          onTentarDeNovo={() => void members.refetch()}
        />
      </Tela>
    );
  }
  if (!selected) {
    return (
      <Tela titulo="Calendário de vacinas">
        <EstadoVazio
          titulo="Nenhuma pessoa cadastrada"
          descricao="Adicione alguém da família para ver as vacinas indicadas para a idade."
        />
        <Botao titulo="Adicionar pessoa" onPress={() => router.push('/membro/novo')} />
      </Tela>
    );
  }

  const abertas = doses.data?.items.filter((dose) => SECOES.some((s) => s.status === dose.status));

  return (
    <Tela
      titulo="Calendário de vacinas"
      subtitulo="Vacinas indicadas pelo calendário nacional, de acordo com a idade."
    >
      {items.length > 1 ? (
        <SeletorDeMembro membros={items} selecionadoId={selected.id} aoSelecionar={selectMember} />
      ) : (
        <Texto variante="corpoNegrito">{`Carteira de ${selected.name}`}</Texto>
      )}

      {doses.isPending && <EstadoCarregando rotulo="Carregando as vacinas" />}
      {doses.error && (
        <EstadoErro mensagem={doses.error.message} onTentarDeNovo={() => void doses.refetch()} />
      )}

      {abertas && (
        <Texto variante="corpoNegrito" accessibilityLiveRegion="polite">
          {resumoDoses(abertas)}
        </Texto>
      )}
      {abertas && abertas.length === 0 && (
        <EstadoVazio
          titulo="Tudo em dia por aqui"
          descricao="Não há doses abertas. As aplicadas estão na aba Histórico."
        />
      )}
      {SECOES.map(({ status, titulo }) => {
        const lista = abertas?.filter((dose) => dose.status === status) ?? [];
        if (lista.length === 0) return null;
        return (
          <View key={status} className="gap-md">
            <Texto variante="titulo3" accessibilityRole="header">
              {titulo}
            </Texto>
            {lista.map((dose) => (
              <DoseCard
                key={dose.id}
                dose={dose}
                aoAbrir={() => router.push({ pathname: '/dose/[id]', params: { id: dose.id } })}
              />
            ))}
          </View>
        );
      })}
      {doses.data && <AvisoFonte fonte={doses.data.source} />}
    </Tela>
  );
}
