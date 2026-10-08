import type { DoseResponse } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AvisoFonte } from '../../components/aviso-fonte';
import { Botao } from '../../components/botao';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { CarrosselDePessoas } from '../../components/carrossel-de-pessoas';
import { Grade } from '../../components/grade';
import { Icone } from '../../components/icone';
import { LinkTexto } from '../../components/link-texto';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { todayCivil } from '../../lib/dates';
import { useThemeColors } from '../../theme/theme-provider';
import { useSelectedMember } from '../calendar/use-selected-member';
import { useMemberDoses } from '../data/hooks';
import { DoseCard } from './dose-card';
import { Festa } from './festa';
import { LembretesCard } from './lembretes-card';
import { contarDoses, ResumoDoses } from './resumo-doses';

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
 * "Próximas" e "Aplicadas"), sempre com a fonte e a versão do calendário oficial. Antes dos grupos, o
 * carrossel de pessoas (troca de quem se vê) e o resumo com anel de progresso.
 */
export function DosesScreen() {
  const router = useRouter();
  const cores = useThemeColors();
  const { members, items, selected, selectMember } = useSelectedMember();
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

  const primeiroNome = selected.name.split(' ')[0] ?? selected.name;
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
    <Tela
      reservaBalao
      titulo={`Doses de ${primeiroNome}`}
      acao={
        <Botao titulo="Adicionar dose" icone="mais" onPress={() => router.push('/dose/nova')} />
      }
    >
      <CarrosselDePessoas pessoas={items} selecionadaId={selected.id} aoEscolher={selectMember} />
      <LembretesCard />
      {doses.data && (
        <ResumoDoses nome={primeiroNome} contagem={contarDoses(doses.data.items, todayCivil())} />
      )}
      {doses.isPending && <EstadoCarregando rotulo="Carregando as vacinas" />}
      {doses.error && (
        <EstadoErro mensagem={doses.error.message} onTentarDeNovo={() => void doses.refetch()} />
      )}
      {grupos && grupos.atencao.length + grupos.proximas.length === 0 && (
        <Festa nome={primeiroNome} />
      )}
      {secoes.map(({ titulo, lista }) =>
        lista.length === 0 ? null : (
          <View key={titulo} className="gap-lg">
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
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Postos de saúde perto de você. Veja no mapa onde tomar as doses."
        onPress={() => router.push('/postos')}
        className="flex-row items-center gap-md rounded-cartao border-fina border-bordaSuave bg-superficie p-lg hover:bg-superficieSuave"
      >
        <View
          aria-hidden
          className="h-[44px] w-[44px] items-center justify-center rounded-[14px] border-padrao border-primaria bg-primariaSuave"
        >
          <Icone nome="local" cor={cores.primaria} />
        </View>
        <View className="flex-1">
          <Texto variante="titulo3" importantForAccessibility="no">
            Postos de saúde perto de você
          </Texto>
          <Texto variante="apoio" className="text-textoSecundario" importantForAccessibility="no">
            Veja no mapa onde tomar as doses.
          </Texto>
        </View>
        <Icone nome="seta" cor={cores.textoSecundario} />
      </Pressable>
      {doses.data && <AvisoFonte fonte={doses.data.source} />}
    </Tela>
  );
}
