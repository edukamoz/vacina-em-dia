import type { DoseResponse } from '@vacina/shared';
import { View } from 'react-native';
import { Botao } from '../../components/botao';
import { Texto } from '../../components/texto';
import { todayCivil } from '../../lib/dates';
import { useDoseEvent } from '../data/hooks';
import { formatCivilDate } from './format-date';

/**
 * Confirmação da ação rápida "Aplicar" do cartão da dose atrasada. Registra a aplicação **com a
 * data de hoje** (aplicar exige data menor ou igual a hoje) e mostra essa data antes de gravar;
 * quem tomou em outro dia escolhe "Trocar a data" e segue para o detalhe da dose.
 *
 * @param props.dose - Dose que seria registrada.
 * @param props.aoFechar - Chamada ao registrar com sucesso ou ao voltar.
 * @param props.aoTrocarData - Chamada ao escolher outra data (abre o detalhe da dose).
 */
export function ConfirmarAplicacao({
  dose,
  aoFechar,
  aoTrocarData,
}: {
  dose: DoseResponse;
  aoFechar: () => void;
  aoTrocarData: () => void;
}) {
  const mutation = useDoseEvent(dose.id);
  const hoje = todayCivil();
  return (
    <View
      accessibilityRole="alert"
      className="gap-md rounded-cartao border-padrao border-primaria bg-superficie p-lg"
    >
      <Texto variante="corpoNegrito">{`Registrar a aplicação de ${dose.vaccine}, ${dose.doseLabel}?`}</Texto>
      <Texto>{`A data registrada será hoje, ${formatCivilDate(hoje)}.`}</Texto>
      {mutation.error ? (
        <Texto className="text-erro" accessibilityRole="alert">
          {mutation.error.message}
        </Texto>
      ) : null}
      <Botao
        titulo="Sim, registrar hoje"
        carregando={mutation.isPending}
        onPress={() => mutation.mutate({ type: 'APPLY', date: hoje }, { onSuccess: aoFechar })}
      />
      <Botao titulo="Trocar a data" variante="secundario" onPress={aoTrocarData} />
      <Botao titulo="Voltar" variante="texto" onPress={aoFechar} />
    </View>
  );
}
