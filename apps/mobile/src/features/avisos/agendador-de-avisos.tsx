import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { planejarAvisos } from '../../lib/avisos';
import {
  avisosSuportados,
  cancelarAvisos,
  lerPermissaoDeAvisos,
  prepararAvisos,
  reagendarAvisos,
  type PermissaoDeAvisos,
} from '../../lib/avisos-aparelho';
import { minutosDoDia, todayCivil } from '../../lib/dates';
import { useDosesOfMembers, useMembers } from '../data/hooks';
import { usePreferenciaDeAvisos } from './preferencia';

/**
 * Mantém os avisos do aparelho em dia (B70). Não desenha nada. Quando a pessoa ligou os avisos e o
 * sistema deixou, planeja os avisos das doses de toda a família e os agenda no próprio aparelho; a
 * cada mudança nas doses, no horário escolhido ou ao voltar ao aplicativo, troca os agendados pelos
 * novos. Ao sair da conta (a tela some), cancela tudo, para nada de uma conta aparecer em outra.
 *
 * Só atua em Android e iOS. O texto de cada aviso traz só quantidades.
 */
export function AgendadorDeAvisos() {
  const { preferencia, pronta } = usePreferenciaDeAvisos();
  const membros = useMembers();
  const ids = (membros.data?.items ?? []).map((pessoa) => pessoa.id);
  const consultas = useDosesOfMembers(ids);
  const [permissao, setPermissao] = useState<PermissaoDeAvisos | null>(null);
  const [rodada, setRodada] = useState(0);

  const doses = consultas.flatMap((consulta) => consulta.data?.items ?? []);
  const carregadas = membros.isSuccess && consultas.every((consulta) => consulta.isSuccess);
  const chave = JSON.stringify(
    doses.map((d) => [d.status, d.dueDate, d.scheduledDate, d.remindDaysBefore ?? null, d.remindDays ?? null]),
  );

  // Prepara o sistema uma vez e relê a permissão quando a pessoa liga ou desliga os avisos.
  useEffect(() => {
    if (!avisosSuportados()) return;
    void prepararAvisos();
  }, []);
  useEffect(() => {
    if (!avisosSuportados()) return;
    void lerPermissaoDeAvisos().then(setPermissao);
  }, [preferencia.ligado, rodada]);

  // Ao voltar ao aplicativo, o dia pode ter virado e a permissão pode ter mudado nas configurações.
  useEffect(() => {
    if (!avisosSuportados()) return;
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') setRodada((n) => n + 1);
    });
    return () => assinatura.remove();
  }, []);

  useEffect(() => {
    if (!avisosSuportados() || !pronta || permissao === null) return;
    if (!preferencia.ligado || permissao !== 'concedida') {
      void cancelarAvisos();
      return;
    }
    if (!carregadas) return;
    const agora = { hoje: todayCivil(), minutos: minutosDoDia() };
    void reagendarAvisos(planejarAvisos(doses, agora, preferencia.hora));
    // `doses` entra pela `chave`: só o que importa para os avisos refaz o agendamento.
  }, [pronta, permissao, preferencia.ligado, preferencia.hora, carregadas, chave, rodada]);

  useEffect(
    () => () => {
      void cancelarAvisos();
    },
    [],
  );

  return null;
}
