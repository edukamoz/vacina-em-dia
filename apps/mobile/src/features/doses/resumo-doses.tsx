import { addDays, compareCivilDates, REMINDER_LEAD_DAYS, type DoseResponse } from '@vacina/shared';
import { View } from 'react-native';
import { AnelProgresso } from '../../components/anel-progresso';
import { BlocoResumo } from '../../components/bloco-resumo';
import { Icone, type NomeDoIcone } from '../../components/icone';
import { Texto } from '../../components/texto';
import { useThemeColors } from '../../theme/theme-provider';

/** Números do cartão de resumo de uma pessoa. */
export interface ContagemDeDoses {
  readonly aplicadas: number;
  readonly total: number;
  readonly atrasadas: number;
  readonly emSeteDias: number;
}

/**
 * Conta as doses de uma pessoa para o resumo: aplicadas, total (sem as canceladas), atrasadas e as
 * agendadas para os próximos 7 dias (inclui hoje).
 *
 * @param doses - Doses da pessoa.
 * @param hoje - Data de hoje (`AAAA-MM-DD`).
 */
export function contarDoses(doses: readonly DoseResponse[], hoje: string): ContagemDeDoses {
  const limite = addDays(hoje, REMINDER_LEAD_DAYS);
  const ativas = doses.filter((dose) => dose.status !== 'CANCELLED');
  return {
    aplicadas: ativas.filter((dose) => dose.status === 'APPLIED').length,
    total: ativas.length,
    atrasadas: ativas.filter((dose) => dose.status === 'OVERDUE').length,
    emSeteDias: ativas.filter(
      (dose) =>
        dose.status === 'SCHEDULED' &&
        dose.scheduledDate !== null &&
        compareCivilDates(dose.scheduledDate, hoje) >= 0 &&
        compareCivilDates(dose.scheduledDate, limite) <= 0,
    ).length,
  };
}

function Contador({
  icone,
  numero,
  rotulo,
  cor,
  fundo,
}: {
  icone: NomeDoIcone;
  numero: number;
  rotulo: string;
  cor: string;
  fundo: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${numero} ${rotulo.toLowerCase()}`}
      className="min-w-[150px] flex-1 flex-row items-center gap-md rounded-[16px] border-padrao p-md"
      style={{ borderColor: cor, backgroundColor: fundo }}
    >
      <Icone nome={icone} cor={cor} tamanho={28} />
      <Texto variante="titulo2" style={{ color: cor }} importantForAccessibility="no">
        {String(numero)}
      </Texto>
      <Texto
        variante="rotulo"
        className="flex-1"
        style={{ color: cor }}
        importantForAccessibility="no"
      >
        {rotulo}
      </Texto>
    </View>
  );
}

/**
 * Frase principal do resumo: o que a pessoa precisa resolver agora. Sem doses atrasadas, diz que
 * está tudo em dia (ou que não há doses, quando a lista está vazia).
 *
 * @param contagem - Números calculados por {@link contarDoses}.
 */
export function frasePrincipalDoResumo(contagem: ContagemDeDoses): string {
  if (contagem.atrasadas === 1) return '1 dose para resolver';
  if (contagem.atrasadas > 1) return `${contagem.atrasadas} doses para resolver`;
  return contagem.total === 0 ? 'Nenhuma dose por enquanto' : 'Nada atrasado por aqui';
}

/**
 * Bloco de resumo da pessoa na aba Doses (ADR-036): o que resolver agora, o anel de doses
 * aplicadas sobre o fundo da marca, a frase que diz o mesmo em texto e dois contadores (atrasadas e
 * as de até 7 dias). Os contadores têm cor, ícone e número, não só cor.
 *
 * @param props.nome - Primeiro nome da pessoa.
 * @param props.contagem - Números calculados por {@link contarDoses}.
 */
export function ResumoDoses({ nome, contagem }: { nome: string; contagem: ContagemDeDoses }) {
  const cores = useThemeColors();
  return (
    <BlocoResumo
      legenda={`Calendário de ${nome}`}
      titulo={frasePrincipalDoResumo(contagem)}
      aoLado={<AnelProgresso aplicadas={contagem.aplicadas} total={contagem.total} sobreMarca />}
    >
      <View className="gap-md">
        <Texto variante="apoio" className="text-sobrePrimaria">
          {`${contagem.aplicadas} de ${contagem.total} doses de ${nome} já foram aplicadas.`}
        </Texto>
        <View className="flex-row flex-wrap gap-md">
          <Contador
            icone="atrasada"
            numero={contagem.atrasadas}
            rotulo={contagem.atrasadas === 1 ? 'Atrasada' : 'Atrasadas'}
            cor={cores.atrasada}
            fundo={cores.atrasadaSuave}
          />
          <Contador
            icone="lembrete"
            numero={contagem.emSeteDias}
            rotulo="Em até 7 dias"
            cor={cores.agendada}
            fundo={cores.agendadaSuave}
          />
        </View>
      </View>
    </BlocoResumo>
  );
}
