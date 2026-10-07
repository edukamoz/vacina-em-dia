import type { DoseResponse } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { AvisoFonte } from '../../components/aviso-fonte';
import { Botao } from '../../components/botao';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { Grade } from '../../components/grade';
import { LinkTexto } from '../../components/link-texto';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { useSelectedMember } from '../calendar/use-selected-member';
import { useMemberDoses } from '../data/hooks';
import { DoseCard } from './dose-card';

/** Quantas aplicadas aparecem na tela; as demais ficam no Histórico. */
export const LIMITE_APLICADAS = 5;

/** Data mais próxima primeiro; dose sem data (conforme histórico, gestação) vai para o fim. */
function dataDaProxima(dose: DoseResponse): string {
  return (dose.status === 'SCHEDULED' ? dose.scheduledDate : dose.dueDate) ?? '9999-12-31';
}

/**
 * Separa as doses da pessoa nos três grupos da tela: as que precisam de atenção (atrasadas), as
 * próximas (agendadas primeiro, depois as pendentes, cada grupo pela data) e as já aplicadas, da
 * mais recente para a mais antiga. As canceladas não aparecem; ficam no Histórico.
 */
export function agruparDoses(doses: readonly DoseResponse[]) {
  const porData = (a: DoseResponse, b: DoseResponse) =>
    dataDaProxima(a).localeCompare(dataDaProxima(b));
  const atencao = doses.filter((dose) => dose.status === 'OVERDUE').sort(porData);
  const agendadas = doses.filter((dose) => dose.status === 'SCHEDULED').sort(porData);
  const pendentes = doses.filter((dose) => dose.status === 'PENDING').sort(porData);
  const aplicadas = doses
    .filter((dose) => dose.status === 'APPLIED')
    .sort((a, b) => (b.appliedDate ?? '').localeCompare(a.appliedDate ?? ''));
  return { atencao, proximas: [...agendadas, ...pendentes], aplicadas };
}

/**
 * Aba "Doses" (RF03 e RF04): as doses da pessoa escolhida em três grupos ("Precisam de atenção",
 * "Próximas" e "Aplicadas"), sempre com a fonte e a versão do calendário oficial. A troca de pessoa
 * é pela aba Família.
 */
export function DosesScreen() {
  const router = useRouter();
  const { members, selected } = useSelectedMember();
  const doses = useMemberDoses(selected?.id ?? null);

  if (members.isPending) {
    return (
      <Tela titulo="Doses" reservaBalao>
        <EstadoCarregando rotulo="Carregando a família" />
      </Tela>
    );
  }
  if (members.error) {
    return (
      <Tela titulo="Doses" reservaBalao>
        <EstadoErro
          mensagem={members.error.message}
          onTentarDeNovo={() => void members.refetch()}
        />
      </Tela>
    );
  }
  if (!selected) {
    return (
      <Tela titulo="Doses" reservaBalao>
        <EstadoVazio
          titulo="Nenhuma pessoa cadastrada"
          descricao="Adicione alguém da família para ver as vacinas indicadas para a idade."
        />
        <Botao titulo="Adicionar pessoa" onPress={() => router.push('/membro/novo')} />
      </Tela>
    );
  }

  const grupos = doses.data ? agruparDoses(doses.data.items) : null;
  const aplicadasVisiveis = grupos?.aplicadas.slice(0, LIMITE_APLICADAS) ?? [];
  const secoes = grupos
    ? [
        { titulo: 'Precisam de atenção', lista: grupos.atencao },
        { titulo: 'Próximas', lista: grupos.proximas },
        { titulo: 'Aplicadas', lista: aplicadasVisiveis },
      ]
    : [];

  return (
    <Tela reservaBalao titulo={`Doses de ${selected.name.split(' ')[0] ?? selected.name}`}>
      <LinkTexto titulo="Trocar pessoa" onPress={() => router.push('/familia')} />

      {doses.isPending && <EstadoCarregando rotulo="Carregando as vacinas" />}
      {doses.error && (
        <EstadoErro mensagem={doses.error.message} onTentarDeNovo={() => void doses.refetch()} />
      )}
      {grupos && grupos.atencao.length + grupos.proximas.length === 0 && (
        <EstadoVazio
          titulo="Tudo em dia por aqui"
          descricao="Não há doses abertas para esta pessoa."
        />
      )}
      {secoes.map(({ titulo, lista }) =>
        lista.length === 0 ? null : (
          <View key={titulo} className="gap-md">
            <Texto variante="titulo2" accessibilityRole="header">
              {titulo}
            </Texto>
            <Grade>
              {lista.map((dose) => (
                <DoseCard
                  key={dose.id}
                  dose={dose}
                  aoAbrir={() => router.push({ pathname: '/dose/[id]', params: { id: dose.id } })}
                />
              ))}
            </Grade>
          </View>
        ),
      )}
      {grupos && grupos.aplicadas.length > LIMITE_APLICADAS && (
        <LinkTexto titulo="Ver todas no Histórico" onPress={() => router.push('/historico')} />
      )}
      {doses.data && <AvisoFonte fonte={doses.data.source} />}
    </Tela>
  );
}
