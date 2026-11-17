import type { DoseResponse } from '@vacina/shared';
import { Modal, Pressable, View } from 'react-native';
import { Botao } from '../../components/botao';
import { Texto } from '../../components/texto';
import { todayCivil } from '../../lib/dates';
import { useEstiloDoTema } from '../../theme/theme-provider';
import { useDoseEvent } from '../data/hooks';
import { formatCivilDate } from './format-date';

/**
 * Confirmação da ação rápida "Aplicar" do cartão da dose atrasada, numa janela (modal) por cima da
 * tela: um véu escurece o fundo e fecha ao tocar fora, e voltar (Android) ou Esc (web) também
 * fecham. Registra a aplicação **com a data de hoje** (aplicar exige data menor ou igual a hoje) e
 * mostra essa data antes de gravar; quem tomou em outro dia escolhe "Trocar a data" e segue para o
 * detalhe da dose.
 *
 * @param props.dose - Dose que seria registrada.
 * @param props.aoFechar - Chamada ao registrar com sucesso ou ao voltar.
 * @param props.aoRegistrar - Chamada só quando a aplicação foi gravada (antes de fechar).
 * @param props.aoTrocarData - Chamada ao escolher outra data (abre o detalhe da dose).
 */
export function ConfirmarAplicacao({
  dose,
  aoFechar,
  aoTrocarData,
  aoRegistrar,
}: {
  dose: DoseResponse;
  aoFechar: () => void;
  aoTrocarData: () => void;
  aoRegistrar?: () => void;
}) {
  const mutation = useDoseEvent(dose.id, aoRegistrar);
  const hoje = todayCivil();
  const estiloDoTema = useEstiloDoTema();
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={aoFechar}
    >
      {/* O Modal fica fora da árvore do tema: as variáveis de cor precisam ir junto. */}
      <View style={[{ flex: 1 }, estiloDoTema]} className="items-center justify-center p-lg">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar a confirmação"
          onPress={aoFechar}
          className="absolute inset-0 bg-black/50"
        />
        <View
          role="dialog"
          aria-modal
          aria-label="Registrar aplicação"
          accessibilityViewIsModal
          className="w-full max-w-[460px] gap-md rounded-cartao border-padrao border-primaria bg-superficie p-lg"
        >
          <Texto variante="titulo2">{`Registrar a aplicação de ${dose.vaccine}, ${dose.doseLabel}?`}</Texto>
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
      </View>
    </Modal>
  );
}
