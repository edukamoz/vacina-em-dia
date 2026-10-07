import type { DoseResponse } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { AvisoFonte } from '../../components/aviso-fonte';
import { Botao } from '../../components/botao';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { Grade } from '../../components/grade';
import { SeletorDeMembro } from '../../components/seletor-de-membro';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { useSelectedMember } from '../calendar/use-selected-member';
import { useMemberDoses } from '../data/hooks';
import { DoseCard } from '../doses/dose-card';

/**
 * Doses do histórico: aplicadas (da mais recente para a mais antiga) e depois as canceladas.
 *
 * @param doses - Doses do membro.
 */
export function historyOf(doses: readonly DoseResponse[]): DoseResponse[] {
  const aplicadas = doses
    .filter((dose) => dose.status === 'APPLIED')
    .sort((a, b) => (b.appliedDate ?? '').localeCompare(a.appliedDate ?? ''));
  const canceladas = doses.filter((dose) => dose.status === 'CANCELLED');
  return [...aplicadas, ...canceladas];
}

/** Aba "Histórico" (RF08): o que já foi aplicado ou cancelado, com a data de cada aplicação. */
export function HistoryScreen() {
  const router = useRouter();
  const { members, items, selected, selectMember } = useSelectedMember();
  const doses = useMemberDoses(selected?.id ?? null);

  if (members.isPending) {
    return (
      <Tela reservaBalao titulo="Histórico">
        <EstadoCarregando rotulo="Carregando a família" />
      </Tela>
    );
  }
  if (members.error) {
    return (
      <Tela reservaBalao titulo="Histórico">
        <EstadoErro
          mensagem={members.error.message}
          onTentarDeNovo={() => void members.refetch()}
        />
      </Tela>
    );
  }
  if (!selected) {
    return (
      <Tela reservaBalao titulo="Histórico">
        <EstadoVazio
          titulo="Nenhuma pessoa cadastrada"
          descricao="Adicione alguém da família para registrar e consultar as vacinas tomadas."
        />
        <Botao titulo="Adicionar pessoa" onPress={() => router.push('/membro/novo')} />
      </Tela>
    );
  }

  const historico = doses.data ? historyOf(doses.data.items) : undefined;

  return (
    <Tela reservaBalao titulo="Histórico" subtitulo="Vacinas já aplicadas ou canceladas.">
      {items.length > 1 ? (
        <SeletorDeMembro membros={items} selecionadoId={selected.id} aoSelecionar={selectMember} />
      ) : (
        <Texto variante="corpoNegrito">{`Carteira de ${selected.name}`}</Texto>
      )}
      {doses.isPending && <EstadoCarregando rotulo="Carregando o histórico" />}
      {doses.error && (
        <EstadoErro mensagem={doses.error.message} onTentarDeNovo={() => void doses.refetch()} />
      )}
      {historico && historico.length === 0 && (
        <EstadoVazio
          titulo="Nenhuma dose registrada ainda"
          descricao="Quando você registrar uma vacina como aplicada, ela aparece aqui."
        />
      )}
      {historico && historico.length > 0 && (
        <Grade>
          {historico.map((dose) => (
            <DoseCard
              key={dose.id}
              dose={dose}
              aoAbrir={() => router.push({ pathname: '/dose/[id]', params: { id: dose.id } })}
            />
          ))}
        </Grade>
      )}
      {doses.data && <AvisoFonte fonte={doses.data.source} />}
    </Tela>
  );
}
