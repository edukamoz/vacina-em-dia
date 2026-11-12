import {
  addDays,
  buildTravelChecklist,
  type TravelChecklistItem,
  type TravelDestination,
  type TravelItemStatus,
} from '@vacina/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { GrupoDeRadios } from '../../components/grupo-de-radios';
import { SeletorDeData } from '../../components/seletor-de-data';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { todayCivil } from '../../lib/dates';
import { useSelectedMember } from '../calendar/use-selected-member';
import { useMemberDoses } from '../data/hooks';
import { formatCivilDate } from '../doses/format-date';

/** Rótulo de cada situação: o texto vem junto da cor, então nada depende só dela. */
export const ROTULO_DA_SITUACAO: Readonly<Record<TravelItemStatus, string>> = {
  DONE: 'Consta no histórico',
  TODO: 'A fazer',
  LATE: 'Prazo já passou',
  INFO: 'Para conferir',
};

const CAIXA: Readonly<Record<TravelItemStatus, string>> = {
  DONE: 'border-aplicada bg-aplicadaSuave',
  TODO: 'border-pendente bg-pendenteSuave',
  LATE: 'border-atrasada bg-atrasadaSuave',
  INFO: 'border-borda bg-superficieSuave',
};

/** Um item do checklist: situação, prazo, frase sobre a pessoa e links oficiais. */
function ItemDoRoteiro({ item }: { item: TravelChecklistItem }) {
  return (
    <Cartao className="gap-sm">
      <View
        className={`self-start rounded-selo border-padrao px-md py-xs ${CAIXA[item.status]}`}
        accessibilityLabel={`Situação: ${ROTULO_DA_SITUACAO[item.status]}`}
      >
        <Texto variante="rotulo" importantForAccessibility="no">
          {ROTULO_DA_SITUACAO[item.status]}
        </Texto>
      </View>
      <Texto variante="titulo3" accessibilityRole="header">
        {item.title}
      </Texto>
      <Texto>{item.text}</Texto>
      {item.deadline ? (
        <Texto variante="corpoNegrito">{`Vacinar até ${formatCivilDate(item.deadline)}`}</Texto>
      ) : null}
      {item.detail ? <Texto className="text-textoSecundario">{item.detail}</Texto> : null}
      <View className="gap-xs">
        {item.links.map((link) => (
          <Botao
            key={link.url}
            titulo={link.label}
            variante="secundario"
            onPress={() => void Linking.openURL(link.url)}
          />
        ))}
      </View>
    </Cartao>
  );
}

/**
 * Tela "Preparar viagem" (B74): a pessoa escolhe se vai dentro do Brasil ou para o exterior e a
 * data da partida, e o app monta um checklist com o histórico dela e o roteiro do Ministério da
 * Saúde. É um checklist, não um oráculo: não diz se a pessoa pode viajar nem qual vacina tomar, só
 * o que consta no histórico e manda procurar um serviço de saúde. Não há tabela de países.
 */
export function ViagemScreen() {
  const router = useRouter();
  const { selected, members } = useSelectedMember();
  const doses = useMemberDoses(selected?.id ?? null);
  const hoje = todayCivil();
  const [destino, setDestino] = useState<TravelDestination>('BRAZIL');
  const [partida, setPartida] = useState(() => addDays(hoje, 30));
  const [montado, setMontado] = useState(false);

  if (members.isPending) {
    return (
      <Tela titulo="Preparar viagem" modal>
        <EstadoCarregando rotulo="Carregando a família" />
      </Tela>
    );
  }
  if (members.error) {
    return (
      <Tela titulo="Preparar viagem" modal>
        <EstadoErro
          mensagem={members.error.message}
          onTentarDeNovo={() => void members.refetch()}
        />
      </Tela>
    );
  }
  if (!selected) {
    return (
      <Tela titulo="Preparar viagem" modal>
        <EstadoVazio
          titulo="Escolha uma pessoa"
          descricao="O roteiro de viagem usa o histórico de vacinas de uma pessoa. Volte e escolha alguém da família."
        />
        <Botao titulo="Voltar" variante="secundario" onPress={() => router.back()} />
      </Tela>
    );
  }

  const primeiroNome = selected.name.split(' ')[0] ?? selected.name;
  const checklist =
    montado && doses.data
      ? buildTravelChecklist({
          destination: destino,
          departure: partida,
          today: hoje,
          doses: doses.data.items,
        })
      : null;

  return (
    <Tela
      titulo="Preparar viagem"
      subtitulo={`Um roteiro para ${primeiroNome} se preparar com antecedência.`}
      modal
    >
      <GrupoDeRadios
        rotulo="Para onde é a viagem?"
        valor={destino}
        opcoes={[
          { valor: 'BRAZIL', rotulo: 'Dentro do Brasil' },
          { valor: 'ABROAD', rotulo: 'Para o exterior' },
        ]}
        aoEscolher={(valor) => {
          setDestino(valor);
          setMontado(false);
        }}
      />
      <View className="gap-xs">
        <Texto variante="rotulo">{`Data da partida: ${formatCivilDate(partida)}`}</Texto>
        <SeletorDeData
          rotulo="Data da partida"
          valor={partida}
          minimo={hoje}
          aoEscolher={(data) => {
            setPartida(data);
            setMontado(false);
          }}
        />
      </View>
      {doses.isPending ? <EstadoCarregando rotulo="Carregando o histórico" /> : null}
      {doses.error ? (
        <EstadoErro mensagem={doses.error.message} onTentarDeNovo={() => void doses.refetch()} />
      ) : null}
      <Botao titulo="Ver o roteiro" carregando={doses.isPending} onPress={() => setMontado(true)} />

      {checklist ? (
        <View className="gap-lg">
          <Texto variante="titulo2" accessibilityRole="header">
            {`Roteiro para ${formatCivilDate(checklist.departure)}`}
          </Texto>
          {checklist.items.map((item) => (
            <ItemDoRoteiro key={item.id} item={item} />
          ))}
          <View className="gap-sm rounded-[16px] border-fina border-bordaSuave bg-superficieSuave p-lg">
            <Texto variante="apoio" className="text-textoSecundario" accessibilityRole="text">
              {`Fonte: ${checklist.source.name}, ${checklist.source.publisher}, lida em ${formatCivilDate(checklist.source.retrievedAt)}. ${checklist.notice}`}
            </Texto>
            <Botao
              titulo="Abrir a fonte oficial"
              variante="secundario"
              onPress={() => void Linking.openURL(checklist.source.url)}
            />
          </View>
        </View>
      ) : null}
    </Tela>
  );
}
