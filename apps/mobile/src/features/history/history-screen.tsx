import type { CivilDate, DoseResponse, MemberResponse } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { AvisoFonte } from '../../components/aviso-fonte';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { QuadroEstado } from '../../components/quadro-estado';
import { SeloEstadoDose } from '../../components/selo-estado-dose';
import { SeloOrigem } from '../../components/selo-origem';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { modoDeLayout } from '../../lib/layout';
import { useVisual } from '../../theme/theme-provider';
import { useDosesOfMembers, useMembers } from '../data/hooks';
import { formatCivilDate } from '../doses/format-date';

/** Uma linha do histórico: a dose, de quem é e a data que a coloca no ano. */
export interface LinhaDoHistorico {
  readonly dose: DoseResponse;
  readonly pessoa: string;
  /** Data da aplicação; para a dose cancelada, a data em que estava prevista. */
  readonly data: CivilDate;
}

/** As linhas de um ano, da data mais recente para a mais antiga. */
export interface AnoDoHistorico {
  readonly ano: string;
  readonly linhas: readonly LinhaDoHistorico[];
}

/**
 * Monta o histórico da família: só doses aplicadas e canceladas, agrupadas por ano (o mais recente
 * primeiro). A dose aplicada vale pelo dia em que foi tomada; a cancelada, pelo dia em que estava
 * prevista, porque o cancelamento não guarda data.
 *
 * @param pessoas - Membros da família.
 * @param dosesDasPessoas - Doses de cada membro, na mesma ordem (`undefined` enquanto carrega).
 */
export function agruparHistorico(
  pessoas: readonly Pick<MemberResponse, 'name'>[],
  dosesDasPessoas: readonly (readonly DoseResponse[] | undefined)[],
): AnoDoHistorico[] {
  const linhas: LinhaDoHistorico[] = pessoas.flatMap((pessoa, indice) =>
    (dosesDasPessoas[indice] ?? []).flatMap((dose): LinhaDoHistorico[] => {
      if (dose.status === 'APPLIED' && dose.appliedDate) {
        return [{ dose, pessoa: pessoa.name, data: dose.appliedDate }];
      }
      if (dose.status === 'CANCELLED') return [{ dose, pessoa: pessoa.name, data: dose.dueDate }];
      return [];
    }),
  );
  linhas.sort(
    (a, b) => b.data.localeCompare(a.data) || a.dose.vaccine.localeCompare(b.dose.vaccine),
  );
  const anos = new Map<string, LinhaDoHistorico[]>();
  for (const linha of linhas) {
    const ano = linha.data.slice(0, 4);
    anos.set(ano, [...(anos.get(ano) ?? []), linha]);
  }
  return [...anos].map(([ano, lista]) => ({ ano, linhas: lista }));
}

function textoDaData({ dose, data }: LinhaDoHistorico): string {
  const formatada = formatCivilDate(data);
  return dose.status === 'CANCELLED' ? `prevista para ${formatada}` : formatada;
}

/** Linha como cartão (celular e tablet): quadro com o ícone do estado, vacina, "Pessoa, data" e selos. */
function CartaoDoHistorico({ linha, aoAbrir }: { linha: LinhaDoHistorico; aoAbrir: () => void }) {
  const { dose, pessoa } = linha;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dose.vaccine}, ${dose.doseLabel}, ${pessoa}. Abrir detalhes`}
      onPress={aoAbrir}
    >
      <Cartao className="flex-row items-start gap-lg">
        <QuadroEstado status={dose.status} />
        <View className="flex-1 gap-sm">
          <Texto
            variante="titulo3"
            importantForAccessibility="no"
          >{`${dose.vaccine}, ${dose.doseLabel}`}</Texto>
          <Texto variante="apoio" className="text-textoSecundario" importantForAccessibility="no">
            {`${pessoa}, ${textoDaData(linha)}`}
          </Texto>
          <View className="flex-row flex-wrap gap-sm">
            <SeloEstadoDose status={dose.status} />
            <SeloOrigem origem={dose.origin} />
          </View>
        </View>
      </Cartao>
    </Pressable>
  );
}

const COLUNAS = ['Vacina', 'Pessoa', 'Data', 'Estado'] as const;

/** Linha como tabela (computador): Vacina, Pessoa, Data e Estado, como no design. */
function TabelaDoHistorico({
  linhas,
  aoAbrir,
}: {
  linhas: readonly LinhaDoHistorico[];
  aoAbrir: (dose: DoseResponse) => void;
}) {
  const { altoContraste, sombra } = useVisual();
  const fio = altoContraste ? 'border-altoContraste border-borda' : 'border-fina border-bordaSuave';
  return (
    <View
      role="table"
      style={sombra(1)}
      className={`overflow-hidden rounded-cartao bg-superficie ${fio}`}
    >
      <View role="row" className="flex-row bg-superficieSuave">
        {COLUNAS.map((coluna) => (
          <View key={coluna} role="columnheader" className="flex-1 px-lg py-md">
            <Texto variante="rotulo" className="text-textoSecundario">
              {coluna}
            </Texto>
          </View>
        ))}
      </View>
      {linhas.map((linha) => (
        <Pressable
          key={linha.dose.id}
          role="row"
          accessibilityLabel={`${linha.dose.vaccine}, ${linha.dose.doseLabel}, ${linha.pessoa}. Abrir detalhes`}
          onPress={() => aoAbrir(linha.dose)}
          className={`flex-row items-center hover:bg-superficieSuave ${
            altoContraste
              ? 'border-t-altoContraste border-borda'
              : 'border-t-fina border-bordaSuave'
          }`}
        >
          <View role="cell" className="flex-1 px-lg py-md">
            <Texto variante="corpoNegrito">{`${linha.dose.vaccine}, ${linha.dose.doseLabel}`}</Texto>
          </View>
          <View role="cell" className="flex-1 px-lg py-md">
            <Texto>{linha.pessoa}</Texto>
          </View>
          <View role="cell" className="flex-1 px-lg py-md">
            <Texto>{textoDaData(linha)}</Texto>
          </View>
          <View role="cell" className="flex-1 gap-sm px-lg py-md">
            <SeloEstadoDose status={linha.dose.status} />
            <SeloOrigem origem={linha.dose.origin} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Aba "Histórico" (RF08): tudo o que já foi aplicado ou cancelado na família inteira, agrupado por
 * ano. No computador vira uma tabela (Vacina, Pessoa, Data e Estado); no celular, cartões.
 */
export function HistoryScreen() {
  const router = useRouter();
  const largura = useWindowDimensions().width;
  const members = useMembers();
  const pessoas = members.data?.items ?? [];
  const doses = useDosesOfMembers(pessoas.map((pessoa) => pessoa.id));

  if (members.isPending) {
    return (
      <Tela reservaBalao titulo="Histórico">
        <EstadoCarregando rotulo="Carregando a família" />
      </Tela>
    );
  }
  if (members.error) {
    return (
      <Tela reservaBalao titulo="Histórico">
        <EstadoErro
          mensagem={members.error.message}
          onTentarDeNovo={() => void members.refetch()}
        />
      </Tela>
    );
  }
  if (pessoas.length === 0) {
    return (
      <Tela reservaBalao titulo="Histórico">
        <EstadoVazio
          titulo="Nenhuma pessoa cadastrada"
          descricao="Adicione alguém da família para registrar e consultar as vacinas tomadas."
        />
        <Botao titulo="Adicionar pessoa" onPress={() => router.push('/membro/novo')} />
      </Tela>
    );
  }

  const carregando = doses.some((consulta) => consulta.isPending);
  const falha = doses.find((consulta) => consulta.error);
  const anos = agruparHistorico(
    pessoas,
    doses.map((consulta) => consulta.data?.items),
  );
  const fonte = doses.find((consulta) => consulta.data)?.data?.source;
  const abrir = (dose: DoseResponse) =>
    router.push({ pathname: '/dose/[id]', params: { id: dose.id } });
  const tabela = modoDeLayout(largura) === 'expandido';

  return (
    <Tela reservaBalao titulo="Histórico">
      {carregando && <EstadoCarregando rotulo="Carregando o histórico" />}
      {falha?.error && (
        <EstadoErro
          mensagem={falha.error.message}
          onTentarDeNovo={() => doses.forEach((consulta) => void consulta.refetch())}
        />
      )}
      {!carregando && !falha && anos.length === 0 && (
        <EstadoVazio
          titulo="Nenhuma dose registrada ainda"
          descricao="Quando você registrar uma vacina como aplicada, ela aparece aqui."
        />
      )}
      {anos.map(({ ano, linhas }) => (
        <View key={ano} className="gap-lg">
          <Texto variante="titulo2" accessibilityRole="header">
            {ano}
          </Texto>
          {tabela ? (
            <TabelaDoHistorico linhas={linhas} aoAbrir={abrir} />
          ) : (
            <View className="gap-lg">
              {linhas.map((linha) => (
                <CartaoDoHistorico
                  key={linha.dose.id}
                  linha={linha}
                  aoAbrir={() => abrir(linha.dose)}
                />
              ))}
            </View>
          )}
        </View>
      ))}
      {fonte && <AvisoFonte fonte={fonte} />}
    </Tela>
  );
}
