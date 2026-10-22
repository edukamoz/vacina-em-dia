import type { DoseResponse } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AvisoFonte } from '../../components/aviso-fonte';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { Icone, type NomeDoIcone } from '../../components/icone';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { todayCivil } from '../../lib/dates';
import {
  aplicadasPorMes,
  contarPorEstado,
  cobertura,
  ESTADOS_DO_GRAFICO,
  previstasPorMes,
  ROTULO_DO_ESTADO,
  totalDaContagem,
} from '../../lib/estatisticas';
import { useThemeColors } from '../../theme/theme-provider';
import { useDosesOfMembers, useMembers } from '../data/hooks';
import { BarrasPorMes, BarrasPorPessoa, Rosca, useCoresDosEstados } from './graficos';

/** Número grande com legenda, no alto do painel. */
function Indicador({
  icone,
  numero,
  rotulo,
  cor,
}: {
  icone: NomeDoIcone;
  numero: string;
  rotulo: string;
  cor: string;
}) {
  return (
    <Cartao
      accessible
      accessibilityLabel={`${rotulo}: ${numero}`}
      className="min-w-[150px] flex-1 flex-row items-center gap-md"
    >
      <View
        aria-hidden
        className="h-[44px] w-[44px] items-center justify-center rounded-[14px] border-padrao"
        style={{ borderColor: cor }}
      >
        <Icone nome={icone} cor={cor} />
      </View>
      <View className="flex-1">
        <Texto variante="titulo2" style={{ color: cor }} importantForAccessibility="no">
          {numero}
        </Texto>
        <Texto variante="apoio" className="text-textoSecundario" importantForAccessibility="no">
          {rotulo}
        </Texto>
      </View>
    </Cartao>
  );
}

/** Cartão com título e o conteúdo de um gráfico. */
function BlocoDoGrafico({
  titulo,
  apoio,
  children,
}: {
  titulo: string;
  apoio?: string;
  children: React.ReactNode;
}) {
  return (
    <Cartao className="gap-lg">
      <View className="gap-xs">
        <Texto variante="titulo3" accessibilityRole="header">
          {titulo}
        </Texto>
        {apoio ? (
          <Texto variante="apoio" className="text-textoSecundario">
            {apoio}
          </Texto>
        ) : null}
      </View>
      {children}
    </Cartao>
  );
}

/**
 * Painel de gráficos (B60): a situação das vacinas da família em gráficos. Mostra a cobertura
 * (percentual de doses aplicadas), a rosca de doses por estado, as barras por pessoa, as doses
 * aplicadas nos últimos 12 meses e as previstas nos próximos 6. Dá para olhar a família toda ou
 * uma pessoa só. Todos os números vêm das doses cadastradas, calculadas no aparelho; cada gráfico
 * tem um rótulo de texto para leitor de tela e há uma tabela com os mesmos números.
 */
export function PainelScreen({ hoje = todayCivil() }: { hoje?: string }) {
  const router = useRouter();
  const cores = useThemeColors();
  const corDoEstado = useCoresDosEstados();
  const members = useMembers();
  const pessoas = members.data?.items ?? [];
  const consultas = useDosesOfMembers(pessoas.map((pessoa) => pessoa.id));
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [tabela, setTabela] = useState(false);

  if (members.isPending) {
    return (
      <Tela voltar titulo="Painel de gráficos">
        <EstadoCarregando rotulo="Carregando a família" />
      </Tela>
    );
  }
  if (members.error) {
    return (
      <Tela voltar titulo="Painel de gráficos">
        <EstadoErro
          mensagem={members.error.message}
          onTentarDeNovo={() => void members.refetch()}
        />
      </Tela>
    );
  }
  if (pessoas.length === 0) {
    return (
      <Tela voltar titulo="Painel de gráficos">
        <EstadoVazio
          titulo="Nenhuma pessoa cadastrada"
          descricao="Adicione alguém da família para ver os gráficos das vacinas."
        />
        <Botao titulo="Adicionar pessoa" onPress={() => router.push('/membro/novo')} />
      </Tela>
    );
  }
  const carregando = consultas.some((consulta) => consulta.isPending);
  const falha = consultas.find((consulta) => consulta.error);
  if (carregando || falha) {
    return (
      <Tela voltar titulo="Painel de gráficos">
        {falha?.error ? (
          <EstadoErro
            mensagem={falha.error.message}
            onTentarDeNovo={() => consultas.forEach((consulta) => void consulta.refetch())}
          />
        ) : (
          <EstadoCarregando rotulo="Montando os gráficos" />
        )}
      </Tela>
    );
  }

  const dosesPorPessoa: DoseResponse[][] = consultas.map((consulta) => consulta.data?.items ?? []);
  const selecionadas = pessoas
    .map((pessoa, indice) => ({ pessoa, doses: dosesPorPessoa[indice] ?? [] }))
    .filter(({ pessoa }) => escolhida === null || pessoa.id === escolhida);
  const doses = selecionadas.flatMap((item) => item.doses);
  const contagem = contarPorEstado(doses);
  const total = totalDaContagem(contagem);
  const previstas = previstasPorMes(doses, hoje, 6);
  const fonte = consultas.find((consulta) => consulta.data)?.data?.source;
  const nomeDoEscopo = escolhida
    ? (pessoas.find((pessoa) => pessoa.id === escolhida)?.name ?? '')
    : 'a família';

  return (
    <Tela
      voltar
      titulo="Painel de gráficos"
      subtitulo={`A situação das vacinas de ${nomeDoEscopo}, em gráficos.`}
    >
      {pessoas.length > 1 ? (
        <View className="gap-sm">
          <Texto variante="rotulo">Mostrar</Texto>
          <View className="flex-row flex-wrap gap-sm">
            <Botao
              titulo="Toda a família"
              variante={escolhida === null ? 'principal' : 'secundario'}
              selecionado={escolhida === null}
              onPress={() => setEscolhida(null)}
            />
            {pessoas.map((pessoa) => (
              <Botao
                key={pessoa.id}
                titulo={pessoa.name}
                variante={escolhida === pessoa.id ? 'principal' : 'secundario'}
                selecionado={escolhida === pessoa.id}
                onPress={() => setEscolhida(pessoa.id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {total === 0 ? (
        <EstadoVazio
          titulo="Ainda não há doses para mostrar"
          descricao="Quando houver doses no calendário, os gráficos aparecem aqui."
        />
      ) : (
        <View className="gap-xl">
          <View className="flex-row flex-wrap gap-md">
            <Indicador
              icone="aplicada"
              numero={`${cobertura(contagem)}%`}
              rotulo="das doses já aplicadas"
              cor={corDoEstado.APPLIED}
            />
            <Indicador
              icone="atrasada"
              numero={String(contagem.OVERDUE)}
              rotulo={contagem.OVERDUE === 1 ? 'dose atrasada' : 'doses atrasadas'}
              cor={corDoEstado.OVERDUE}
            />
            <Indicador
              icone="agendada"
              numero={String(previstas.meses[0]?.total ?? 0)}
              rotulo="previstas neste mês"
              cor={corDoEstado.SCHEDULED}
            />
          </View>

          <View className="gap-lg expandido:flex-row expandido:items-stretch">
            <View className="expandido:flex-1">
              <BlocoDoGrafico
                titulo="Situação das doses"
                apoio="Toque num estado da lista para destacá-lo na rosca."
              >
                <Rosca contagem={contagem} />
              </BlocoDoGrafico>
            </View>
            {escolhida === null && pessoas.length > 1 ? (
              <View className="expandido:flex-1">
                <BlocoDoGrafico
                  titulo="Por pessoa"
                  apoio="Cada faixa mostra como as doses da pessoa se dividem por estado."
                >
                  <BarrasPorPessoa
                    linhas={selecionadas.map(({ pessoa, doses: lista }) => ({
                      nome: pessoa.name,
                      contagem: contarPorEstado(lista),
                    }))}
                  />
                </BlocoDoGrafico>
              </View>
            ) : null}
          </View>

          <BlocoDoGrafico
            titulo="Doses aplicadas nos últimos 12 meses"
            apoio="Quantas doses foram tomadas em cada mês."
          >
            <BarrasPorMes
              meses={aplicadasPorMes(doses, hoje, 12)}
              cor={corDoEstado.APPLIED}
              unidade="aplicadas"
              titulo="Gráfico de barras das doses aplicadas por mês, nos últimos 12 meses"
            />
          </BlocoDoGrafico>

          <BlocoDoGrafico
            titulo="Doses previstas nos próximos 6 meses"
            apoio="Doses agendadas ou com prazo em cada mês."
          >
            <BarrasPorMes
              meses={previstas.meses}
              cor={cores.agendada}
              unidade="previstas"
              titulo="Gráfico de barras das doses previstas por mês, nos próximos 6 meses"
            />
            <View className="gap-xs">
              {previstas.emAtraso > 0 ? (
                <Texto variante="apoio" className="text-erro">
                  {`${previstas.emAtraso} ${previstas.emAtraso === 1 ? 'dose está atrasada' : 'doses estão atrasadas'} e não entram nas barras.`}
                </Texto>
              ) : null}
              {previstas.semData > 0 ? (
                <Texto variante="apoio" className="text-textoSecundario">
                  {`${previstas.semData} ${previstas.semData === 1 ? 'dose não tem' : 'doses não têm'} data prevista (confira na caderneta).`}
                </Texto>
              ) : null}
              {previstas.depois > 0 ? (
                <Texto variante="apoio" className="text-textoSecundario">
                  {`${previstas.depois} ${previstas.depois === 1 ? 'dose é' : 'doses são'} para mais de 6 meses à frente.`}
                </Texto>
              ) : null}
            </View>
          </BlocoDoGrafico>

          <View className="gap-md">
            <View className="flex-row">
              <Botao
                titulo={tabela ? 'Esconder a tabela' : 'Ver os números em tabela'}
                variante="secundario"
                onPress={() => setTabela(!tabela)}
              />
            </View>
            {tabela ? (
              <Cartao className="gap-sm">
                <View className="flex-row gap-sm">
                  <Texto variante="rotulo" className="flex-[2]">
                    Pessoa
                  </Texto>
                  {ESTADOS_DO_GRAFICO.map((estado) => (
                    <Texto key={estado} variante="rotulo" className="flex-1 text-right">
                      {ROTULO_DO_ESTADO[estado]}
                    </Texto>
                  ))}
                </View>
                {selecionadas.map(({ pessoa, doses: lista }) => {
                  const c = contarPorEstado(lista);
                  return (
                    <View key={pessoa.id} className="flex-row gap-sm">
                      <Texto className="flex-[2]">{pessoa.name}</Texto>
                      {ESTADOS_DO_GRAFICO.map((estado) => (
                        <Texto key={estado} className="flex-1 text-right">
                          {String(c[estado])}
                        </Texto>
                      ))}
                    </View>
                  );
                })}
              </Cartao>
            ) : null}
          </View>
        </View>
      )}
      {fonte && <AvisoFonte fonte={fonte} />}
    </Tela>
  );
}
