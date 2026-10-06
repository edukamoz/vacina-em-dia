import type { DoseEventInput, DoseResponse } from '@vacina/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { Botao } from '../../components/botao';
import { CampoTexto } from '../../components/campo-texto';
import { Cartao } from '../../components/cartao';
import { EstadoCarregando, EstadoErro } from '../../components/estados';
import { SeloEstadoDose } from '../../components/selo-estado-dose';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { maskBrDate, parseBrDate, todayCivil } from '../../lib/dates';
import { useDose, useDoseEvent } from '../data/hooks';
import { doseHint } from './dose-card';
import { formatCivilDate } from './format-date';

/** Ações disponíveis em cada estado, conforme o ciclo de vida da dose (RF04). */
function acoesDoEstado(status: DoseResponse['status']) {
  switch (status) {
    case 'PENDING':
      return { agendar: 'Agendar', desmarcar: false, cancelar: true } as const;
    case 'SCHEDULED':
      return { agendar: null, desmarcar: true, cancelar: true } as const;
    case 'OVERDUE':
      return { agendar: 'Reagendar', desmarcar: false, cancelar: true } as const;
    case 'APPLIED':
    case 'CANCELLED':
      return null;
  }
}

function DoseActions({ dose }: { dose: DoseResponse }) {
  const mutation = useDoseEvent(dose.id);
  const [data, setData] = useState(() => formatCivilDate(todayCivil()));
  const [confirmando, setConfirmando] = useState(false);
  const [tentou, setTentou] = useState(false);
  const acoes = acoesDoEstado(dose.status);
  const date = parseBrDate(data);

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
    mutation.mutate(evento, { onSuccess: () => setConfirmando(false) });
  }
  function comData(tipo: 'APPLY' | 'SCHEDULE' | 'RESCHEDULE') {
    setTentou(true);
    if (date) enviar({ type: tipo, date });
  }

  return (
    <View className="gap-md">
      <CampoTexto
        rotulo="Data"
        value={data}
        onChangeText={(texto) => setData(maskBrDate(texto))}
        keyboardType="number-pad"
        placeholder="DD/MM/AAAA"
        maxLength={10}
        ajuda="Para registrar a aplicação, use o dia em que tomou. Para agendar, o dia marcado."
        erro={tentou && !date ? 'Digite a data completa, por exemplo 06/10/2026.' : undefined}
      />
      {mutation.error ? (
        <Texto className="text-erro" accessibilityRole="alert">
          {mutation.error.message}
        </Texto>
      ) : null}

      <Botao
        titulo="Registrar que foi aplicada"
        disabled={mutation.isPending}
        onPress={() => comData('APPLY')}
      />
      {acoes.agendar ? (
        <Botao
          titulo={acoes.agendar}
          variante="secundario"
          disabled={mutation.isPending}
          onPress={() => comData(dose.status === 'OVERDUE' ? 'RESCHEDULE' : 'SCHEDULE')}
        />
      ) : null}
      {acoes.desmarcar ? (
        <Botao
          titulo="Desmarcar o agendamento"
          variante="secundario"
          disabled={mutation.isPending}
          onPress={() => enviar({ type: 'UNSCHEDULE' })}
        />
      ) : null}

      {acoes.cancelar && !confirmando ? (
        <Botao titulo="Cancelar esta dose" variante="perigo" onPress={() => setConfirmando(true)} />
      ) : null}
      {acoes.cancelar && confirmando ? (
        <Cartao className="gap-md border-erro">
          <Texto variante="corpoNegrito">Cancelar esta dose?</Texto>
          <Texto>
            Ela deixa de aparecer como necessária. Cancele só se um profissional de saúde orientou.
          </Texto>
          <Botao
            titulo="Sim, cancelar a dose"
            variante="perigo"
            disabled={mutation.isPending}
            onPress={() => enviar({ type: 'CANCEL', confirmed: true })}
          />
          <Botao titulo="Não, voltar" variante="secundario" onPress={() => setConfirmando(false)} />
        </Cartao>
      ) : null}
    </View>
  );
}

/**
 * Detalhe de uma dose (RF04): o que é, para que serve, quando é indicada, as notas oficiais e as
 * ações permitidas no estado atual (registrar aplicação, agendar, reagendar, desmarcar, cancelar).
 * O cancelamento sempre pede confirmação.
 *
 * @param props.id - Identificador da dose.
 */
export function DoseDetailScreen({ id }: { id: string }) {
  const { data: dose, error, isPending, refetch } = useDose(id);

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

  return (
    <Tela titulo={dose.vaccine} subtitulo={dose.doseLabel} voltar>
      <SeloEstadoDose status={dose.status} />
      <Cartao className="gap-md">
        <View className="gap-xs">
          <Texto variante="rotulo">Protege contra</Texto>
          <Texto>{dose.diseases}</Texto>
        </View>
        <View className="gap-xs">
          <Texto variante="rotulo">Quando</Texto>
          <Texto>{dose.timingLabel}</Texto>
          <Texto className="text-textoSecundario">{doseHint(dose)}</Texto>
        </View>
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
