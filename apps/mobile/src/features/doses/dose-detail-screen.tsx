import type { CivilDate, DoseEventInput, DoseResponse } from '@vacina/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { EstadoCarregando, EstadoErro } from '../../components/estados';
import { SeletorDeData } from '../../components/seletor-de-data';
import { SeloEstadoDose } from '../../components/selo-estado-dose';
import { SeloOrigem } from '../../components/selo-origem';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { todayCivil } from '../../lib/dates';
import { useDose, useDoseEvent, useMemberDoses, useMembers } from '../data/hooks';
import { doseDateRow, doseHint } from './dose-card';
import { formatCivilDate } from './format-date';
import { descreverAviso, descreverRepeticao } from './repeticao';
import { SobreAVacina } from './sobre-a-vacina';

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

/**
 * Numa dose já aplicada ou cancelada de uma série que se repete, diz quando é a próxima dose (a
 * API a cria sozinha) ou que a série terminou. Só aparece quando a lista da pessoa já carregou.
 */
function ProximaDaSerie({ dose }: { dose: DoseResponse }) {
  const procura = dose.recurrence && dose.occurrence ? dose.memberId : null;
  const doses = useMemberDoses(procura);
  if (!dose.recurrence || !dose.occurrence || !doses.isSuccess) return null;
  // Dose avulsa se reconhece pelo nome e pela dose digitados; dose oficial, pela linha do calendário.
  const proxima = doses.data.items.find(
    (outra) =>
      outra.occurrence === (dose.occurrence ?? 0) + 1 &&
      (dose.origin === 'CUSTOM'
        ? outra.origin === 'CUSTOM' &&
          outra.vaccine === dose.vaccine &&
          outra.doseLabel === dose.doseLabel
        : outra.ruleId === dose.ruleId),
  );
  return (
    <Cartao className="gap-xs">
      <Texto variante="rotulo" className="text-textoSecundario">
        Próxima dose da série
      </Texto>
      <Texto variante="corpoNegrito" accessibilityLiveRegion="polite">
        {proxima
          ? `Prevista para ${formatCivilDate(proxima.dueDate)}`
          : 'Esta foi a última dose da série.'}
      </Texto>
    </Cartao>
  );
}

function DoseActions({ dose }: { dose: DoseResponse }) {
  const mutation = useDoseEvent(dose.id);
  const [acao, setAcao] = useState<Acao | null>(null);
  const [data, setData] = useState<CivilDate>(() => todayCivil());
  const acoes = acoesDoEstado(dose.status);

  if (!acoes) {
    return (
      <View className="gap-md">
        <Texto className="text-textoSecundario">
          {dose.status === 'APPLIED'
            ? 'Esta dose já foi aplicada. Ela aparece no Histórico.'
            : 'Esta dose foi cancelada e não precisa mais ser tomada.'}
        </Texto>
        <ProximaDaSerie dose={dose} />
      </View>
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
    const repete = Boolean(dose.recurrence);
    return (
      <Cartao className="gap-md border-erro">
        <Texto variante="corpoNegrito">Cancelar esta dose?</Texto>
        <Texto>
          {repete
            ? 'Esta vacina se repete. Você pode pular só esta dose, e a próxima continua sendo criada, ou parar a repetição de vez.'
            : 'Ela deixa de aparecer como necessária. Cancele só se um profissional de saúde orientou.'}
        </Texto>
        {erro}
        {repete ? (
          <>
            <Botao
              titulo="Cancelar só esta dose"
              variante="perigo"
              carregando={mutation.isPending}
              onPress={() => enviar({ type: 'CANCEL', confirmed: true, scope: 'THIS' })}
            />
            <Botao
              titulo="Cancelar e parar de repetir"
              variante="perigo"
              carregando={mutation.isPending}
              onPress={() => enviar({ type: 'CANCEL', confirmed: true, scope: 'SERIES' })}
            />
          </>
        ) : (
          <Botao
            titulo="Sim, cancelar a dose"
            variante="perigo"
            carregando={mutation.isPending}
            onPress={() => enviar({ type: 'CANCEL', confirmed: true })}
          />
        )}
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
          carregando={mutation.isPending}
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
          carregando={mutation.isPending}
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
  const { data: dose, error, isPending, refetch } = useDose(id);
  const members = useMembers();

  if (isPending) {
    return (
      <Tela titulo="Dose" modal>
        <EstadoCarregando rotulo="Carregando a dose" />
      </Tela>
    );
  }
  if (error || !dose) {
    return (
      <Tela titulo="Dose" modal>
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
    <Tela titulo={`${dose.vaccine}, ${dose.doseLabel}`} modal>
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
        {dose.recurrence ? (
          <>
            <Linha rotulo="Se repete" valor={descreverRepeticao(dose.recurrence)} />
            {dose.occurrence ? (
              <Linha rotulo="Esta é a" valor={`${dose.occurrence}ª dose da série`} />
            ) : null}
          </>
        ) : null}
        {dose.remindDaysBefore !== null && dose.remindDaysBefore !== undefined ? (
          <Linha rotulo="Aviso" valor={descreverAviso(dose.remindDaysBefore)} />
        ) : null}
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

      {dose.origin === 'OFFICIAL' ? <SobreAVacina vacina={dose.vaccine} /> : null}

      <DoseActions key={dose.status} dose={dose} />
      <Texto variante="apoio" className="text-textoSecundario">
        O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.
      </Texto>
    </Tela>
  );
}
