import type { CivilDate, DoseEventInput, DoseResponse } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { EstadoCarregando, EstadoErro } from '../../components/estados';
import { LinkTexto } from '../../components/link-texto';
import { SeletorDeData } from '../../components/seletor-de-data';
import { SeloEstadoDose } from '../../components/selo-estado-dose';
import { SeloOrigem } from '../../components/selo-origem';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { todayCivil } from '../../lib/dates';
import { useDose, useDoseEvent, useMembers } from '../data/hooks';
import { doseDateRow, doseHint } from './dose-card';
import { formatCivilDate } from './format-date';

/** O que a pessoa está fazendo agora na tela: escolhendo a data de uma ação ou confirmando o cancelamento. */
type Acao = 'APPLY' | 'SCHEDULE' | 'CANCEL';

/** Ações disponíveis em cada estado, conforme o ciclo de vida da dose (RF04). */
function acoesDoEstado(status: DoseResponse['status']) {
  switch (status) {
    case 'PENDING':
      return { agendar: 'Agendar', desmarcar: false, aplicar: true, cancelar: true } as const;
    case 'SCHEDULED':
      return { agendar: null, desmarcar: true, aplicar: true, cancelar: true } as const;
    case 'OVERDUE':
      return { agendar: 'Reagendar', desmarcar: false, aplicar: true, cancelar: true } as const;
    case 'APPLIED':
    case 'CANCELLED':
      return null;
  }
}

/** Texto de cada painel de data: pergunta, limite da data e rótulo do botão de confirmar. */
const PAINEL = {
  APPLY: { pergunta: 'Em que dia foi aplicada?', confirmar: 'Confirmar aplicação' },
  SCHEDULE: { pergunta: 'Para que dia?', confirmar: 'Confirmar agendamento' },
} as const;

function DoseActions({ dose }: { dose: DoseResponse }) {
  const mutation = useDoseEvent(dose.id);
  const [acao, setAcao] = useState<Acao | null>(null);
  const [data, setData] = useState<CivilDate>(() => todayCivil());
  const acoes = acoesDoEstado(dose.status);

  if (!acoes) {
    return (
      <Texto className="text-textoSecundario">
        {dose.status === 'APPLIED'
          ? 'Esta dose já foi aplicada. Ela aparece no Histórico.'
          : 'Esta dose foi cancelada e não precisa mais ser tomada.'}
      </Texto>
    );
  }

  function enviar(evento: DoseEventInput) {
    mutation.mutate(evento, { onSuccess: () => setAcao(null) });
  }
  function escolher(nova: Acao) {
    mutation.reset();
    setData(todayCivil());
    setAcao(nova);
  }
  const erro = mutation.error ? (
    <Texto className="text-erro" accessibilityRole="alert">
      {mutation.error.message}
    </Texto>
  ) : null;

  if (acao === 'CANCEL') {
    return (
      <Cartao className="gap-md border-erro">
        <Texto variante="corpoNegrito">Cancelar esta dose?</Texto>
        <Texto>
          Ela deixa de aparecer como necessária. Cancele só se um profissional de saúde orientou.
        </Texto>
        {erro}
        <Botao
          titulo="Sim, cancelar a dose"
          variante="perigo"
          disabled={mutation.isPending}
          onPress={() => enviar({ type: 'CANCEL', confirmed: true })}
        />
        <Botao titulo="Não, voltar" variante="secundario" onPress={() => setAcao(null)} />
      </Cartao>
    );
  }

  if (acao === 'APPLY' || acao === 'SCHEDULE') {
    const hoje = todayCivil();
    const textos = PAINEL[acao];
    const tipo = acao === 'APPLY' ? 'APPLY' : dose.status === 'OVERDUE' ? 'RESCHEDULE' : 'SCHEDULE';
    return (
      <Cartao className="gap-md">
        <Texto variante="corpoNegrito">{textos.pergunta}</Texto>
        <SeletorDeData
          rotulo={textos.pergunta}
          valor={data}
          aoEscolher={setData}
          {...(acao === 'APPLY' ? { maximo: hoje } : { minimo: hoje })}
        />
        <Texto accessibilityLiveRegion="polite">{`Data escolhida: ${formatCivilDate(data)}`}</Texto>
        {erro}
        <Botao
          titulo={textos.confirmar}
          disabled={mutation.isPending}
          onPress={() => enviar({ type: tipo, date: data })}
        />
        <Botao titulo="Voltar" variante="secundario" onPress={() => setAcao(null)} />
      </Cartao>
    );
  }

  return (
    <View className="gap-md">
      {erro}
      {acoes.agendar ? <Botao titulo={acoes.agendar} onPress={() => escolher('SCHEDULE')} /> : null}
      {acoes.desmarcar ? (
        <Botao
          titulo="Desmarcar o agendamento"
          variante="secundario"
          disabled={mutation.isPending}
          onPress={() => enviar({ type: 'UNSCHEDULE' })}
        />
      ) : null}
      <Botao
        titulo="Registrar aplicação"
        variante={acoes.agendar ? 'secundario' : 'principal'}
        onPress={() => escolher('APPLY')}
      />
      <Botao titulo="Cancelar dose" variante="perigo" onPress={() => escolher('CANCEL')} />
    </View>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View className="gap-xs">
      <Texto variante="rotulo" className="text-textoSecundario">
        {rotulo}
      </Texto>
      <Texto variante="corpoNegrito">{valor}</Texto>
    </View>
  );
}

/**
 * Detalhe de uma dose (RF04): para quem é, a data que importa, quando é indicada, o que evita, as
 * notas oficiais e as ações permitidas no estado atual (agendar ou reagendar, registrar a
 * aplicação, desmarcar e cancelar). As datas se escolhem em um calendário e o cancelamento sempre
 * pede confirmação.
 *
 * @param props.id - Identificador da dose.
 */
export function DoseDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const { data: dose, error, isPending, refetch } = useDose(id);
  const members = useMembers();

  if (isPending) {
    return (
      <Tela titulo="Dose" voltar>
        <EstadoCarregando rotulo="Carregando a dose" />
      </Tela>
    );
  }
  if (error || !dose) {
    return (
      <Tela titulo="Dose" voltar>
        <EstadoErro
          mensagem={error?.message ?? 'Não encontramos esta dose.'}
          onTentarDeNovo={() => void refetch()}
        />
      </Tela>
    );
  }

  const paraQuem = members.data?.items.find((pessoa) => pessoa.id === dose.memberId)?.name;
  const linhaDeData = doseDateRow(dose);

  return (
    <Tela titulo={`${dose.vaccine}, ${dose.doseLabel}`}>
      <LinkTexto
        titulo="Voltar para Doses"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <View className="flex-row flex-wrap gap-sm">
        <SeloEstadoDose status={dose.status} />
        <SeloOrigem origem={dose.origin} />
      </View>
      <Cartao className="gap-md">
        {paraQuem ? <Linha rotulo="Para quem" valor={paraQuem} /> : null}
        {linhaDeData ? (
          <Linha rotulo={linhaDeData.rotulo} valor={linhaDeData.valor} />
        ) : (
          <Linha rotulo="Data" valor={doseHint(dose)} />
        )}
        {dose.origin === 'CUSTOM' ? (
          <Texto className="text-textoSecundario">
            Você adicionou esta dose. Ela não faz parte do calendário oficial; siga a orientação do
            profissional que a indicou.
          </Texto>
        ) : (
          <>
            <Linha rotulo="Quando é indicada" valor={dose.timingLabel} />
            <Linha rotulo="Protege contra" valor={dose.diseases} />
          </>
        )}
        {dose.conditional ? (
          <Texto className="text-textoSecundario">
            Esta vacina só é indicada em algumas situações. Leia as notas abaixo e converse com um
            profissional de saúde.
          </Texto>
        ) : null}
      </Cartao>

      {dose.notes.length > 0 ? (
        <View className="gap-sm">
          <Texto variante="titulo3" accessibilityRole="header">
            Notas do calendário oficial
          </Texto>
          {dose.notes.map((nota) => (
            <Texto key={nota} variante="apoio" className="text-textoSecundario">
              {nota}
            </Texto>
          ))}
        </View>
      ) : null}

      <DoseActions key={dose.status} dose={dose} />
      <Texto variante="apoio" className="text-textoSecundario">
        O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.
      </Texto>
    </Tela>
  );
}
